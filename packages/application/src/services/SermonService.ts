import { FirebaseSermonRepository, AnalyticsService } from '@dosfilos/infrastructure';
import {
    SermonEntity,
    FindOptions,
    Sermon,
    evaluatePublishGate,
    FidelityGateError,
    type GateOverride,
    type PublishOverrideInput,
} from '@dosfilos/domain';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';

export class SermonService {
    private sermonRepository: FirebaseSermonRepository;

    constructor() {
        this.sermonRepository = new FirebaseSermonRepository();
    }

    async createSermon(data: {
        userId: string;
        title: string;
        content: string;
        bibleReferences?: string[];
        tags?: string[];
        category?: string;
        status?: 'working' | 'draft' | 'published' | 'archived';
        authorName?: string;
        seriesId?: string;
        scheduledDate?: Date;
        wizardProgress?: Sermon['wizardProgress'];
        sourceFacultySessionId?: string;
        sourcePaperId?: string;
        projectId?: string;
    }): Promise<SermonEntity> {
        try {
            const sermon = SermonEntity.create({
                userId: data.userId,
                title: data.title,
                content: data.content,
                bibleReferences: data.bibleReferences || [],
                tags: data.tags || [],
                category: data.category,
                status: data.status || 'draft',
                isShared: false,
                authorName: data.authorName || 'Pastor',
                seriesId: data.seriesId,
                scheduledDate: data.scheduledDate,
                wizardProgress: data.wizardProgress,
                sourceFacultySessionId: data.sourceFacultySessionId,
                sourcePaperId: data.sourcePaperId,
                projectId: data.projectId,
            });
            const createdSermon = await this.sermonRepository.create(sermon);

            // Track sermon creation
            AnalyticsService.trackSermonCreated(
                createdSermon.id,
                data.bibleReferences?.[0] || 'Unknown'
            ).catch(err => console.warn('[SermonService] Failed to track sermon creation:', err));

            return createdSermon;
        } catch (error: any) {
            throw new Error(error.message || 'Error al crear el sermón');
        }
    }

