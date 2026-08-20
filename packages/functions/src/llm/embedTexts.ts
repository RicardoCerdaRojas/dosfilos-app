import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { recordLlmUsage } from './llmUsageRecorder';
import { consumeRateLimitToken } from '../shared/rateLimit';

/**
 * Embeddings en el servidor.
 *
 * Antes corrían desde el navegador con la clave pública, una llamada por chunk:
 * indexar un libro son cientos de viajes browser→Google, ninguno medido ni
 * limitado. Acá el lote entero viaja en UNA petición, se resuelve en paralelo
 * dentro del servidor y queda contabilizado.
 *
 * SOBRE LA MEDICIÓN: `embedContent` NO devuelve `usageMetadata`, así que los
 * tokens se ESTIMAN por caracteres (~4 por token, la regla habitual). Es una
 * aproximación y está dicho acá para que nadie lea esa cifra como exacta; sirve
 * para el orden de magnitud, que es lo que el panel necesita.
 */

const EMBEDDING_MODEL = 'gemini-embedding-001';
const MAX_TEXTS_PER_CALL = 100;
const MAX_CHARS_PER_TEXT = 8000;
const WINDOW_MS = 3_600_000;
const MAX_CALLS_PER_HOUR = 300;
/** Regla estándar de la industria; suficiente para estimar orden de magnitud. */
const CHARS_PER_TOKEN = 4;

export const embedTexts = onCall(
    { ...appCheckCallableOptions(), secrets: ['GEMINI_API_KEY'], timeoutSeconds: 300, memory: '512MiB' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret not configured');
        }

        const uid = request.auth.uid;
        const raw = (request.data as { texts?: unknown; dimension?: number })?.texts;
        if (!Array.isArray(raw) || raw.length === 0) {
            throw new HttpsError('invalid-argument', 'texts must be a non-empty array');
        }
        if (raw.length > MAX_TEXTS_PER_CALL) {
            throw new HttpsError('invalid-argument', `Máximo ${MAX_TEXTS_PER_CALL} textos por llamada`);
        }
        const texts = raw.map((t) => String(t ?? '').slice(0, MAX_CHARS_PER_TEXT));
        const dimension = Number((request.data as { dimension?: number })?.dimension) || 768;

        const allowed = await consumeRateLimitToken(admin.firestore(), {
            bucket: 'embed_texts',
            key: uid,
            windowMs: WINDOW_MS,
            max: MAX_CALLS_PER_HOUR,
        });
        if (!allowed) {
            throw new HttpsError('resource-exhausted', 'Demasiadas solicitudes de indexado. Espera unos minutos.');
        }

        try {
            const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: EMBEDDING_MODEL });
            // En paralelo DENTRO del servidor: el cliente hacía lo mismo pero
            // pagando latencia de red por cada chunk.
            const embeddings = await Promise.all(
                texts.map(async (text) => {
                    const res = await model.embedContent({
                        content: { role: 'user', parts: [{ text }] },
                        // @ts-ignore - el SDK aún no tipa outputDimensionality
                        outputDimensionality: dimension,
                    });
                    return res.embedding.values;
                }),
            );

            const estimatedTokens = Math.ceil(
                texts.reduce((sum, t) => sum + t.length, 0) / CHARS_PER_TOKEN,
            );
            void recordLlmUsage({
                model: EMBEDDING_MODEL,
                feature: 'library.embeddings',
                userId: uid,
                inputTokens: estimatedTokens,
                outputTokens: 0, // los embeddings no generan tokens de salida
            });

            return { embeddings };
        } catch (err) {
            console.error('[embedTexts] falló', err);
            throw new HttpsError('internal', err instanceof Error ? err.message : 'embedTexts failed');
        }
    },
);
