import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Crea una caché de contexto de Gemini (`cachedContents`) sobre los PDFs que el
 * pastor tiene en su biblioteca, y devuelve su nombre.
 *
 * Existe porque `library-context.refreshCache` hacía `fetch` directo a esta API
 * con la clave en la query string. NO es una generación, así que el proxy de
 * LLM no la cubre: es la API de cachés, con su propio ciclo de vida.
 *
 * Y no es código muerto: el `cacheName` que sale de acá viaja hasta
 * `GeneratorChatService` y termina en los prompts del wizard, así que borrarlo
 * en vez de migrarlo habría apagado el contexto de biblioteca del chat.
 *
 * A diferencia de los otros callables de Core Library, este NO es solo-admin:
 * lo usa cualquier pastor con biblioteca. La puerta es estar autenticado.
 */

interface CreateLibraryCacheRequest {
    geminiUris: string[];
    ttlSeconds: number;
    model?: string;
}

const MAX_URIS = 100;
/** 24 h. Igual que el tope que usaba el cliente; más allá no aporta y cuesta. */
const MAX_TTL_SECONDS = 86_400;
const DEFAULT_MODEL = 'models/gemini-2.5-flash';

export const createLibraryCache = onCall<CreateLibraryCacheRequest>(
    {
        ...appCheckCallableOptions(),
        cors: true,
        timeoutSeconds: 300,
        secrets: ['GEMINI_API_KEY'],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret not configured');
        }

        const data = request.data ?? ({} as CreateLibraryCacheRequest);
        const geminiUris = Array.isArray(data.geminiUris) ? data.geminiUris.filter(Boolean) : [];
        if (geminiUris.length === 0) {
            throw new HttpsError('invalid-argument', 'geminiUris is required');
        }
        if (geminiUris.length > MAX_URIS) {
            throw new HttpsError('invalid-argument', `geminiUris excede ${MAX_URIS} entradas`);
        }

        const ttl = Number(data.ttlSeconds);
        if (!Number.isFinite(ttl) || ttl <= 0) {
            throw new HttpsError('invalid-argument', 'ttlSeconds must be a positive number');
        }
        const ttlSeconds = Math.min(ttl, MAX_TTL_SECONDS);

        // El modelo se acota a la allowlist para que un cliente manipulado no
        // cachee contra un modelo caro fuera de lo previsto.
        const model = data.model === DEFAULT_MODEL || !data.model ? DEFAULT_MODEL : null;
        if (!model) {
            throw new HttpsError('invalid-argument', `Modelo no autorizado: ${data.model}`);
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        contents: geminiUris.map((uri) => ({
                            role: 'user',
                            parts: [{ fileData: { fileUri: uri, mimeType: 'application/pdf' } }],
                        })),
                        ttl: `${ttlSeconds}s`,
                    }),
                },
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[createLibraryCache] creación falló', response.status, errorText);
                throw new HttpsError('internal', `Cache creation failed: ${response.status}`);
            }

            const cacheData = (await response.json()) as { name?: string };
            if (!cacheData.name) {
                throw new HttpsError('internal', 'Cache creation returned no name');
            }

            return {
                cacheName: cacheData.name,
                expiresAtMs: Date.now() + ttlSeconds * 1000,
            };
        } catch (error: any) {
            console.error('[createLibraryCache] falló', error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error?.message ?? 'createLibraryCache failed');
        }
    },
);
