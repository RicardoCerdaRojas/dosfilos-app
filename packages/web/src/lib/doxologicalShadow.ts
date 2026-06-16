import { getFunctions, httpsCallable } from 'firebase/functions';
import { buildDoxologicalGate, evaluateDoxologicalGate, type WitnessResult } from '@dosfilos/domain';

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

/** Causa clasificada del fallo del gate (enum, no boolean). La sombra la usa
 * para decidir si fail-closed es vivible en enforce o si hay una falla concreta
 * del callable que endurecer ANTES del flip. */
export type FailureCause = 'timeout' | 'error-callable' | 'app-check' | 'otro';

/** Clasifica un error de la corrida de testigos en su causa. */
export function classifyShadowFailure(err: unknown): FailureCause {
    const code = (err as { code?: unknown })?.code ? String((err as { code?: unknown }).code).toLowerCase() : '';
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err ?? '').toLowerCase();
    if (code.includes('deadline') || msg.includes('timeout') || msg.includes('deadline')) return 'timeout';
    if (
        code.includes('app-check') ||
        code.includes('unauthenticated') ||
        msg.includes('app check') ||
        msg.includes('app-check')
    ) {
        return 'app-check';
    }
    if (code.includes('functions/') || code.includes('internal') || msg.includes('functions')) {
        return 'error-callable';
    }
    return 'otro';
}

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
    /** Causa clasificada (enum). Sin causa la sombra no informa el fail-mode. */
    failureCause: FailureCause;
}

/**
 * Registra que la corrida de testigos en sombra FALLÓ (fail-open). Usado por el
 * flujo guiado, donde el shadow dispara su propia llamada a testigos: si esa
 * llamada cae, dejamos rastro del miss — con CAUSA — para no leer "0 disparos"
 * como "0 fugas" y para adjudicar si fail-closed es vivible.
 */
export async function logDoxologicalShadowFailure(input: LogShadowFailureInput): Promise<void> {
    try {
        const callable = httpsCallable(getFunctions(), 'recordDoxologicalGateShadow');
        await callable({
            seedId: input.seedId,
            sermonId: input.sermonId,
            flow: input.flow,
            failure: input.failure,
            failureCause: input.failureCause,
        });
    } catch {
        // Fail-open.
    }
}

/**
 * Grieta doxológica — Capa 2.B (puente de compat). Persiste el `DoxologicalGate`
 * autoritativo en el seed desde un `WitnessResult` ya escalado. ADITIVO + INERTE
 * (no bloquea nada; el enforce C/D lo leerá). Best-effort: un fallo de
 * persistencia no rompe el flujo — el seed solo queda sin veredicto. Devuelve
 * temprano si no hay claim doxológico (texto vacío/ausente).
 */
export async function persistDoxologicalGateForResult(result: WitnessResult): Promise<void> {
    try {
        const gate = buildDoxologicalGate(result, new Date());
        if (!gate) return;
        // Import dinámico: difiere la dependencia de @dosfilos/application (y su
        // cadena firebase) a call-time, para no arrastrarla al grafo de módulos
        // de cada componente que solo loguea sombra.
        const { pastoralSeedService } = await import('@dosfilos/application');
        await pastoralSeedService.persistDoxologicalGate(result.seedId, gate);
    } catch {
        // Best-effort: B es aditivo e inerte.
    }
}