    async updateSermon(
        id: string,
        data: Partial<{
            title: string;
            content: string;
            bibleReferences: string[];
            tags: string[];
            category: string;
            status: 'working' | 'draft' | 'published' | 'archived';
            seriesId: string;
            scheduledDate: Date;
            wizardProgress: any;
            preachingHistory: any[];
            /** Phase 2.5 PR C (ADR-027) — gate snapshot embedded at generation time. */
            studyDepthSnapshot: import('@dosfilos/domain').StudyDepthSnapshot;
        }>
    ): Promise<SermonEntity> {
        try {
            const sermon = await this.sermonRepository.findById(id);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }
            const updatedSermon = sermon.update(data);
            return await this.sermonRepository.update(updatedSermon);
        } catch (error: any) {
            throw new Error(error.message || 'Error al actualizar el sermón');
        }
    }

    async deleteSermon(id: string): Promise<void> {
        try {
            await this.sermonRepository.delete(id);
        } catch (error: any) {
            throw new Error(error.message || 'Error al eliminar el sermón');
        }
    }

    /**
     * Links (or unlinks, when `projectId` is null) a sermon to a faculty project.
     * Encapsulates the persistence so UI components don't import Firestore directly.
     */
    async linkSermonToProject(sermonId: string, projectId: string | null): Promise<SermonEntity> {
        const sermon = await this.sermonRepository.findById(sermonId);
        if (!sermon) {
            throw new Error('Sermón no encontrado');
        }
        const updated = sermon.update({ projectId: projectId ?? undefined });
        return await this.sermonRepository.update(updated);
    }

    async getSermon(id: string): Promise<SermonEntity | null> {
        try {
            return await this.sermonRepository.findById(id);
        } catch (error: any) {
            throw new Error(error.message || 'Error al obtener el sermón');
        }
    }

    async getUserSermons(userId: string, options?: FindOptions): Promise<SermonEntity[]> {
        try {
            return await this.sermonRepository.findByUserId(userId, options);
        } catch (error: any) {
            throw new Error(error.message || 'Error al obtener los sermones');
        }
    }

    async publishSermon(id: string, override?: PublishOverrideInput): Promise<SermonEntity> {
        try {
            const sermon = await this.sermonRepository.findById(id);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }
            await this.enforceFidelityGate(sermon, override);
            const publishedSermon = sermon.publish();
            return await this.sermonRepository.update(publishedSermon);
        } catch (error: any) {
            // Preserve the typed gate refusal so the UI can map `reason` to
            // the right confrontation copy (Phase 3 PR 2, ADR-029).
            if (error instanceof FidelityGateError) throw error;
            throw new Error(error.message || 'Error al publicar el sermón');
        }
    }

    /**
     * Pastoral Fidelity — Phase 3 PR 2 (ADR-029 §Q3/Q5). Enforces the
     * claim↔source fidelity gate before a sermon publishes.
     *
     * Defense-in-depth: the editor runs the fidelity pass and confronts the
     * pastor before calling publish, but this service is the choke point that
     * actually refuses a blocked publish so the UI flow cannot be bypassed.
     *
     * The gate only bites when a `fidelityReport` is present on the sermon —
     * with the `fidelity_pass` flag off, no report is ever generated, so
     * publish behaves exactly as before (blast radius 0). When the pastor
     * clears a soft-block, the supplied `GateOverride` is stamped + persisted
     * onto the report as the permanent audit record.
     */
    private async enforceFidelityGate(
        sermon: SermonEntity,
        override?: PublishOverrideInput,
    ): Promise<void> {
        const report = sermon.fidelityReport;
        if (!report) return;

        const decision = evaluatePublishGate(report.gateStatus, override);
        if (!decision.allowed) {
            throw new FidelityGateError(decision.reason);
        }

        if (decision.reason === 'soft-block-overridden' && override) {
            const stamped: GateOverride = {
                reason: override.reason.trim(),
                overriddenBy: override.overriddenBy,
                bypassedKind: override.bypassedKind,
                overriddenAt: new Date(),
            };
            await this.sermonRepository.updateFidelityReport(sermon.id, {
                ...report,
                gateOverride: stamped,
            });
            // Keep the in-memory entity consistent for the subsequent publish.
            sermon.fidelityReport = { ...report, gateOverride: stamped };
        }
    }

    /**
     * Creates a published COPY of the draft sermon.
     * The original draft remains untouched (status='working')but tracks the publication.
     * The copy has a new ID and status='published'.
     * @returns The newly created published sermon copy
     */
    async publishSermonAsCopy(draftId: string, override?: PublishOverrideInput): Promise<SermonEntity> {
        try {
            const draft = await this.sermonRepository.findById(draftId);
            if (!draft) {
                throw new Error('Borrador no encontrado');
            }

            // Fidelity gate (Phase 3 PR 2, ADR-029). The wizard publishes via
            // this copy path; the override + audit attach to the draft's report.
            await this.enforceFidelityGate(draft, override);

            // Create a published copy using the entity method
            const publishedCopy = draft.publishAsCopy();

            // Save the copy as a new sermon
            const createdCopy = await this.sermonRepository.create(publishedCopy);

            // Update the draft to track this published copy
            if (draft.wizardProgress) {
                const currentCount = draft.wizardProgress.publishCount || 0;
                const updatedProgress = {
                    ...draft.wizardProgress,
                    publishedCopyId: createdCopy.id,
                    lastPublishedAt: new Date(),
                    publishCount: currentCount + 1
                };

                const updatedDraft = draft.update({ wizardProgress: updatedProgress });
                await this.sermonRepository.update(updatedDraft);
            }

            return createdCopy;
        } catch (error: any) {
            if (error instanceof FidelityGateError) throw error;
            throw new Error(error.message || 'Error al publicar el sermón');
        }
    }

    async archiveSermon(id: string): Promise<SermonEntity> {
        try {
            const sermon = await this.sermonRepository.findById(id);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }
            const archivedSermon = sermon.archive();
            return await this.sermonRepository.update(archivedSermon);
        } catch (error: any) {
            throw new Error(error.message || 'Error al archivar el sermón');
        }
    }

    async shareSermon(id: string): Promise<string> {
        try {
            const sermon = await this.sermonRepository.findById(id);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }
            const sharedSermon = sermon.enableSharing();
            await this.sermonRepository.update(sharedSermon);
            return sharedSermon.shareToken!;
        } catch (error: any) {
            throw new Error(error.message || 'Error al compartir el sermón');
        }
    }

    async unshareSermon(id: string): Promise<void> {
        try {
            const sermon = await this.sermonRepository.findById(id);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }
            const unsharedSermon = sermon.disableSharing();
            await this.sermonRepository.update(unsharedSermon);
        } catch (error: any) {
            throw new Error(error.message || 'Error al dejar de compartir el sermón');
        }
    }

    async getSharedSermon(token: string): Promise<SermonEntity | null> {
        try {
            return await this.sermonRepository.findByShareToken(token);
        } catch (error: any) {
            throw new Error(error.message || 'Error al obtener el sermón compartido');
        }
    }

    // Wizard-specific methods
    async createDraft(data: {
        userId: string;
        passage: string;
        wizardProgress?: Sermon['wizardProgress'];
        /** Optional: link this sermon to a project workspace from creation. */
        projectId?: string;
    }): Promise<string> {
        try {
            const sermon = SermonEntity.create({
                userId: data.userId,
                title: `Sermón sobre ${data.passage}`,
                content: '', // Empty until final draft
                bibleReferences: [data.passage],
                tags: [],
                status: 'draft', // 🎯 Using 'draft' for wizard in-progress sermons
                isShared: false,
                authorName: 'Pastor',
                wizardProgress: data.wizardProgress || {
                    currentStep: 1,
                    passage: data.passage,
                    lastSaved: new Date()
                },
                projectId: data.projectId,
            });
            const created = await this.sermonRepository.create(sermon);
            return created.id;
        } catch (error: any) {
            throw new Error(error.message || 'Error al crear borrador de sermón');
        }
    }

    async getInProgressSermons(userId: string): Promise<SermonEntity[]> {
        try {
            // Get ALL sermons (drafts, published, archived) to include those with wizardProgress
            // This allows users to continue editing published sermons in the wizard
            const sermons = await this.sermonRepository.findByUserId(userId, {
                // Removed status filter to include published sermons with wizardProgress
                limit: 50, // Increased to show more sermons
                orderBy: 'updatedAt',
                order: 'desc'
            });

            // Filter sermons that have wizardProgress (includes drafts and published sermons)
            return sermons.filter(s => s.wizardProgress !== undefined);
        } catch (error: any) {
            throw new Error(error.message || 'Error al obtener sermones en progreso');
        }
    }

    async updateWizardProgress(
        sermonId: string,
        progress: Sermon['wizardProgress']
    ): Promise<void> {
        try {
            const sermon = await this.sermonRepository.findById(sermonId);
            if (!sermon) {
                throw new Error('Sermón no encontrado');
            }

            // 🎯 Clean undefined values from progress (Firestore doesn't accept undefined)
            const cleanedProgress = this.removeUndefinedFields(progress);

            const updated = sermon.update({ wizardProgress: cleanedProgress });
            await this.sermonRepository.update(updated);
        } catch (error: any) {
            throw new Error(error.message || 'Error al actualizar progreso del wizard');
        }
    }

    /**
     * Recursively removes undefined fields from an object and handles Date conversion
     * Firestore doesn't accept undefined values and needs proper Date objects
     */
    private removeUndefinedFields(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Handle Date objects - convert to JavaScript Date
        if (obj instanceof Date) {
            return obj;
        }

        // Handle Date-like objects (with seconds/nanoseconds from Firestore)
        if (obj && typeof obj === 'object' && 'seconds' in obj && 'nanoseconds' in obj) {
            return new Date(obj.seconds * 1000);
        }

        // Handle string dates
        if (typeof obj === 'string') {
            const dateTest = new Date(obj);
            if (!isNaN(dateTest.getTime()) && obj.includes('T')) {
                return dateTest;
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.removeUndefinedFields(item));
        }

        if (typeof obj === 'object') {
            const cleaned: any = {};
            for (const key in obj) {
                const value = obj[key];
                if (value !== undefined) {
                    // Special handling for lastSaved field
                    if (key === 'lastSaved' && value) {
                        if (value instanceof Date) {
                            cleaned[key] = value;
                        } else if (typeof value === 'object' && 'seconds' in value) {
                            cleaned[key] = new Date(value.seconds * 1000);
                        } else {
                            cleaned[key] = new Date(value);
                        }
                    } else {
                        cleaned[key] = this.removeUndefinedFields(value);
                    }
                }
            }
            return cleaned;
        }

        return obj;
    }

    async getPublishedVersions(draftId: string, userId: string): Promise<SermonEntity[]> {
        return await this.sermonRepository.findByDraftId(draftId, userId);
    }

    /**
     * Reads the canvas annotation snapshot persisted under
     * `sermons/{id}/annotations/main`. Returns the parsed snapshot
     * object (the engine-specific type lives in the web adapter; the
     * service deals in opaque `unknown` so the domain doesn't depend
     * on the drawing engine). Falls back to the legacy `snapshot`
     * field for pre-JSON migration docs.
     */
    async getAnnotationSnapshot(sermonId: string): Promise<unknown | null> {
        const db = getFirestore();
        const snap = await getDoc(doc(db, 'sermons', sermonId, 'annotations', 'main'));
        if (!snap.exists()) return null;
        const data = snap.data();
        if (data?.snapshotJSON) {
            try {
                return JSON.parse(data.snapshotJSON as string);
            } catch (err) {
                console.error('[SermonService] Failed to parse annotation JSON:', err);
                return null;
            }
        }
        if (data?.snapshot) return data.snapshot;
        return null;
    }

    /**
     * Persists an annotation snapshot. Stored as a JSON string
     * because Firestore rejects nested arrays (which tldraw / canvas
     * snapshots produce). Caller (the React hook) debounces writes —
     * the service is a pure boundary.
     */
    async saveAnnotationSnapshot(sermonId: string, snapshot: unknown): Promise<void> {
        const db = getFirestore();
        await setDoc(doc(db, 'sermons', sermonId, 'annotations', 'main'), {
            snapshotJSON: JSON.stringify(snapshot),
            updatedAt: new Date(),
        });
    }
}

// Singleton instance
export const sermonService = new SermonService();
