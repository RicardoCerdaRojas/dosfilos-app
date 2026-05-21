import { describe, it, expect, vi } from 'vitest';
import { RepurposeSermonUseCase } from '../RepurposeSermonUseCase';
import type {
    Extraction,
    IExtractionRepository,
    ISermonRepository,
    ISermonRepurposer,
    SermonEntity,
} from '@dosfilos/domain';

function makeSermon(overrides: Partial<SermonEntity> = {}): SermonEntity {
    return {
        id: 'sermon-1',
        userId: 'user-1',
        title: 'Vivir como extranjeros',
        content: '# Sermón\n\nCuerpo del sermón con análisis exegético y aplicaciones.',
        bibleReferences: ['1 Pedro 2:11-17'],
        tags: [],
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
        isShared: false,
        authorName: 'Pastor',
        preachingHistory: [],
        projectId: 'project-7',
        ...overrides,
    } as SermonEntity;
}

function makeMocks() {
    const sermonRepo: ISermonRepository = {
        findById: vi.fn(),
    } as unknown as ISermonRepository;
    const extractionRepo: IExtractionRepository = {
        create: vi.fn(),
    } as unknown as IExtractionRepository;
    const repurposer: ISermonRepurposer = {
        repurpose: vi.fn(),
    };
    return { sermonRepo, extractionRepo, repurposer };
}

describe('RepurposeSermonUseCase', () => {
    it('throws when sermon does not exist', async () => {
        const { sermonRepo, extractionRepo, repurposer } = makeMocks();
        (sermonRepo.findById as any).mockResolvedValue(null);
        const useCase = new RepurposeSermonUseCase(sermonRepo, extractionRepo, repurposer);
        await expect(
            useCase.execute({ actorUserId: 'user-1', sermonId: 'sermon-1', kind: 'devotional' }),
        ).rejects.toThrow('Sermón no encontrado');
    });

    it('throws when actor does not own the sermon', async () => {
        const { sermonRepo, extractionRepo, repurposer } = makeMocks();
        (sermonRepo.findById as any).mockResolvedValue(makeSermon({ userId: 'someone-else' }));
        const useCase = new RepurposeSermonUseCase(sermonRepo, extractionRepo, repurposer);
        await expect(
            useCase.execute({ actorUserId: 'user-1', sermonId: 'sermon-1', kind: 'devotional' }),
        ).rejects.toThrow('No tienes acceso a este sermón');
    });

    it('throws when sermon has no content body', async () => {
        const { sermonRepo, extractionRepo, repurposer } = makeMocks();
        (sermonRepo.findById as any).mockResolvedValue(makeSermon({ content: '   ' }));
        const useCase = new RepurposeSermonUseCase(sermonRepo, extractionRepo, repurposer);
        await expect(
            useCase.execute({ actorUserId: 'user-1', sermonId: 'sermon-1', kind: 'devotional' }),
        ).rejects.toThrow('El sermón no tiene contenido');
    });

    it('persists devotional as DEVOTIONAL extraction with sermon externalRef', async () => {
        const { sermonRepo, extractionRepo, repurposer } = makeMocks();
        (sermonRepo.findById as any).mockResolvedValue(makeSermon());
        (repurposer.repurpose as any).mockResolvedValue({
            markdown: '# Devotional\n\n...',
            title: 'Daily devotional — Vivir como extranjeros',
            modelId: 'gemini-2.5-flash',
            tokensUsed: 1234,
        });
        const expected: Extraction = {
            id: 'ext-1',
            userId: 'user-1',
            sessionId: null,
            projectIds: ['project-7'],
            type: 'DEVOTIONAL',
            title: 'Daily devotional — Vivir como extranjeros',
            markdown: '# Devotional\n\n...',
            createdAt: new Date(),
            updatedAt: new Date(),
            derivedFromMessageIds: [],
            externalRef: { collection: 'sermons', id: 'sermon-1' },
            version: 1,
        };
        (extractionRepo.create as any).mockResolvedValue(expected);

        const useCase = new RepurposeSermonUseCase(sermonRepo, extractionRepo, repurposer);
        const result = await useCase.execute({
            actorUserId: 'user-1', sermonId: 'sermon-1', kind: 'devotional',
        });

        expect(result).toBe(expected);
        expect(repurposer.repurpose).toHaveBeenCalledWith('devotional', expect.objectContaining({
            sermonTitle: 'Vivir como extranjeros',
            passage: '1 Pedro 2:11-17',
            sermonMarkdown: expect.stringContaining('# Sermón'),
        }));
        expect(extractionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            sessionId: null,
            type: 'DEVOTIONAL',
            externalRef: { collection: 'sermons', id: 'sermon-1' },
            projectIds: ['project-7'],
        }));
    });

    it('maps study-guide kind to BIBLE_STUDY extraction type', async () => {
        const { sermonRepo, extractionRepo, repurposer } = makeMocks();
        (sermonRepo.findById as any).mockResolvedValue(makeSermon({ projectId: undefined }));
        (repurposer.repurpose as any).mockResolvedValue({
            markdown: '# Guía\n\n...', title: 'Guía de estudio', modelId: 'x', tokensUsed: null,
        });
        (extractionRepo.create as any).mockResolvedValue({} as Extraction);

        const useCase = new RepurposeSermonUseCase(sermonRepo, extractionRepo, repurposer);
        await useCase.execute({ actorUserId: 'user-1', sermonId: 'sermon-1', kind: 'study-guide' });

        expect(extractionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            type: 'BIBLE_STUDY',
            projectIds: [],
        }));
    });

    it('falls back to JSON-stringified draft when content is empty', async () => {
        const { sermonRepo, extractionRepo, repurposer } = makeMocks();
        (sermonRepo.findById as any).mockResolvedValue(makeSermon({
            content: '',
            wizardProgress: { draft: { title: 'X', body: [{ point: 'p1', content: 'c1' }] } } as any,
        }));
        (repurposer.repurpose as any).mockResolvedValue({
            markdown: 'x', title: 'x', modelId: 'x', tokensUsed: null,
        });
        (extractionRepo.create as any).mockResolvedValue({} as Extraction);

        const useCase = new RepurposeSermonUseCase(sermonRepo, extractionRepo, repurposer);
        await useCase.execute({ actorUserId: 'user-1', sermonId: 'sermon-1', kind: 'devotional' });

        expect(repurposer.repurpose).toHaveBeenCalledWith('devotional', expect.objectContaining({
            sermonMarkdown: expect.stringContaining('"point":"p1"'),
        }));
    });
});
