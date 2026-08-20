import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Cliente del proxy de LLM del servidor.
 *
 * Reemplaza el patrón `new GoogleGenerativeAI(<clave de Gemini>)` que corría
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
    /**
     * Imagen enviada junto al prompt (extracción de rúbricas desde una foto o
     * un pantallazo). Es el único adapter de exégesis que es multimodal; el
     * resto es texto→texto.
     */
    inlineImage?: { mimeType: string; base64: string };
}

interface LlmProxyResponse {
    text: string;
    /** Consumo total informado por el modelo, o `null` si no vino. */
    tokens: number | null;
    /** `finishReason` del candidato, o `null` si el camino no lo expone. */
    finishReason: string | null;
}

/**
 * Opciones del TRANSPORTE, no del modelo. Van aparte del payload a propósito:
 * `CallableLlmOptions` viaja verbatim como `data` del callable, y el servidor
 * rechaza lo que no reconoce.
 */
export interface CallableLlmTransport {
    /**
     * Tope de espera del cliente. El SDK usa 70 s si no se dice nada
     * (`options.timeout || 70000`), que alcanza para una respuesta corta y NO
     * alcanza para las largas: el compositor académico pide 65.536 tokens de
     * salida en `gemini-2.5-pro` y un paper completo tarda varios minutos. Con
     * el default, la llamada se cortaría del lado del navegador con el modelo
     * todavía generando — y el usuario vería un fallo de una composición que en
     * el servidor terminó bien (y que igual se cobró).
     */
    timeoutMs?: number;
}

export interface CallableLlmResult {
    text: string;
    tokensUsed: number | null;
    /**
     * Por qué paró el modelo. Distingue "vino vacío porque safety lo bloqueó"
     * de "vino vacío porque se truncó en MAX_TOKENS" — el asistente expositivo
     * arma su mensaje de error con esto, y sin la distinción ambos casos
     * saldrían como un genérico "non-JSON output".
     */
    finishReason: string | null;
}

/**
 * Variante que además devuelve el consumo de la llamada.
 *
 * Existe porque los adapters de exégesis leían
 * `result.response.usageMetadata.totalTokenCount` del SDK y lo propagan hasta la
 * UI: los diálogos de composición muestran "N tokens · modelo X". Migrar con el
 * `runLlmPrompt` de solo texto habría dejado ese dato en `null` y la línea
 * habría desaparecido de la pantalla sin error ni log.
 */
export async function runLlmPromptWithUsage(
    options: CallableLlmOptions,
    transport: CallableLlmTransport = {},
): Promise<CallableLlmResult> {
    const callable = httpsCallable<CallableLlmOptions, LlmProxyResponse>(
        getFunctions(),
        'runLlmPrompt',
        transport.timeoutMs ? { timeout: transport.timeoutMs } : undefined,
    );
    const res = await callable(options);
    return {
        text: res.data?.text ?? '',
        tokensUsed: res.data?.tokens ?? null,
        finishReason: res.data?.finishReason ?? null,
    };
}

export async function runLlmPrompt(
    options: CallableLlmOptions,
    transport: CallableLlmTransport = {},
): Promise<string> {
    const { text } = await runLlmPromptWithUsage(options, transport);
    return text;
}
