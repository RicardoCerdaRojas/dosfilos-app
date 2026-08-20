import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Clientes de los callables de biblioteca que antes hablaban con las APIs de
 * Google DESDE EL NAVEGADOR, con la clave de Gemini en la query string.
 *
 * Viven acá y no en `packages/web` por la misma razón que `callableLlm`: la capa
 * web no importa Firebase directamente. El prompt/los datos los sigue armando
 * quien llama; esto solo mueve el transporte.
 */

export interface UploadTextToGeminiResult {
    uri: string;
    name: string;
}

/**
 * Sube un texto a la Files API de Gemini y devuelve su URI. Lo usa el panel de
 * Core Library para el texto anotado. Solo admin del lado del servidor.
 */
export async function uploadTextToGemini(
    text: string,
    displayName: string,
): Promise<UploadTextToGeminiResult> {
    const callable = httpsCallable<
        { text: string; displayName: string },
        UploadTextToGeminiResult
    >(getFunctions(), 'uploadTextToGemini');
    const res = await callable({ text, displayName });
    if (!res.data?.uri || !res.data?.name) {
        throw new Error('uploadTextToGemini devolvió una respuesta vacía');
    }
    return { uri: res.data.uri, name: res.data.name };
}

export interface CreateLibraryCacheResult {
    cacheName: string;
    expiresAtMs: number;
}

/**
 * Crea la caché de contexto de Gemini sobre los PDFs de la biblioteca.
 *
 * El `cacheName` que devuelve no es cosmético: viaja hasta el chat del wizard y
 * termina en los prompts, así que un fallo acá apaga el contexto de biblioteca.
 */
export async function createLibraryCache(
    geminiUris: string[],
    ttlSeconds: number,
): Promise<CreateLibraryCacheResult> {
    const callable = httpsCallable<
        { geminiUris: string[]; ttlSeconds: number },
        CreateLibraryCacheResult
    >(getFunctions(), 'createLibraryCache');
    const res = await callable({ geminiUris, ttlSeconds });
    if (!res.data?.cacheName) {
        throw new Error('createLibraryCache devolvió una respuesta vacía');
    }
    return res.data;
}
