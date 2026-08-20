import { onRequest } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { recordLlmUsage } from '../llm/llmUsageRecorder';
import { LLM_PRICING } from '../llm/llmCost';
import { consumeRateLimitToken } from '../shared/rateLimit';
import * as admin from 'firebase-admin';

/**
 * Chat de Faculty en el SERVIDOR, con streaming.
 *
 * Es `onRequest` y no `onCall` por una razón concreta: los callables de esta
 * versión de firebase-functions sí soportan streaming, pero el SDK CLIENTE
 * (`firebase@10.14`) todavía no expone `.stream()` — llegó en la 11, y ese
 * upgrade toca auth, firestore y storage de toda la app. SSE sobre `fetch` no
 * depende del SDK, así que el chat conserva el streaming sin arrastrar ese
 * riesgo. El precio es verificar identidad a mano, acá abajo.
 *
 * QUÉ CIERRA: era la última superficie conversacional hablando con Gemini desde
 * el navegador con la clave pública. Ahora la clave vive solo en el servidor, el
 * gasto se mide por usuario y hay un tope por hora donde antes no había ninguno.
 */

const MAX_PROMPT_CHARS = 200_000;
const MAX_HISTORY_TURNS = 40;
const WINDOW_MS = 3_600_000;
const MAX_CALLS_PER_HOUR = 120;

interface StreamPayload {
    systemInstruction: string;
    history: Array<{ role: string; text: string }>;
    message: string;
    model?: string;
    visionModel?: string;
    generationConfig?: Record<string, unknown>;
    /** Stores de fileSearch del agente (camino legacy sin RAG explícito). */
    corpusIds?: string[];
    attachments?: Array<{ mimeType: string; data: string }>;
    /** Etiqueta para el panel de costos. */
    feature?: string;
}

export const facultyChatStream = onRequest(
    { cors: true, secrets: ['GEMINI_API_KEY'], timeoutSeconds: 300, memory: '512MiB' },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        // 1. Identidad. `onRequest` no la verifica solo — este bloque es el
        //    precio de conservar el streaming sin subir el SDK cliente.
        const authHeader = String(req.headers.authorization ?? '');
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!idToken) {
            res.status(401).json({ error: 'Missing Authorization bearer token' });
            return;
        }
        let uid: string;
        try {
            uid = (await getAuth().verifyIdToken(idToken)).uid;
        } catch {
            res.status(401).json({ error: 'Invalid ID token' });
            return;
        }

        // 2. App Check: misma barrera que los callables (`enforceAppCheck`), acá
        //    explícita. En el emulador se omite, igual que en el resto.
        const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
        if (!isEmulator) {
            const appCheckToken = String(req.headers['x-firebase-appcheck'] ?? '');
            try {
                await getAppCheck().verifyToken(appCheckToken);
            } catch {
                res.status(401).json({ error: 'Invalid App Check token' });
                return;
            }
        }

        // 3. Tope por usuario: antes el navegador hablaba directo con Google y no
        //    había dónde ponerlo.
        const allowed = await consumeRateLimitToken(admin.firestore(), {
            bucket: 'faculty_chat',
            key: uid,
            windowMs: WINDOW_MS,
            max: MAX_CALLS_PER_HOUR,
        });
        if (!allowed) {
            res.status(429).json({ error: 'Demasiadas consultas seguidas. Espera unos minutos.' });
            return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
            return;
        }

        const body = (req.body ?? {}) as StreamPayload;
        const message = String(body.message ?? '');
        if (!message.trim()) {
            res.status(400).json({ error: 'message is required' });
            return;
        }
        if (message.length > MAX_PROMPT_CHARS) {
            res.status(400).json({ error: `message excede ${MAX_PROMPT_CHARS} caracteres` });
            return;
        }

        const hasAttachments = Array.isArray(body.attachments) && body.attachments.length > 0;
        const model = String(
            (hasAttachments ? body.visionModel : body.model) ?? 'gemini-2.5-flash',
        );
        if (!(model in LLM_PRICING)) {
            res.status(400).json({ error: `Modelo no autorizado: ${model}` });
            return;
        }

        // SSE: cabeceras antes del primer byte, y sin buffering intermedio.
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        const send = (event: string, data: unknown) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const options: Record<string, unknown> = {
                model,
                systemInstruction: String(body.systemInstruction ?? ''),
                generationConfig: body.generationConfig ?? {},
            };
            if (Array.isArray(body.corpusIds) && body.corpusIds.length > 0) {
                // @ts-ignore - los tipos del SDK aún no cubren fileSearch
                options.tools = [{ fileSearch: { fileSearchStoreNames: body.corpusIds } }];
            }

            const chat = genAI.getGenerativeModel(options as never).startChat({
                history: (body.history ?? []).slice(-MAX_HISTORY_TURNS).map((h) => ({
                    role: h.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: String(h.text ?? '') }],
                })),
            });

            const sendArg = hasAttachments
                ? [
                      { text: message },
                      ...body.attachments!.map((a) => ({
                          inlineData: { mimeType: a.mimeType, data: a.data },
                      })),
                  ]
                : message;

            const result = await chat.sendMessageStream(sendArg as never);
            let full = '';
            for await (const chunk of result.stream) {
                for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
                    // Solo texto: las partes de "thinking" y las llamadas a
                    // función no van al pastor.
                    if ('text' in part && typeof part.text === 'string' && !('thought' in part)) {
                        full += part.text;
                        send('chunk', { text: part.text });
                    }
                }
            }

            const finalResponse = await result.response;
            const meta = finalResponse.usageMetadata;
            void recordLlmUsage({
                model,
                feature: String(body.feature ?? 'facultyChat'),
                userId: uid,
                inputTokens: meta?.promptTokenCount ?? 0,
                outputTokens: meta?.candidatesTokenCount ?? 0,
            });

            // Metadata de grounding (solo camino legacy con fileSearch): viaja al
            // final para que el cliente arme la bibliografía sin re-parsear texto.
            const grounding =
                (finalResponse as unknown as {
                    candidates?: Array<{ groundingMetadata?: { groundingChunks?: unknown[] } }>;
                })?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
            send('done', { text: full, grounding });
            res.end();
        } catch (err) {
            console.error('[facultyChatStream] falló', err);
            send('error', { message: err instanceof Error ? err.message : 'stream failed' });
            res.end();
        }
    },
);
