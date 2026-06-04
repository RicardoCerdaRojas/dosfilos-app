import { SermonEntity } from '../entities/Sermon';
import type { FidelityReport } from '../entities/FidelityReport';
import type { ContraScanReport } from '../entities/ContraScanReport';

export interface ISermonRepository {
    create(sermon: SermonEntity): Promise<SermonEntity>;
    update(sermon: SermonEntity): Promise<SermonEntity>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<SermonEntity | null>;
    findByShareToken(token: string): Promise<SermonEntity | null>;
    findByUserId(userId: string, options?: FindOptions): Promise<SermonEntity[]>;
    /**
     * Trimmed list read for the dashboard — same query as `findByUserId` but
     * returns sermons WITHOUT the heavy fields (`content`, the wizard
     * draft/outline, `citationManifest`, `fidelityReport`,
     * `studyDepthSnapshot`). `wizardProgress` is reduced to
     * `{ currentStep, lastSaved }` so the list's wizard-draft check still
     * works. The full sermon loads via `findById` when one is opened.
     */
    findSummariesByUserId(userId: string, options?: FindOptions): Promise<SermonEntity[]>;
    findAll(options?: FindOptions): Promise<SermonEntity[]>;
    findByDraftId(draftId: string, userId: string): Promise<SermonEntity[]>;
    /**
     * Returns all sermons whose `sourcePaperId` points to the given
     * exegetical paper. Powers the per-paper "Artefactos derivados"
     * panel — every sermon spawned from a paper appears here regardless
     * of which surface (paper detail / planner / dashboard) triggered
     * the generation. Ownership filter mirrors the other queries.
     */
    findBySourcePaperId(userId: string, paperId: string): Promise<SermonEntity[]>;
    /**
     * Phase 3 PR 1 (ADR-029) — Focused write for the fidelity pass
     * result. Avoids round-tripping the full sermon doc when the only
     * thing that changed is the embedded `fidelityReport`. Implementations
     * should patch the single field server-side without re-validating
     * the rest of the sermon.
     */
    updateFidelityReport(sermonId: string, report: FidelityReport): Promise<void>;
    /**
     * Phase 4 PR 1 (ADR-033) — Focused write for the contra-scan
     * confrontation result. Mirrors `updateFidelityReport`: patches the
     * single embedded `contraScanReport` field without re-validating the
     * rest of the sermon. The permanent P3 audit trail.
     */
    updateContraScanReport(sermonId: string, report: ContraScanReport): Promise<void>;
}

export interface FindOptions {
    limit?: number;
    offset?: number;
    orderBy?: 'createdAt' | 'updatedAt' | 'title';
    order?: 'asc' | 'desc';
    status?: 'working' | 'draft' | 'published' | 'archived';
    tags?: string[];
    category?: string;
}
