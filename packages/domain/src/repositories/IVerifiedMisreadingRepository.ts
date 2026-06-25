/**
 * ADR-036 PR4 — puerto de lectura del set crítico curado (`verifiedMisreadings/`).
 *
 * SOLO lectura: las escrituras (ingest + review) fluyen por las Cloud Functions
 * role-gated (`ingestVerifiedMisreading` / `reviewVerifiedMisreading`), nunca
 * por el cliente. La admin tab lista la cola; el merge (PR5) consulta por pasaje.
 */

import type { MisreadingPassageScope, MisreadingReviewStatus, VerifiedMisreading } from '../entities/VerifiedMisreading';

/** Una entrada con su id de documento. */
export type VerifiedMisreadingRecord = VerifiedMisreading & { id: string };

export interface IVerifiedMisreadingRepository {
    /** Cola de revisión / set revisado, por estado. */
    listByStatus(status: MisreadingReviewStatus): Promise<VerifiedMisreadingRecord[]>;
    /** Una entrada por id. */
    getById(id: string): Promise<VerifiedMisreadingRecord | null>;
    /** Entradas que aplican a un pasaje (libro + solape de versos). Para el merge (PR5). */
    listByPassage(scope: MisreadingPassageScope): Promise<VerifiedMisreadingRecord[]>;
}
