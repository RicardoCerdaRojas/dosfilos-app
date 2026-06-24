/**
 * ADR-036 — Verificación de fidelidad del ancla (entrada del set crítico curado).
 *
 * Garantía: toda ancla con la que el sistema confronta una lectura errónea es
 * REAL (el verso existe) y de verdad REFUTA la lectura. ADR-035 ancló por
 * PRESENCIA (`isFeatureAnchored` = `reference` no vacía); ADR-036 cierra
 * presencia → validez.
 *
 * Este módulo es PURO (sin LLM, sin Firestore). Define la forma de una entrada
 * de `verifiedMisreadings/` (DATO editable, no código). La verificación del
 * verso (determinista) vive en app-layer (PR2); la adjudicación "¿refuta?"
 * (Sonnet, en ingest, cacheada) en `functions` (PR3); el merge con la
 * recuperación runtime en app-layer (PR5). Aquí solo viven los tipos + las
 * reglas puras (admisión + citabilidad) testeables sin nada.
 */

/** Versión del schema de la entrada. Sube cuando cambie la forma persistida. */
export const VERIFIED_MISREADING_SCHEMA_VERSION = 1;

/**
 * Alcance canónico del pasaje al que aplica la lectura errónea. Espeja el shape
 * de `passageScope` que ya usa el shadow del perfil.
 */
export interface MisreadingPassageScope {
    bookId: string;
    chapterStart: number;
    verseStart: number;
    verseEnd: number;
}

/**
 * `critical` = lectura peligrosa (pierde-salvación, prosperidad, legalismo) →
 * piso curado, revisión obligatoria. `standard` = error frecuente no peligroso.
 */
export type MisreadingSeverity = 'critical' | 'standard';

/**
 * Veredicto del adjudicador (PR3). `yes` es la ÚNICA vía que habilita confrontar
 * (R1). `no` → fail-closed. `unclear` → cola de revisión pastoral, NUNCA
 * confronta solo.
 */
export type AnchorRefutesVerdict = 'yes' | 'unclear' | 'no';

/** Reuso del gate de revisión de confesiones (`Confession.reviewStatus`). */
export type MisreadingReviewStatus = 'pending-pastoral-review' | 'reviewed';

/**
 * Procedencia REAL de un ancla (R3): sale de la metadata estructurada del chunk
 * (`DocumentChunk.metadata`), NO de redacción del LLM. `sin-fuente-trazable`
 * marca una entrada sin chunk de respaldo → el ancla bíblica puede verificarse
 * (§verso-existe) pero la UI NO la presenta como cita respaldada.
 */
export type AnchorSourceProvenance =
    | { kind: 'chunk'; resourceId: string; resourceTitle: string; page?: number }
    | { kind: 'sin-fuente-trazable' };

/**
 * Ancla correctiva curada. `reference` = el verso que refuta (verificable por
 * §verso-existe). `sourceId` → un `DocumentChunk` (procedencia citable, R3).
 * `provenanceVerified` lo setea PR4 al resolver el chunk; mientras sea falso, el
 * ancla NO es citable (fail-closed de procedencia).
 */
export interface CorrectiveAnchor {
    reference: string;
    note?: string;
    /** Id del `DocumentChunk` de respaldo (R3). Ausente → no citable. */
    sourceId?: string;
    /** Trazabilidad confirmada por PR4 (el `sourceId` resuelve a un chunk real). */
    provenanceVerified?: boolean;
    /** Procedencia cacheada del chunk (R3), o `sin-fuente-trazable`. */
    sourceProvenance?: AnchorSourceProvenance;
}

/**
 * Resultado cacheado de la verificación (PR2 + PR3). Se llena en ingest/revisión,
 * NUNCA por query en runtime (costo + determinismo). `versesExist` es
 * determinista; `refutes` es el veredicto del adjudicador.
 */
export interface AnchorVerification {
    versesExist: boolean;
    refutes: AnchorRefutesVerdict;
    adjudicatedAt?: string;
    modelTier?: string;
}

/** Entrada de `verifiedMisreadings/` — el set crítico curado a mano (ADR-036 §1). */
export interface VerifiedMisreading {
    schemaVersion: number;
    passageScope: MisreadingPassageScope;
    claim: string;
    whyWrong: string;
    severity: MisreadingSeverity;
    correctiveAnchors: CorrectiveAnchor[];
    reviewStatus: MisreadingReviewStatus;
    reviewedBy?: string;
    reviewedAt?: string;
    verification?: AnchorVerification;
    createdAt?: string;
}
