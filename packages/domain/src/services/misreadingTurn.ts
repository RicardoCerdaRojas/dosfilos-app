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
    // TRES estados, no dos. Solo se confronta si el pastor CAYÓ en la lectura
    // errónea (contradice el ancla). NO tocar el tema (ortogonal: !engaged
    // !contradice — respondió la función sin mencionar la mala lectura) NO es lo
    // mismo que ignorarla tras confrontar: ortogonal → accept (lo no-tratado lo
    // recoge el colector al cierre como nudge, NO un confront in-step que
    // encerraría al pastor en el caso más frecuente). La fila A (enganchó y no
    // contradice) también pasa por aquí.
    if (!judgment.contradictsAnchor) return 'accept';
    // Contradice (cayó en la mala lectura) → re-confront, pero con tope: nunca
    // atrapa — al alcanzarlo, override floor acepta y registra. Esto hace que la
    // fila D (enganchó+contradice) ACEPTE, probando que juzgamos engagement, no
    // corrección. `engagedAnchor` distingue la REDACCIÓN del nudge (B "no tocaste
    // el ancla" vs D "trabajaste pero contradices"), no la decisión.
    if (attemptIndex >= cap) return 'accept-override';
    return 're-confront';
}

/** ¿El outcome avanza el paso (acepta) vs lo retiene (re-confronta/orienta)? */
export function misreadingOutcomeAdvances(outcome: MisreadingTurnOutcome): boolean {
    return outcome === 'accept' || outcome === 'accept-override';
}

/**
 * Redacción v2 Fase 1 (§4.4) — tope de re-confront del override de género.
 * Reusa la misma máquina de tres estados (`decideMisreadingTurn`): tras agotar
 * el tope, el pastor que sostiene otro género se libera vía override floor con
 * su elección registrada. Dato editable (no hardcode en el use case). =1 espeja
 * `RECONFRONT_CAPS['common-misreading']`.
 */
export const GENRE_OVERRIDE_RECONFRONT_CAP = 1;
