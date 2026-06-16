import { getFunctions, httpsCallable } from 'firebase/functions';
import { evaluateDoxologicalGate, type WitnessResult } from '@dosfilos/domain';

/**
 * Grieta doxológica — Capa 1 (modo sombra), lado cliente.
 *
 * El veredicto del gate doxológico se computa con el ÚNICO motor de fidelidad
 * (`evaluateDoxologicalGate` sobre el `WitnessResult` escalado, que ya vive
 * client-side) y se envía fire-and-forget al callable `recordDoxologicalGateShadow`.
 *
 * Garantías de modo sombra:
 * - NO bloquea ni decide nada — solo registra.
 * - Fail-open: nunca lanza. Un fallo de red/callable se traga (y, cuando hay
 *   contexto suficiente, se registra como fila de fallo aparte vía
 *   `logDoxologicalShadowFailure`).
 * - Los call sites están gateados por `three_witnesses`; este módulo no checa
 *   el flag (no es su responsabilidad).
 */

export type ShadowFlow =
    | 'wizard'
    | 'guided-insight'
    | 'guided-socratic'
    | 'guided-wordstudies';

export type OneShotVerdict = 'pass' | 'block' | null;

interface LogShadowInput {
    result: WitnessResult;
    flow: ShadowFlow;
    /** Latencia de la llamada a los tres testigos, en ms. */
    witnessLatencyMs: number;
    /** True si el resultado vino de caché (latencia no es costo LLM real). */
    cacheHit?: boolean;
    /** Wizard: stance del one-shot (todos los claims). Guiado: null. */
    oneShotVerdict?: OneShotVerdict;
}

/**
 * Evalúa el gate doxológico sobre un `WitnessResult` ya computado y registra la
 * corrida en sombra. Si el resultado no trae claim doxológico (`absent`), no
 * registra nada — no hay afecto que adjudicar.
 */
export async function logDoxologicalShadow(input: LogShadowInput): Promise<void> {
    try {
        const gate = evaluateDoxologicalGate(input.result);
        if (gate.status === 'absent') return;
        const callable = httpsCallable(getFunctions(), 'recordDoxologicalGateShadow');
        await callable({
            seedId: input.result.seedId,
            sermonId: input.result.sermonId,
            flow: input.flow,
            doxologicalText: gate.claim.text,
            status: gate.status,
            escalation: gate.escalation,
            witnessLatencyMs: input.witnessLatencyMs,
            cacheHit: input.cacheHit ?? false,
            oneShotVerdict: input.oneShotVerdict ?? null,
        });
    } catch {
        // Fail-open: el modo sombra nunca afecta el flujo del pastor.
    }
}

interface LogShadowFailureInput {
    seedId: string;
    sermonId: string;
    flow: ShadowFlow;
    failure: string;
}

/**
 * Registra que la corrida de testigos en sombra FALLÓ (fail-open). Usado por el
 * flujo guiado, donde el shadow dispara su propia llamada a testigos: si esa
 * llamada cae, dejamos rastro del miss para no leer "0 disparos" como "0 fugas".
 */
export async function logDoxologicalShadowFailure(input: LogShadowFailureInput): Promise<void> {
    try {
        const callable = httpsCallable(getFunctions(), 'recordDoxologicalGateShadow');
        await callable({
            seedId: input.seedId,
            sermonId: input.sermonId,
            flow: input.flow,
            failure: input.failure,
        });
    } catch {
        // Fail-open.
    }
}
