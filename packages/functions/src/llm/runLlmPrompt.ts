import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { GeminiLlmClient } from './GeminiLlmClient';
import { recordLlmUsage } from './llmUsageRecorder';
import { LLM_PRICING } from './llmCost';
import { consumeRateLimitToken } from '../shared/rateLimit';
import { readBudgetConfig } from './llmBudget';

/**
 * Proxy de LLM para las superficies que hoy llaman al modelo DESDE EL NAVEGADOR
 * con `VITE_GEMINI_API_KEY` — una credencial que gasta dinero y que cualquiera
 * puede leer del bundle.
 *
 * QUÉ CAMBIA, exactamente:
 *
 *   ANTES  navegador → [clave pública] → Gemini
 *          cualquiera en internet · sin límite · sin atribución · sin medición
 *
 *   AHORA  navegador → callable (auth + App Check) → Gemini
 *          solo usuarios de la app · rate-limit por uid · medido por usuario
 *
 * LO QUE ESTE PROXY **NO** RESUELVE, dicho en voz alta: el prompt lo sigue
 * armando el cliente, así que un usuario autenticado puede pedirle al modelo lo
 * que quiera con la cuota del proyecto. Es un techo mucho más bajo que el de hoy
 * (autenticado, atribuido, limitado y revocable), pero no es el diseño final: ese
 * es un callable por feature con el prompt en el servidor, que se hará cuando
 * cada superficie se toque. Esto cierra la hemorragia primero.
 *
 * Guardas: allowlist de features y de modelos, tope de tamaño de prompt y de
 * salida, y rate-limit por usuario.
 */

/**
 * Features autorizadas. Es allowlist y no texto libre para que el panel de costos
 * tenga cortes estables y para que un cliente manipulado no invente etiquetas que
 * ensucien la contabilidad.
 */
/**
 * Umbrales de seguridad explícitos que la ruta directa del generador de sermones
 * traía escritos. Se preservan tal cual: cambiar el filtrado del modelo de
 * refilón, dentro de una migración de infraestructura, sería un cambio de
 * comportamiento que nadie vería en el diff.
 */
const STANDARD_SAFETY = [
    HarmCategory.HARM_CATEGORY_HARASSMENT,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }));

export const PROXY_FEATURES = [
    'hebrewTutor.analyzeVerse',
    'greekTutor.identifyForms',
    'greekTutor.createTrainingUnit',
    'greekTutor.evaluateResponse',
    'greekTutor.explainMorphology',
    'greekTutor.answerFreeQuestion',
    'greekTutor.analyzeSyntax',
    'greekTutor.quiz',
    // Tanda 2 — generación y refinamiento del sermón (GeminiAIService).
    'sermon.generateSermon',
    'sermon.generateOutline',
    'sermon.expandSection',
    'sermon.suggestReferences',
    'sermon.refineContent',
    'sermon.titleSuggestions',
    'sermon.validateContext',
    // El refinamiento real del wizard (GeminiSermonGenerator), distinto del
    // validador: es el que reescribe el texto cuando el pastor pide un cambio.
    'sermon.refineContent',
    // Las llamadas GRANDES del wizard: generan documentos completos, así que son
    // las que más pesan por llamada.
    'sermon.generateExegesis',
    'sermon.generateHomiletics',
    'sermon.generateDraft',
    'sermon.regeneratePoint',
    'sermon.homileticsPreview',
    'sermon.developApproach',
] as const;

const MAX_PROMPT_CHARS = 200_000;
const MAX_SYSTEM_CHARS = 40_000;
const MAX_OUTPUT_TOKENS_CAP = 32_768;
const DEFAULT_MAX_CALLS_PER_HOUR = 120;
const WINDOW_MS = 3_600_000;

