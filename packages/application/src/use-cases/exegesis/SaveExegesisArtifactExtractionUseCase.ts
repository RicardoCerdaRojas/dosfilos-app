import type {
    Extraction,
    ExtractionType,
    IExegeticalPaperRepository,
    IExtractionRepository,
} from '@dosfilos/domain';

/**
 * Composition artifacts produced from an exegetical paper (academic
 * paper, ministry sermon, devotional, study guide) used to vanish when
 * the user closed the dialog — they were generated in-memory and only
 * exposed via copy/download. This use case persists them in the
 * top-level `extractions/` collection so they show up in "Mis Recursos"
 * and the per-paper "Artefactos derivados" panel (Phase C of the
 * paper→artifacts convergence roadmap).
 *
 * Schema decisions:
 *   - `sessionId` is `null` — these artifacts have no Faculty session
 *     of origin. The `IExtractionRepository.orphanBySession` path
 *     simply doesn't apply.
 *   - `externalRef` is `{ collection: 'exegeticalPapers', id }` so
 *     the artifact carries the back-reference to the paper. The
 *     paper's `usePaperDerivedArtifacts` hook (Phase C) queries by
 *     this field.
 *   - `derivedFromMessageIds` is `[]` — no chat-message provenance to
 *     point back to. The paper itself is the provenance.
 *
 * The use case validates ownership of the paper before writing so a
 * stale paperId from the client doesn't create artifacts pointing at
 * someone else's paper.
 */

export type ExegesisArtifactType =
    // Academic composition (Componer paper académico).
    | 'academic-paper'
    // Ministry composition formats.
    | 'sermon-outline'
    | 'devotional'
    | 'study-guide';

export interface SaveExegesisArtifactExtractionInput {
    ownerId: string;
    paperId: string;
    artifactType: ExegesisArtifactType;
    title: string;
    markdown: string;
}

export class SaveExegesisArtifactExtractionUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private extractionRepository: IExtractionRepository,
    ) { }

    async execute(input: SaveExegesisArtifactExtractionInput): Promise<Extraction> {
        if (!input.ownerId) throw new Error('SaveExegesisArtifactExtractionUseCase: ownerId required');
        if (!input.paperId) throw new Error('SaveExegesisArtifactExtractionUseCase: paperId required');
        if (!input.markdown?.trim()) {
            throw new Error('SaveExegesisArtifactExtractionUseCase: markdown is empty');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) {
            throw new Error('Paper no encontrado o sin permiso');
        }

        return this.extractionRepository.create({
            userId: input.ownerId,
            sessionId: null,
            type: mapToExtractionType(input.artifactType),
            title: input.title.trim() || paper.title || 'Artefacto',
            markdown: input.markdown,
            derivedFromMessageIds: [],
            externalRef: {
                collection: 'exegeticalPapers',
                id: input.paperId,
            },
        });
    }
}

function mapToExtractionType(artifactType: ExegesisArtifactType): ExtractionType {
    switch (artifactType) {
        case 'academic-paper':
            return 'SYSTEMATIC_THEOLOGY_PAPER';
        case 'sermon-outline':
            return 'SERMON_OUTLINE';
        case 'devotional':
            return 'DEVOTIONAL';
        case 'study-guide':
            return 'BIBLE_STUDY';
    }
}
