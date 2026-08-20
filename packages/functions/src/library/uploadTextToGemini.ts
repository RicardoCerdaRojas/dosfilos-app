import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Sube un texto a la Files API de Gemini y devuelve su URI.
 *
 * Existe porque el panel de Core Library subía el texto ANOTADO desde el
 * navegador con la clave en la query string (`?key=...`). Es la misma clase de
 * exposición que el resto de la migración viene cerrando, pero por otra API: no
 * es una generación, así que el proxy de LLM no la cubre.
 *
 * Solo admin: quien puede llamar acá puede escribir en el espacio de archivos
 * del proyecto, así que la puerta es la misma que la de los otros callables de
 * Core Library.
 */

interface UploadTextRequest {
    text: string;
    displayName: string;
}

/** ~10 MB de texto. El anotado de un documento grande ronda 1-2 MB. */
const MAX_TEXT_CHARS = 10_000_000;

export const uploadTextToGemini = onCall<UploadTextRequest>(
    {
        ...appCheckCallableOptions(),
        cors: true,
        memory: '1GiB',
        timeoutSeconds: 300,
        secrets: ['GEMINI_API_KEY'],
    },
    async (request) => {
        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can upload files to Gemini');
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret not configured');
        }

        const { text, displayName } = request.data ?? ({} as UploadTextRequest);
        if (!text || !text.trim()) {
            throw new HttpsError('invalid-argument', 'text is required');
        }
        if (text.length > MAX_TEXT_CHARS) {
            throw new HttpsError('invalid-argument', `text excede ${MAX_TEXT_CHARS} caracteres`);
        }
        if (!displayName || !displayName.trim()) {
            throw new HttpsError('invalid-argument', 'displayName is required');
        }

        // La subida es RESUMABLE en dos pasos, igual que en el cliente: primero
        // se negocia la URL, después se manda el cuerpo. Se conserva tal cual
        // porque es lo que la API espera; lo único que cambia es dónde vive la
        // clave.
        const byteLength = Buffer.byteLength(text, 'utf8');
        try {
            const init = await fetch(
                `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'X-Goog-Upload-Protocol': 'resumable',
                        'X-Goog-Upload-Command': 'start',
                        'X-Goog-Upload-Header-Content-Length': String(byteLength),
                        'X-Goog-Upload-Header-Content-Type': 'text/plain',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ file: { displayName } }),
                },
            );
            if (!init.ok) {
                throw new Error(`Gemini init upload failed: ${init.status} ${init.statusText}`);
            }
            const uploadUrl = init.headers.get('x-goog-upload-url');
            if (!uploadUrl) throw new Error('No upload URL from Gemini');

            const upload = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'X-Goog-Upload-Protocol': 'resumable',
                    'X-Goog-Upload-Command': 'upload, finalize',
                    'X-Goog-Upload-Offset': '0',
                    'Content-Length': String(byteLength),
                },
                body: text,
            });
            if (!upload.ok) {
                throw new Error(`Gemini upload failed: ${upload.status} ${upload.statusText}`);
            }
            const r = (await upload.json()) as { file?: { uri?: string; name?: string } };
            if (!r.file?.uri || !r.file?.name) {
                throw new Error('Gemini upload returned no file uri/name');
            }
            return { uri: r.file.uri, name: r.file.name };
        } catch (error: any) {
            console.error('[uploadTextToGemini] falló', error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error?.message ?? 'uploadTextToGemini failed');
        }
    },
);
