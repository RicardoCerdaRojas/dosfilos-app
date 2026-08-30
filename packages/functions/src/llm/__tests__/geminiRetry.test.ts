import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    withGeminiRetry,
    isTransientGeminiError,
    AttemptTimeoutError,
    ATTEMPT_TIMEOUT_MS,
    RETRY_BUDGET_MS,
} from '../geminiRetry';

/** El `timeoutSeconds` del callable. Nada de acá puede pasarse de este techo. */
const CALLABLE_TIMEOUT_MS = 540_000;

/** Una promesa que nunca se resuelve: el cuelgue que vimos en producción. */
const hangs = () => new Promise<never>(() => {});

describe('isTransientGeminiError', () => {
    it('reconoce el timeout de intento sin depender del texto del mensaje', () => {
        expect(isTransientGeminiError(new AttemptTimeoutError(1000))).toBe(true);
    });

    it('reconoce los cortes de red que motivaron la política', () => {
        expect(isTransientGeminiError(new Error('fetch failed'))).toBe(true);
        expect(isTransientGeminiError({ cause: { code: 'ECONNRESET' } })).toBe(true);
        expect(isTransientGeminiError({ status: 503 })).toBe(true);
        expect(isTransientGeminiError({ status: 429 })).toBe(true);
    });

    it('NO reintenta lo que no se arregla solo', () => {
        expect(isTransientGeminiError(new Error('invalid api key'))).toBe(false);
        expect(isTransientGeminiError({ status: 400 })).toBe(false);
        expect(isTransientGeminiError(null)).toBe(false);
    });
});

describe('withGeminiRetry', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('devuelve el resultado sin reintentar cuando todo va bien', async () => {
        const fn = vi.fn().mockResolvedValue('listo');
        await expect(withGeminiRetry('t', fn)).resolves.toBe('listo');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('reintenta un fallo transitorio y devuelve el segundo intento', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('fetch failed'))
            .mockResolvedValueOnce('listo');
        const p = withGeminiRetry('t', fn);
        await vi.advanceTimersByTimeAsync(1_000);
        await expect(p).resolves.toBe('listo');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('propaga sin reintentar un fallo que no es transitorio', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('invalid api key'));
        await expect(withGeminiRetry('t', fn)).rejects.toThrow('invalid api key');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    // ── La regresión ────────────────────────────────────────────────────
    // Sin techo por intento, un cuelgue se comía los 540 s del callable en el
    // primer intento: el reintento no disparaba y la plataforma mataba el
    // contenedor sin un solo log.

    it('corta un intento colgado y deja que el siguiente responda', async () => {
        const fn = vi.fn()
            .mockImplementationOnce(hangs)
            .mockResolvedValueOnce('listo');

        const p = withGeminiRetry('t', fn);

        // Antes del techo, el intento colgado sigue siendo legítimo.
        await vi.advanceTimersByTimeAsync(ATTEMPT_TIMEOUT_MS - 1);
        expect(fn).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(2 + 700);
        await expect(p).resolves.toBe('listo');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('un cuelgue permanente falla DENTRO del presupuesto, no con el contenedor', async () => {
        const started = Date.now();
        const fn = vi.fn().mockImplementation(hangs);

        // Se sella el instante del RECHAZO, no el del final del avance: bajo
        // timers falsos `Date.now()` marca lo que uno adelantó, así que medirlo
        // afuera devolvería siempre el tope y el test pasaría por accidente.
        let rejectedAt = -1;
        const settled = withGeminiRetry('t', fn).catch((e: unknown) => {
            rejectedAt = Date.now();
            return e;
        });

        await vi.advanceTimersByTimeAsync(CALLABLE_TIMEOUT_MS);
        const err = await settled;

        expect(err).toBeInstanceOf(AttemptTimeoutError);
        const elapsed = rejectedAt - started;
        expect(elapsed).toBeLessThan(CALLABLE_TIMEOUT_MS);
        expect(elapsed).toBeLessThanOrEqual(RETRY_BUDGET_MS + 3_000);
    });

    it('no deja timers colgando cuando el intento sí responde', async () => {
        const fn = vi.fn().mockResolvedValue('listo');
        await expect(withGeminiRetry('t', fn)).resolves.toBe('listo');
        // Si `withAttemptTimeout` no limpiara su temporizador, quedaría uno
        // pendiente de 5 minutos manteniendo despierto el event loop.
        expect(vi.getTimerCount()).toBe(0);
    });
});