export const runLlmPrompt = onCall(
    { ...appCheckCallableOptions(), secrets: ['GEMINI_API_KEY'], timeoutSeconds: 120 },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret not configured');
        }

        const uid = request.auth.uid;
        const data = (request.data ?? {}) as Record<string, unknown>;
        const feature = String(data.feature ?? '');
        if (!(PROXY_FEATURES as readonly string[]).includes(feature)) {
            throw new HttpsError('invalid-argument', `Feature no autorizada: ${feature}`);
        }

        const prompt = String(data.prompt ?? '');
        if (!prompt.trim()) throw new HttpsError('invalid-argument', 'prompt is required');
        if (prompt.length > MAX_PROMPT_CHARS) {
            throw new HttpsError('invalid-argument', `prompt excede ${MAX_PROMPT_CHARS} caracteres`);
        }
        const system = data.system ? String(data.system).slice(0, MAX_SYSTEM_CHARS) : undefined;

        // Solo modelos con precio conocido: si no sabemos cuánto cuesta, no lo
        // corremos. Evita que un cliente pida un modelo caro fuera de la tabla.
        const model = String(data.model ?? 'gemini-2.5-flash');
        if (!(model in LLM_PRICING)) {
            throw new HttpsError('invalid-argument', `Modelo no autorizado: ${model}`);
        }

        const cfg = await readBudgetConfig();
        const maxPerHour = Number.isFinite(cfg.proxyMaxCallsPerHourPerUser)
            ? cfg.proxyMaxCallsPerHourPerUser
            : DEFAULT_MAX_CALLS_PER_HOUR;
        const allowed = await consumeRateLimitToken(admin.firestore(), {
            bucket: 'llm_proxy',
            key: uid,
            windowMs: WINDOW_MS,
            max: maxPerHour,
        });
        if (!allowed) {
            throw new HttpsError(
                'resource-exhausted',
                'Demasiadas consultas seguidas. Espera unos minutos antes de continuar.',
            );
        }

        // Camino con TOOLS (fileSearch del tutor de griego): el port es
        // texto→texto y no las cubre, así que acá se usa el SDK directo y se
        // llama al medidor A MANO. El port es una comodidad, no un requisito: lo
        // que no es negociable es que la llamada salga del servidor y quede medida.
        const storeId = data.fileSearchStoreId ? String(data.fileSearchStoreId) : '';
        if (storeId) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const toolModel = genAI.getGenerativeModel({
                    model,
                    tools: [
                        {
                            // @ts-ignore - los tipos del SDK aún no cubren fileSearch
                            fileSearch: { fileSearchStoreNames: [storeId] },
                        },
                    ],
                    // NOTA: `responseMimeType: application/json` NO es compatible
                    // con tools — el llamador limpia el JSON del texto.
                });
                const result = await toolModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    ...(system ? { systemInstruction: system } : {}),
                    generationConfig: {
                        ...(typeof data.temperature === 'number' ? { temperature: data.temperature } : {}),
                        ...(typeof data.maxOutputTokens === 'number'
                            ? { maxOutputTokens: Math.min(data.maxOutputTokens, MAX_OUTPUT_TOKENS_CAP) }
                            : {}),
                    },
                });
                const meta = result.response.usageMetadata;
                void recordLlmUsage({
                    model,
                    feature,
                    userId: uid,
                    inputTokens: meta?.promptTokenCount ?? 0,
                    outputTokens: meta?.candidatesTokenCount ?? 0,
                });
                return { text: result.response.text() };
            } catch (err) {
                console.error(`[runLlmPrompt] ${feature} (fileSearch) falló`, err);
                throw new HttpsError('internal', err instanceof Error ? err.message : 'runLlmPrompt failed');
            }
        }

        // Camino normal, vía el port: el adapter mide tokens → USD y los atribuye
        // a esta feature y a este usuario.
        // Camino con SAFETY explícito: el port no expone safetySettings, así que
        // acá se usa el SDK y se mide a mano (mismo trato que fileSearch).
        if (data.safety === 'standard') {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                // La configuración de generación DEBE viajar acá también. La
                // primera versión de esta rama solo pasaba `safetySettings`, así
                // que el borrador del sermón perdía su `maxOutputTokens: 24576`
                // y el modo JSON — y fallaba justo en el reintento, que es el
                // camino que cae en esta rama.
                const safeModel = genAI.getGenerativeModel({
                    model,
                    safetySettings: STANDARD_SAFETY,
                    generationConfig: {
                        ...(typeof data.temperature === 'number' ? { temperature: data.temperature } : {}),
                        ...(typeof data.maxOutputTokens === 'number'
                            ? { maxOutputTokens: Math.min(data.maxOutputTokens, MAX_OUTPUT_TOKENS_CAP) }
                            : {}),
                        ...(data.responseMimeType === 'application/json'
                            ? { responseMimeType: 'application/json' }
                            : {}),
                    },
                });
                const result = await safeModel.generateContent(prompt);
                const meta = result.response.usageMetadata;
                void recordLlmUsage({
                    model,
                    feature,
                    userId: uid,
                    inputTokens: meta?.promptTokenCount ?? 0,
                    outputTokens: meta?.candidatesTokenCount ?? 0,
                });
                return { text: result.response.text() };
            } catch (err) {
                console.error(`[runLlmPrompt] ${feature} (safety) falló`, err);
                throw new HttpsError('internal', err instanceof Error ? err.message : 'runLlmPrompt failed');
            }
        }

        const llm = new GeminiLlmClient(apiKey, model, { feature, userId: uid });
        try {
            const text = await llm.generate({
                ...(system ? { system } : {}),
                prompt,
                responseMimeType: data.responseMimeType === 'application/json' ? 'application/json' : 'text/plain',
                ...(typeof data.temperature === 'number' ? { temperature: data.temperature } : {}),
                ...(typeof data.maxOutputTokens === 'number'
                    ? { maxOutputTokens: Math.min(data.maxOutputTokens, MAX_OUTPUT_TOKENS_CAP) }
                    : {}),
            });
            return { text };
        } catch (err) {
            console.error(`[runLlmPrompt] ${feature} falló`, err);
            throw new HttpsError('internal', err instanceof Error ? err.message : 'runLlmPrompt failed');
        }
    },
);
