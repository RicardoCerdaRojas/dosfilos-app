/**
 * ADR-035 CA1/CA2/CA3 — decisión PURA del turno de confrontación de
 * `common-misreading`.
 *
 * Separación clave (CA1): el LLM (detector, tier Sonnet) SOLO produce tres
 * booleanos por turno — ¿sustantivo?, ¿enganchó el ancla?, ¿contradice el
 * ancla?. La DECISIÓN de qué hacer es esta función pura, testeable sin LLM. El
 * detector juzga ENGAGEMENT, no corrección; esta función lo hace explícito.
 *
 * Garantía de la tesis (CA3, fila D): "enganchó el ancla a fondo y AÚN ASÍ
 * contradice" termina ACEPTANDO vía override floor — NO se bloquea por conclusión
 * equivocada. Si juzgáramos corrección, la fila D nunca aceptaría.
 */

export interface MisreadingJudgment {
    /** Pasó el GATE-MÍNIMO de sustancia (CA2: aceptar se compone con el mínimo). */
    substantive: boolean;
    /** Trabajó el ancla de forma sustantiva, AUNQUE discrepe (CA1: engagement). */
    engagedAnchor: boolean;
    /** Su postura contradice el ancla verificable. */
    contradictsAnchor: boolean;
}

export type MisreadingTurnOutcome =
    /** < sustancia → orientar "profundiza" (NO cuenta como re-confront). */
    | 'gate-minimo'
    /** Enganchó y no contradice → aceptar (fila A). */
    | 'accept'
    /** No enganchó, o enganchó-pero-contradice, bajo el tope → re-confrontar (filas B / D-1ª). */
    | 're-confront'
    /** Tope alcanzado → override floor: acepta y registra la discrepancia (fila D-final). */
    | 'accept-override';

/**
 * Mapea (judgment, attemptIndex, tope) → outcome. PURO.
 *
 * @param attemptIndex intentos previos en el paso (0-based; sube con cada retry).
 * @param cap tope de re-confront por clase (RECONFRONT_CAPS; misreading=1).
 */
export function decideMisreadingTurn(
    judgment: MisreadingJudgment,
    attemptIndex: number,
    cap: number,
): MisreadingTurnOutcome {
    if (!judgment.substantive) return 'gate-minimo';
    // Enganchó el ancla y NO la contradice → trabajo hecho, avanza.
    if (judgment.engagedAnchor && !judgment.contradictsAnchor) return 'accept';
    // Resto (no enganchó, o enganchó-pero-contradice) amerita re-confront, pero
    // con tope: nunca atrapa al pastor — al alcanzarlo, override floor acepta y
    // registra. Esto es lo que hace que la fila D (engaged+contradice) ACEPTE,
    // probando que juzgamos engagement, no corrección.
    if (attemptIndex >= cap) return 'accept-override';
    return 're-confront';
}

/** ¿El outcome avanza el paso (acepta) vs lo retiene (re-confronta/orienta)? */
export function misreadingOutcomeAdvances(outcome: MisreadingTurnOutcome): boolean {
    return outcome === 'accept' || outcome === 'accept-override';
}
