/**
 * ADR-036 — decisiones PURAS de admisión + citabilidad del ancla.
 *
 * Fail-closed por construcción: el ÚNICO camino a `confront` es un ancla cuyo
 * verso existe, que el adjudicador marcó `refutes: 'yes'`, Y cuya entrada está
 * `reviewed` por el `floor-reviewer`. Cualquier otra combinación → no confronta.
 *
 * Espeja la forma de `decideMisreadingTurn` (ADR-035): el LLM y el IO producen
 * datos; la DECISIÓN es esta función pura, testeable sin LLM ni Firestore. El
 * test de reversión de este módulo debe romper CI (guardrail), igual que la fila
 * ortogonal y cross-chapter en 035.
 */

import type {
    AnchorVerification,
    CorrectiveAnchor,
    MisreadingReviewStatus,
} from '../entities/VerifiedMisreading';

/**
 * Qué hacer con una entrada curada:
 * - `confront` → habilitada para confrontar (yes + reviewed + verso existe).
 * - `review-queue` → a cola de revisión pastoral (unclear, o yes aún no revisado).
 *   NUNCA confronta sola; un humano la adjudica. No se descarta en silencio (R1).
 * - `reject` → fail-closed: verso inexistente o `refutes: 'no'`. No confronta.
 */
export type AnchorAdmission = 'confront' | 'review-queue' | 'reject';

export interface AnchorAdmissionInput {
    verification: AnchorVerification | undefined;
    reviewStatus: MisreadingReviewStatus;
}

/**
 * Mapea (verificación, estado de revisión) → admisión. PURO. Fail-closed.
 *
 * Orden de guardas (el más restrictivo primero):
 *  1. sin verificación              → reject  (no asumir; aún no adjudicada)
 *  2. !versesExist                  → reject  (ancla inventada / verso falso)
 *  3. refutes === 'no'              → reject  (no refuta de verdad)
 *  4. refutes === 'unclear'         → review-queue  (ambiguo → humano, R1)
 *  5. refutes === 'yes' && reviewed → confront  (ÚNICA vía)
 *  6. refutes === 'yes' && !reviewed→ review-queue  (verificada, falta aval)
 */
export function decideAnchorAdmission(input: AnchorAdmissionInput): AnchorAdmission {
    const v = input.verification;
    if (!v) return 'reject';
    if (!v.versesExist) return 'reject';
    if (v.refutes === 'no') return 'reject';
    if (v.refutes === 'unclear') return 'review-queue';
    // refutes === 'yes' a partir de aquí.
    if (input.reviewStatus === 'reviewed') return 'confront';
    return 'review-queue';
}

/** ¿La admisión habilita confrontar con esta ancla? Único `true` = `confront`. */
export function anchorAdmissionConfronts(admission: AnchorAdmission): boolean {
    return admission === 'confront';
}

/**
 * R3 — ¿el ancla se puede mostrar como CITA respaldada? Regla pura: requiere
 * `sourceId` presente Y `provenanceVerified === true` (el chunk resolvió, PR4).
 * Sin `sourceId` o sin verificar → `sin-fuente-trazable`: el verso del ancla
 * puede ser válido, pero NO se presenta con fuente. Fail-closed de procedencia.
 */
export function isAnchorCitable(anchor: CorrectiveAnchor): boolean {
    return Boolean(anchor.sourceId) && anchor.provenanceVerified === true;
}
