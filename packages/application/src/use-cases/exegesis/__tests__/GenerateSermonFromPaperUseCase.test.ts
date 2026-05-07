import { describe, it, expect, vi } from 'vitest';
import {
    SermonEntity,
    type ExegeticalPaper,
    type IExegeticalPaperRepository,
    type IPaperToSermonTransformer,
    type ISermonRepository,
    type PaperToSermonInput,
    type PaperToSermonOutput,
} from '@dosfilos/domain';

// Mock the credit reservation singleton so the test doesn't need to
// initialize Firebase. Fase 2 of the EXEGESIS_PRICING roadmap wires
// reservation into this UC; the test focuses on transformer + repo
// orchestration, not on quota accounting (covered by the
// ProcessingBalanceService tests).
vi.mock('../../../services/ExegesisCreditReservation', () => ({
    ExegesisCreditReservation: {
        open: vi.fn(async () => ({
            markLlmContacted: vi.fn(),
            refundIfPreLlm: vi.fn(async () => { }),
            costUsd: 0,
        })),
    },
}));

import { GenerateSermonFromPaperUseCase } from '../GenerateSermonFromPaperUseCase';

// Minimal fake paper sufficient to drive the use case. Fields not
// consumed by the transformer/use case are stubbed with empty values.
const makePaper = (overrides: Partial<ExegeticalPaper> = {}): ExegeticalPaper => ({
    id: 'paper-1',
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    passage: { book: '2 Pedro', chapter: 1, verseStart: 1, verseEnd: 11 } as any,
    displayLanguage: 'es',
    title: 'Llamados firmes',
    assignmentBrief: 'Argumentar la perseverancia',
    styleGuideId: 'sg-1',
    sources: [],
    rubric: null,
    stepPlan: { perStep: [] } as any,
    phase: 'assembled',
    steps: [],
    currentStepId: null,
    assembledMarkdown: '# Paper\n\nContenido completo del paper.',
    archivedAt: null,
    ...overrides,
});

const stubPaperRepo = (paper: ExegeticalPaper | null): IExegeticalPaperRepository =>
    ({
        getPaper: vi.fn(async () => paper),
    }) as any;

const stubTransformer = (
    output: Partial<PaperToSermonOutput> = {},
): IPaperToSermonTransformer => ({
    transform: vi.fn(async (_input: PaperToSermonInput) => ({
        title: output.title ?? 'Llamados firmes — sermón',
        content: output.content ?? '## Introducción\n\nCuerpo del sermón...',
        bibleReferences: output.bibleReferences ?? ['2 Pedro 1:1-11'],
        modelId: output.modelId ?? 'gemini-2.5-pro',
        tokensUsed: output.tokensUsed ?? 1234,
    })),
});

const stubSermonRepo = (): ISermonRepository => {
    const created: SermonEntity[] = [];
    return {
        create: vi.fn(async (s: SermonEntity) => {
            created.push(s);
            return s;
        }),
        update: vi.fn(),
        delete: vi.fn(),
        findById: vi.fn(),
        findByShareToken: vi.fn(),
        findByUserId: vi.fn(),
        findAll: vi.fn(),
        findByDraftId: vi.fn(),
        // Expose for assertions.
        __created: created,
    } as any;
};

describe('GenerateSermonFromPaperUseCase', () => {
    it('rejects when the paper does not exist or is not owned by the actor', async () => {
        const useCase = new GenerateSermonFromPaperUseCase(
            stubPaperRepo(null),
            stubSermonRepo(),
            stubTransformer(),
        );

        await expect(
            useCase.execute({ paperId: 'p1', actorUserId: 'user-1', tone: 'pastoral' }),
        ).rejects.toThrow(/no encontrado|sin permiso/i);
    });

    it('rejects when the paper is not in assembled phase', async () => {
        const useCase = new GenerateSermonFromPaperUseCase(
            stubPaperRepo(makePaper({ phase: 'in-progress' })),
            stubSermonRepo(),
            stubTransformer(),
        );

        await expect(
            useCase.execute({ paperId: 'p1', actorUserId: 'user-1', tone: 'pastoral' }),
        ).rejects.toThrow(/ensamblado/);
    });

    it('rejects when assembledMarkdown is null even if phase is assembled', async () => {
        const useCase = new GenerateSermonFromPaperUseCase(
            stubPaperRepo(makePaper({ assembledMarkdown: null })),
            stubSermonRepo(),
            stubTransformer(),
        );

        await expect(
            useCase.execute({ paperId: 'p1', actorUserId: 'user-1', tone: 'pastoral' }),
        ).rejects.toThrow(/contenido ensamblado/);
    });

    it('persists a draft sermon with sourcePaperId set and returns model metadata', async () => {
        const sermonRepo = stubSermonRepo();
        const useCase = new GenerateSermonFromPaperUseCase(
            stubPaperRepo(makePaper()),
            sermonRepo,
            stubTransformer({ tokensUsed: 9999, modelId: 'gemini-2.5-pro' }),
        );

        const result = await useCase.execute({
            paperId: 'paper-1',
            actorUserId: 'user-1',
            tone: 'expositivo',
        });

        expect(result.modelId).toBe('gemini-2.5-pro');
        expect(result.tokensUsed).toBe(9999);

        const created = (sermonRepo as any).__created as SermonEntity[];
        expect(created).toHaveLength(1);
        expect(created[0]!.sourcePaperId).toBe('paper-1');
        expect(created[0]!.userId).toBe('user-1');
        expect(created[0]!.status).toBe('draft');
        expect(created[0]!.bibleReferences).toContain('2 Pedro 1:1-11');
        expect(result.sermonId).toBe(created[0]!.id);
    });
});
