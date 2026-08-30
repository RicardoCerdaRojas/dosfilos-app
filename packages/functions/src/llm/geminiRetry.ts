/**
 * Política de reintentos contra Gemini.
 *
 * Vive aparte de `runLlmPrompt` para poder probarse sin arrastrar
 * `firebase-functions` ni `firebase-admin`: es lógica pura de tiempo, y el
 * fallo que motivó su última corrección —un cuelgue que se comía el callable
 * entero— sólo se reproduce inyectándolo, nunca mirando la app.
 */

/**
 * ¿Vale la pena reintentar este fallo?
 *
 * `fetch failed` es el que motivó esto: un corte de red entre la función y
 * Gemini, sin cuerpo ni código HTTP. Le llegaba al usuario como "Algo falló al
 * generar este paso" después de esperar minutos, y reintentar a mano funcionaba
 * — que es la definición de transitorio.
 *
 * El reintento va acá y no en el cliente a propósito: reenviar desde el
 * navegador significa volver a subir un prompt que puede pesar 200 KB, por un
 * fallo que se resuelve solo en un segundo.
 */
export function isTransientGeminiError(err: unknown): boolean {
    if (!err) return false;
    // Explícito y no por coincidencia de texto: `AttemptTimeoutError` ya cae en
    // el `includes('timeout')` de más abajo, pero depender de eso ataría la
    // política de reintentos a la redacción de un mensaje.
    if (err instanceof AttemptTimeoutError) return true;
    const e = err as { status?: number; code?: number; message?: string; cause?: { code?: string } };
    if (e.status === 503 || e.status === 429 || e.code === 503 || e.code === 429) return true;
    const causeCode = e.cause?.code ?? '';
    if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_SOCKET'].includes(causeCode)) return true;
    const msg = (e.message ?? '').toLowerCase();
    return msg.includes('fetch failed')
        || msg.includes('503') || msg.includes('429')
        || msg.includes('socket') || msg.includes('econnreset')
        || msg.includes('high demand') || msg.includes('overload')
        || msg.includes('timeout') || msg.includes('try again later');
}

/**
 * Presupuesto total de la función, por debajo del `timeoutSeconds: 540` del
 * callable. El margen existe para que, cuando se agote, la función alcance a
 * lanzar un error propio —con su log y su causa— en vez de que la plataforma le
 * mate el contenedor en silencio.
 */
export const RETRY_BUDGET_MS = 500_000;

/**
 * Techo de UN intento.
 *
 * Es una tensión real y conviene dejarla escrita. Los pasos medidos en
 * producción tardan entre 24 s y 39 s, pero el compositor académico pide 65.536
 * tokens de salida y tarda varios minutos: un tope agresivo le cortaría un
 * paper legítimo. 5 minutos es holgado para el caso lento conocido y sigue
 * dejando margen para un segundo intento dentro del presupuesto.
 */
export const ATTEMPT_TIMEOUT_MS = 300_000;

/** Un intento que no respondió a tiempo. Transitorio por definición. */
export class AttemptTimeoutError extends Error {
    constructor(ms: number) {
        super(`el intento no respondió en ${Math.round(ms / 1000)} s`);
        this.name = 'AttemptTimeoutError';
    }
}

/**
 * Corre `fn` con un techo de tiempo.
 *
 * `Promise.race` no cancela al perdedor: la llamada a Gemini sigue viva en
 * segundo plano. No importa —la función va a morir con el contenedor— pero sí
 * importa limpiar el temporizador, porque un timer pendiente mantiene despierto
 * el event loop y retrasa el cierre.
 */
async function withAttemptTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
        return await Promise.race([
            fn(),
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new AttemptTimeoutError(ms)), ms);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/**
 * Reintenta con retroceso exponencial. Tres intentos: el segundo cubre el corte
 * puntual y el tercero, una ventana de saturación corta. Más que eso haría al
 * usuario esperar por un fallo que ya no es transitorio.
 *
 * CADA INTENTO TIENE TECHO PROPIO, y esa es la parte que faltaba. Sin él, una
 * llamada que se COLGABA —en vez de fallar— se comía los 540 s del callable en
 * el primer intento: el reintento nunca disparaba, no se logueaba nada, y la
 * plataforma mataba el contenedor sin dejar rastro. Medido en producción: una
 * generación quedó nueve minutos sin un solo log y sin respuesta. El reintento
 * cubría los fallos que RETORNAN; un cuelgue no retorna.
 */
export async function withGeminiRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const delays = [700, 2100];
    const started = Date.now();
    for (let attempt = 0; ; attempt++) {
        const remaining = RETRY_BUDGET_MS - (Date.now() - started);
        if (remaining <= 0) {
            throw new AttemptTimeoutError(RETRY_BUDGET_MS);
        }
        try {
            const result = await withAttemptTimeout(fn, Math.min(ATTEMPT_TIMEOUT_MS, remaining));
            // Sin esta línea no hay forma de saber dónde se va el tiempo de un
            // paso. La generación con Pro 2.5 y 32k de salida domina todo lo
            // demás por órdenes de magnitud, pero eso era una sospecha hasta que
            // quedó medido por feature y por intento.
            console.log(`[runLlmPrompt] ${label} ok`, {
                ms: Date.now() - started,
                attempts: attempt + 1,
            });
            return result;
        } catch (err) {
            if (attempt >= delays.length || !isTransientGeminiError(err)) throw err;
            console.warn(`[runLlmPrompt] ${label}: fallo transitorio, reintento ${attempt + 1}`, {
                error: err instanceof Error ? err.message : String(err),
            });
            await new Promise(resolve => setTimeout(resolve, delays[attempt]));
        }
    }
}
