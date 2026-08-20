/**
 * Cuánto espera el navegador a una composición larga.
 *
 * El SDK de callables corta a los 70 s si no se le dice otra cosa
 * (`options.timeout || 70000`). Ese default alcanza para una respuesta corta y
 * no alcanza para estas: el compositor académico pide 65.536 tokens de salida
 * en `gemini-2.5-pro`, y el de sermones 32.768. Con el default, el navegador
 * abandonaría la llamada con el modelo todavía generando — el usuario vería
 * fallar una composición que en el servidor terminó bien y que igual se cobró.
 *
 * 9 minutos es el mismo techo que `timeoutSeconds` del callable: que corte el
 * servidor, no el cliente, para que el error diga qué pasó.
 */
export const LONG_COMPOSITION_TIMEOUT_MS = 540_000;
