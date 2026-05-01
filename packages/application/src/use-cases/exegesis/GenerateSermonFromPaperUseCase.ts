import {
    SermonEntity,
    type IExegeticalPaperRepository,
    type IPaperToSermonTransformer,
    type ISermonRepository,
    type PaperToSermonTone,
} from '@dosfilos/domain';

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
 * The use case does NOT auto-link the sermon to a series. If the paper
 * was created from a series pericope, the caller (web layer) is
 * responsible for updating the series' `plannedSermon.draftId` after
 * this returns. Keeping that out of here avoids a circular dependency
 * on `ISeriesRepository`.
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

        const result = await this.transformer.transform({
            paperPassage: paper.passage,
            paperTitle: paper.title ?? null,
            assignmentBrief: paper.assignmentBrief,
            assembledMarkdown: paper.assembledMarkdown,
            tone: input.tone,
            language: paper.displayLanguage,
        });

        const sermon = SermonEntity.create({
            userId: paper.ownerId,
            title: result.title,
            content: result.content,
            bibleReferences: result.bibleReferences,
            sourcePaperId: paper.id,
            status: 'draft',
        });

        await this.sermonRepository.create(sermon);

        return {
            sermonId: sermon.id,
            modelId: result.modelId,
            tokensUsed: result.tokensUsed,
        };
    }
}
