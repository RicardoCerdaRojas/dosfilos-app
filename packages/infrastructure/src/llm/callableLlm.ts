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
}

export async function runLlmPrompt(options: CallableLlmOptions): Promise<string> {
    const callable = httpsCallable<CallableLlmOptions, { text: string }>(getFunctions(), 'runLlmPrompt');
    const res = await callable(options);
    return res.data?.text ?? '';
}
