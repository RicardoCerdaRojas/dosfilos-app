import type {
    Extraction,
    ExtractionType,
    IExegeticalPaperRepository,
    IExtractionRepository,
    ISermonRepository,
    SermonEntity,
} from '@dosfilos/domain';

/**
 * Aggregated view of everything derived from a single exegetical paper.
 * Runs the two underlying queries in parallel and normalizes both
 * `Sermon` (canonical, lives in `sermons/{id}`) and `Extraction`
 * (snapshot, lives in `extractions/{id}`) into a single sortable list.
 *
 * Sermons stay first-class entities (wizard, scheduling, lifecycle); we
 * don't duplicate them as extractions. The merged read assembles the
 * panel at query time.
 *
 * Ownership: the paper must be owned by `ownerId`. The use case fails
 * loudly if not so a stale paperId from a client can't accidentally
 * surface someone else's data.
 */

export type DerivedArtifactKind =
    | 'sermon'
    | 'academic-paper'
    | 'sermon-outline'
    | 'devotional'
    | 'study-guide'
    | 'other-extraction';

export interface DerivedArtifact {
    id: string;
    kind: DerivedArtifactKind;
    title: string;
    createdAt: Date;
    /** True for sermons in `draft`/`working` status, useful for UI hints. */
    isDraft?: boolean;
}

export interface ListPaperDerivedArtifactsInput {
    ownerId: string;
    paperId: string;
}

export class ListPaperDerivedArtifactsUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private extractionRepository: IExtractionRepository,
        private sermonRepository: ISermonRepository,
    ) { }

    async execute(input: ListPaperDerivedArtifactsInput): Promise<DerivedArtifact[]> {
        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) {
            throw new Error('Paper no encontrado o sin permiso');
        }

        const [extractions, sermons] = await Promise.all([
            this.extractionRepository.listByExternalRef(input.ownerId, 'exegeticalPapers', input.paperId),
            this.sermonRepository.findBySourcePaperId(input.ownerId, input.paperId),
        ]);

        const merged: DerivedArtifact[] = [
            ...sermons.map(toSermonArtifact),
            ...extractions.map(toExtractionArtifact),
        ];
        merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return merged;
    }
}

function toSermonArtifact(sermon: SermonEntity): DerivedArtifact {
    return {
        id: sermon.id,
        kind: 'sermon',
        title: sermon.title || 'Sermón',
        createdAt: sermon.createdAt,
        isDraft: sermon.status === 'draft' || sermon.status === 'working',
    };
}

function toExtractionArtifact(extraction: Extraction): DerivedArtifact {
    return {
        id: extraction.id,
        kind: mapExtractionKind(extraction.type),
        title: extraction.title || 'Artefacto',
        createdAt: extraction.createdAt,
    };
}

function mapExtractionKind(type: ExtractionType): DerivedArtifactKind {
    switch (type) {
        case 'SYSTEMATIC_THEOLOGY_PAPER':
            return 'academic-paper';
        case 'SERMON_OUTLINE':
            return 'sermon-outline';
        case 'DEVOTIONAL':
            return 'devotional';
        case 'BIBLE_STUDY':
            return 'study-guide';
        default:
            return 'other-extraction';
    }
}
