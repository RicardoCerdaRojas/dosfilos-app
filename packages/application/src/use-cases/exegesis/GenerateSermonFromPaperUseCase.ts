import {
    SermonEntity,
    SermonSeriesEntity,
    type IExegeticalPaperRepository,
    type IPaperToSermonTransformer,
    type ISermonRepository,
    type ISeriesRepository,
    type PaperToSermonTone,
} from '@dosfilos/domain';
import { ExegesisCreditReservation } from '../../services/ExegesisCreditReservation';
import { buildWizardProgressFromPaper } from './paperToWizardProgress';

/**
 * Generates a sermon draft from an assembled exegetical paper.
 *
 * Preconditions enforced here:
 *   - The paper exists and belongs to the actor (ownership check).
 *   - The paper is in 'assembled' phase with non-null `assembledMarkdown`.
 *     Earlier phases mean the user is still iterating; transforming an
 *     unfinished paper would produce a half-baked sermon and waste
 *     tokens.
 *
 * The transformer (Gemini Pro 2.5 with thinking, in v1) does the actual
 * conversion. The use case only wires inputs from the paper, persists
 * the result as a draft sermon with `sourcePaperId` set, and returns
 * the new sermon id so the UI can navigate to it.
 *
 * The created sermon starts in 'draft' status (not 'working') because
 * the user already has a fully-articulated body — they can edit before
 * publishing, but they're past the wizard-style scratch stage.
 *
 * Pipeline convergence (2026-05-19): in addition to writing
 * `sermon.content` for the legacy sermon-detail surface, this use case
 * now populates `sermon.wizardProgress` so the wizard (Pipeline B) can
 * resume the just-generated sermon at Step 3 (Redacción) with all
 * upstream steps pre-loaded from the paper. The caller navigates to
 * `/dashboard/sermons/generate?id={sermonId}` instead of the static
 * sermon detail page, giving the user one unified refinement surface
 * that respects the paper's exegetical work.
 *
 * When the paper carries `seriesId` + `pericopeId` (denormalized at
 * paper-creation time by the planner), this use case ALSO patches
 * `series.metadata.plannedSermons[*].draftId` so the planner stops
 * offering "Iniciar borrador" for that pericope — the just-generated
 * sermon takes that slot. It also stamps `seriesId` on the sermon
 * itself so the bidirectional link is complete.
 *
 * The series patch is best-effort: a series-repo failure does NOT roll
 * back the sermon creation (the sermon is the authoritative artifact
 * and is already saved). Failures are logged so the planner drift can
 * be detected and reconciled out-of-band.
 */
export interface GenerateSermonFromPaperInput {
    paperId: string;
    actorUserId: string;
    tone: PaperToSermonTone;
}

export interface GenerateSermonFromPaperOutput {
    sermonId: string;
    modelId: string;
    tokensUsed: number | null;
}

export class GenerateSermonFromPaperUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private sermonRepository: ISermonRepository,
        private transformer: IPaperToSermonTransformer,
        // Optional: when wired, the use case patches the originating
        // series' planned-sermon entry after the sermon is created.
        // Left optional so consumers that don't care about series
        // coherence (e.g. standalone tests) can still construct the
        // use case without a series dependency.
        private seriesRepository?: ISeriesRepository,
    ) {}

    async execute(input: GenerateSermonFromPaperInput): Promise<GenerateSermonFromPaperOutput> {
        const paper = await this.paperRepository.getPaper(input.actorUserId, input.paperId);
        if (!paper) {
            throw new Error('Paper no encontrado o sin permiso');
        }
        if (paper.phase !== 'assembled') {
            throw new Error(
                'El paper debe estar ensamblado antes de generar un sermón',
            );
        }
        if (!paper.assembledMarkdown) {
            throw new Error('El paper no tiene contenido ensamblado');
        }

        const reservation = await ExegesisCreditReservation.open(
            input.actorUserId,
            'generateSermonFromPaper',
        );

        try {
            reservation.markLlmContacted();
            const result = await this.transformer.transform({
                paperPassage: paper.passage,
                paperTitle: paper.title ?? null,
                assignmentBrief: paper.assignmentBrief,
                assembledMarkdown: paper.assembledMarkdown,
                tone: input.tone,
                language: paper.displayLanguage,
            });

            // Pre-populate the wizard state so the user lands in the
            // refinement surface (Step 3 / Redacción) with the paper's
            // exegesis + the transformer output ready to publish or
            // refine. Each Step in the wizard inspects
            // `wizardProgress.paperContext` to render a "Pre-cargado
            // desde paper {X}" banner.
            const wizardProgress = buildWizardProgressFromPaper({
                paper,
                transformerOutput: result,
                tone: input.tone,
            });

            const sermon = SermonEntity.create({
                userId: paper.ownerId,
                title: result.title,
                // `content` stays populated for back-compat: legacy
                // sermon-detail page reads this field, and the
                // unified artifacts panel surfaces it as a quick
                // preview. The wizard reads `wizardProgress.draft`
                // instead.
                content: result.content,
                bibleReferences: result.bibleReferences,
                sourcePaperId: paper.id,
                // Mirror the paper's series back-reference onto the
                // sermon so cross-collection queries (and the planner)
                // can resolve the relationship from either side.
                seriesId: paper.seriesId ?? undefined,
                status: 'draft',
                wizardProgress,
            });

            await this.sermonRepository.create(sermon);

            await this.patchSeriesPlannedSermon(paper.seriesId, paper.pericopeId, sermon.id);

            return {
                sermonId: sermon.id,
                modelId: result.modelId,
                tokensUsed: result.tokensUsed,
            };
        } catch (err) {
            await reservation.refundIfPreLlm();
            throw err;
        }
    }

    /**
     * Best-effort planner-coherence patch. When the paper was created
     * from a series pericope, find that pericope in
     * `series.metadata.plannedSermons[]` and stamp `draftId` +
     * `status: 'sermon-in-progress'` so the UI stops offering "Iniciar
     * borrador" for it.
     *
     * Silent on missing inputs (standalone paper) or missing repo
     * (untyped consumers). Logs and swallows failures — the sermon
     * doc is already saved and is the source of truth; planner drift
     * can be reconciled later without losing user work.
     */
    private async patchSeriesPlannedSermon(
        seriesId: string | null | undefined,
        pericopeId: string | null | undefined,
        sermonId: string,
    ): Promise<void> {
        if (!this.seriesRepository || !seriesId || !pericopeId) return;
        try {
            const series = await this.seriesRepository.findById(seriesId);
            if (!series) return;
            const plannedSermons = series.metadata?.plannedSermons ?? [];
            const idx = plannedSermons.findIndex(p => p.id === pericopeId);
            if (idx === -1) return;
            const target = plannedSermons[idx];
            // Don't clobber an existing draftId — the user may have
            // started a separate manual draft for the same pericope
            // before generating from paper. Leave the first one
            // pinned; the unified artifacts panel (Phase C) will
            // surface both.
            if (target.draftId) return;
            const updatedPlanned = plannedSermons.map((p, i) =>
                i === idx
                    ? { ...p, draftId: sermonId, status: 'sermon-in-progress' as const }
                    : p,
            );
            const next = SermonSeriesEntity.create({
                id: series.id,
                userId: series.userId,
                title: series.title,
                description: series.description,
                sermonIds: series.sermonIds,
                draftIds: [...(series.draftIds ?? []), sermonId],
                type: series.type,
                resourceIds: series.resourceIds,
                startDate: series.startDate,
                coverUrl: series.coverUrl,
                endDate: series.endDate,
                metadata: { ...series.metadata, plannedSermons: updatedPlanned },
            });
            await this.seriesRepository.update(next);
        } catch (err) {
            console.warn(
                `[GenerateSermonFromPaperUseCase] series patch failed for series=${seriesId} pericope=${pericopeId}:`,
                err,
            );
        }
    }
}
