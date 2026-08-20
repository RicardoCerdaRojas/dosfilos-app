import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Cliente del proxy de LLM del servidor.
 *
 * Reemplaza el patrón `new GoogleGenerativeAI(VITE_GEMINI_API_KEY)` que hoy corre
 * en el navegador: esa clave viaja en el bundle y cualquiera puede leerla y
 * gastar la cuota del proyecto. Con esto la llamada pasa por un callable
 * autenticado, con App Check, rate-limit por usuario y medición del gasto.
 *
 * El prompt se sigue armando en el cliente (los constructores de prompt y las
 * bases de conocimiento viven en este paquete). Cerrar eso es el paso siguiente,
 * feature por feature; esto cierra primero la exposición de la credencial.
 */

export interface CallableLlmOptions {
    /** Debe estar en la allowlist `PROXY_FEATURES` del servidor. */
    feature: string;
    prompt: string;
    system?: string;
    responseMimeType?: 'text/plain' | 'application/json';
    temperature?: number;
    maxOutputTokens?: number;
    model?: string;
    /**
     * Store de `fileSearch` (tutor de griego). Cuando viaja, el servidor usa el
     * SDK con tools en vez del port — y `responseMimeType: application/json` NO
     * aplica: con tools el modelo devuelve texto y el llamador limpia el JSON.
     */
    fileSearchStoreId?: string;
    /**
     * `'standard'` aplica los umbrales de seguridad explícitos que traía la ruta
     * directa del generador. Se pide explícito para no cambiar el filtrado del
     * modelo sin querer.
     */
    safety?: 'standard';
    /** Nucleus sampling. Varios adapters de exégesis lo fijan explícitamente. */
    topP?: number;
    /**
     * Esquema de salida estructurada. Perderlo NO da error: da respuestas peor
     * formadas, que es mucho más difícil de detectar que un fallo.
     */
    responseSchema?: unknown;
}

export async function runLlmPrompt(options: CallableLlmOptions): Promise<string> {
    const callable = httpsCallable<CallableLlmOptions, { text: string }>(getFunctions(), 'runLlmPrompt');
    const res = await callable(options);
    return res.data?.text ?? '';
}
