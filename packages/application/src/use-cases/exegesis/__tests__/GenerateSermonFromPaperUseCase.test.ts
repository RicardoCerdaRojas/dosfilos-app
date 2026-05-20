import { describe, it, expect, vi } from 'vitest';
import {
    SermonEntity,
    SermonSeriesEntity,
    type ExegeticalPaper,
    type IExegeticalPaperRepository,
    type IPaperToSermonTransformer,
    type ISermonRepository,
    type ISeriesRepository,
    type PaperToSermonInput,
    type PaperToSermonOutput,
    type PlannedSermon,
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

    describe('wizard pre-population (Pipeline convergence)', () => {
        it('writes wizardProgress so the wizard resumes at Step 3 with paper context', async () => {
            const sermonRepo = stubSermonRepo();
            const useCase = new GenerateSermonFromPaperUseCase(
                stubPaperRepo(makePaper({ title: 'Llamados firmes' })),
                sermonRepo,
                stubTransformer({
                    title: 'Una vocación que perdura',
                    content: 'Apertura introductoria.\n\n## Primer punto\n\nDesarrollo.\n\n## Conclusión\n\nCierre.',
                    bibleReferences: ['2 Pedro 1:1-11'],
                    modelId: 'gemini-2.5-pro',
                    tokensUsed: 5000,
                }),
            );

            await useCase.execute({ paperId: 'paper-1', actorUserId: 'user-1', tone: 'pastoral' });

            const created = (sermonRepo as any).__created[0] as SermonEntity;
            const progress = created.wizardProgress!;
            expect(progress.currentStep).toBe(3);
            // Passage is whatever `formatPassageReference` returns for
            // the stubbed paper; just confirm it's a non-empty string.
            expect(typeof progress.passage).toBe('string');
            expect(progress.passage.length).toBeGreaterThan(0);
            expect(progress.draft?.title).toBe('Una vocación que perdura');
            expect(progress.draft?.body.length).toBeGreaterThan(0);
            expect(progress.draft?.conclusion).toContain('Cierre');
            expect(progress.exegesis).toBeDefined();
            expect(progress.homiletics?.homileticalProposition).toBe('Una vocación que perdura');
            // Post Faculty→wizard convergence (2026-05-19): paperContext
            // generalized into derivedContext with kind discriminator.
            expect(progress.derivedContext?.kind).toBe('paper');
            if (progress.derivedContext?.kind === 'paper') {
                expect(progress.derivedContext.paperId).toBe('paper-1');
                expect(progress.derivedContext.paperTitle).toBe('Llamados firmes');
                expect(progress.derivedContext.tone).toBe('pastoral');
                expect(progress.derivedContext.transformerModelId).toBe('gemini-2.5-pro');
            }
        });

        it('keeps sermon.content populated for legacy sermon-detail surface back-compat', async () => {
            const sermonRepo = stubSermonRepo();
            const useCase = new GenerateSermonFromPaperUseCase(
                stubPaperRepo(makePaper()),
                sermonRepo,
                stubTransformer({ content: '## Punto\n\nCuerpo del sermón.' }),
            );

            await useCase.execute({ paperId: 'paper-1', actorUserId: 'user-1', tone: 'expositivo' });

            const created = (sermonRepo as any).__created[0] as SermonEntity;
            expect(created.content).toContain('Cuerpo del sermón');
        });

        it('maps tone to a homiletical approach in the homiletics stub', async () => {
            const cases: Array<{ tone: 'pastoral' | 'expositivo' | 'narrativo'; expected: string }> = [
                { tone: 'pastoral', expected: 'thematic' },
                { tone: 'expositivo', expected: 'expository' },
                { tone: 'narrativo', expected: 'narrative' },
            ];
            for (const c of cases) {
                const sermonRepo = stubSermonRepo();
                const useCase = new GenerateSermonFromPaperUseCase(
                    stubPaperRepo(makePaper()),
                    sermonRepo,
                    stubTransformer(),
                );
                await useCase.execute({ paperId: 'paper-1', actorUserId: 'user-1', tone: c.tone });
                const created = (sermonRepo as any).__created[0] as SermonEntity;
                expect(created.wizardProgress?.homiletics?.homileticalApproach).toBe(c.expected);
            }
        });
    });

    describe('series coherence patch', () => {
        const makePlanned = (id: string, overrides: Partial<PlannedSermon> = {}): PlannedSermon => ({
            id,
            week: 1,
            title: 'Pericope title',
            description: '',
            passage: '2 Pedro 1:1-11',
            ...overrides,
        });

        const stubSeriesRepo = (series: SermonSeriesEntity | null): ISeriesRepository => {
            const updates: SermonSeriesEntity[] = [];
            return {
                create: vi.fn(),
                update: vi.fn(async (s: SermonSeriesEntity) => {
                    updates.push(s);
                    return s;
                }),
                delete: vi.fn(),
                findById: vi.fn(async () => series),
                findByUserId: vi.fn(),
                __updates: updates,
            } as any;
        };

        const makeLinkedPaper = () =>
            makePaper({ seriesId: 'series-1', pericopeId: 'pericope-A' });

        it('stamps draftId + sermon-in-progress on the matching pericope when paper is linked to a series', async () => {
            const series = SermonSeriesEntity.create({
                id: 'series-1',
                userId: 'user-1',
                title: 'Serie 2 Pedro',
                description: 'Serie expositiva',
                type: 'expository',
                metadata: {
                    plannedSermons: [
                        makePlanned('pericope-A'),
                        makePlanned('pericope-B'),
                    ],
                },
                resourceIds: [],
                sermonIds: [],
                draftIds: [],
            });
            const seriesRepo = stubSeriesRepo(series);
            const sermonRepo = stubSermonRepo();

            const useCase = new GenerateSermonFromPaperUseCase(
                stubPaperRepo(makeLinkedPaper()),
                sermonRepo,
                stubTransformer(),
                seriesRepo,
            );

            await useCase.execute({ paperId: 'paper-1', actorUserId: 'user-1', tone: 'pastoral' });

            const updates = (seriesRepo as any).__updates as SermonSeriesEntity[];
            expect(updates).toHaveLength(1);
            const patched = updates[0]!.metadata?.plannedSermons ?? [];
            const patchedA = patched.find(p => p.id === 'pericope-A');
            const patchedB = patched.find(p => p.id === 'pericope-B');
            const createdSermon = (sermonRepo as any).__created[0] as SermonEntity;
            expect(patchedA?.draftId).toBe(createdSermon.id);
            expect(patchedA?.status).toBe('sermon-in-progress');
            expect(patchedB?.draftId).toBeUndefined();
            expect(updates[0]!.draftIds).toContain(createdSermon.id);
        });

        it('does not clobber an existing draftId on the same pericope', async () => {
            const series = SermonSeriesEntity.create({
                id: 'series-1',
                userId: 'user-1',
                title: 'Serie 2 Pedro',
                description: '',
                type: 'expository',
                metadata: {
                    plannedSermons: [
                        makePlanned('pericope-A', { draftId: 'sermon-existing', status: 'sermon-in-progress' }),
                    ],
                },
                resourceIds: [],
                sermonIds: [],
                draftIds: ['sermon-existing'],
            });
            const seriesRepo = stubSeriesRepo(series);

            const useCase = new GenerateSermonFromPaperUseCase(
                stubPaperRepo(makeLinkedPaper()),
                stubSermonRepo(),
                stubTransformer(),
                seriesRepo,
            );

            await useCase.execute({ paperId: 'paper-1', actorUserId: 'user-1', tone: 'pastoral' });

            const updates = (seriesRepo as any).__updates as SermonSeriesEntity[];
            expect(updates).toHaveLength(0);
        });

        it('is a no-op when paper has no series back-reference', async () => {
            const seriesRepo = stubSeriesRepo(null);

            const useCase = new GenerateSermonFromPaperUseCase(
                stubPaperRepo(makePaper()),
                stubSermonRepo(),
                stubTransformer(),
                seriesRepo,
            );

            await useCase.execute({ paperId: 'paper-1', actorUserId: 'user-1', tone: 'pastoral' });

            expect(seriesRepo.findById).not.toHaveBeenCalled();
            const updates = (seriesRepo as any).__updates as SermonSeriesEntity[];
            expect(updates).toHaveLength(0);
        });

        it('swallows series-repo failures without failing sermon creation', async () => {
            const seriesRepo: ISeriesRepository = {
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                findById: vi.fn(async () => { throw new Error('firestore down'); }),
                findByUserId: vi.fn(),
            };
            const sermonRepo = stubSermonRepo();

            const useCase = new GenerateSermonFromPaperUseCase(
                stubPaperRepo(makeLinkedPaper()),
                sermonRepo,
                stubTransformer(),
                seriesRepo,
            );

            const result = await useCase.execute({
                paperId: 'paper-1',
                actorUserId: 'user-1',
                tone: 'pastoral',
            });

            expect(result.sermonId).toBeTruthy();
            expect((sermonRepo as any).__created).toHaveLength(1);
        });
    });

    describe('targetSermonId (paper-linked placeholder population, PR #216)', () => {
        const makePlaceholder = (overrides: Partial<SermonEntity> = {}): SermonEntity =>
            SermonEntity.create({
                id: 'sermon-placeholder',
                userId: 'user-1',
                title: 'Pericope placeholder',
                content: '',
                bibleReferences: ['2 Pedro 1:1-11'],
                status: 'draft',
                sourcePaperId: 'paper-1',
                wizardProgress: {
                    currentStep: 0,
                    passage: '2 Pedro 1:1-11',
                    lastSaved: new Date(),
                    planId: 'series-1',
                },
                ...overrides,
            });

        const stubSermonRepoWithExisting = (existing: SermonEntity) => {
            const updated: SermonEntity[] = [];
            return {
                create: vi.fn(),
                update: vi.fn(async (s: SermonEntity) => {
                    updated.push(s);
                    return s;
                }),
                delete: vi.fn(),
                findById: vi.fn(async (id: string) => (id === existing.id ? existing : null)),
                findByShareToken: vi.fn(),
                findByUserId: vi.fn(),
                findAll: vi.fn(),
                findByDraftId: vi.fn(),
                findBySourcePaperId: vi.fn(),
                __updated: updated,
            } as any;
        };

        it('updates the existing placeholder sermon instead of creating a new one', async () => {
            const placeholder = makePlaceholder();
            const sermonRepo = stubSermonRepoWithExisting(placeholder);
            const useCase = new GenerateSermonFromPaperUseCase(
                stubPaperRepo(makePaper()),
                sermonRepo,
                stubTransformer({ title: 'New title', content: '## Punto\n\nCuerpo nuevo.' }),
            );

            const result = await useCase.execute({
                paperId: 'paper-1',
                actorUserId: 'user-1',
                tone: 'pastoral',
                targetSermonId: 'sermon-placeholder',
            });

            expect(sermonRepo.create).not.toHaveBeenCalled();
            expect(sermonRepo.update).toHaveBeenCalledTimes(1);
            expect(result.sermonId).toBe('sermon-placeholder');
            const updated = sermonRepo.__updated[0] as SermonEntity;
            expect(updated.title).toBe('New title');
            expect(updated.content).toContain('Cuerpo nuevo');
            expect(updated.wizardProgress?.draft?.title).toBe('New title');
            expect(updated.wizardProgress?.currentStep).toBe(3);
            expect(updated.wizardProgress?.derivedContext?.kind).toBe('paper');
        });

        it('skips the series patch when targetSermonId is provided (pericope already linked)', async () => {
            const placeholder = makePlaceholder();
            const sermonRepo = stubSermonRepoWithExisting(placeholder);
            const seriesRepo: ISeriesRepository = {
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                findById: vi.fn(),
                findByUserId: vi.fn(),
            };

            const useCase = new GenerateSermonFromPaperUseCase(
                stubPaperRepo(makePaper({ seriesId: 'series-1', pericopeId: 'pericope-A' })),
                sermonRepo,
                stubTransformer(),
                seriesRepo,
            );

            await useCase.execute({
                paperId: 'paper-1',
                actorUserId: 'user-1',
                tone: 'pastoral',
                targetSermonId: 'sermon-placeholder',
            });

            expect(seriesRepo.findById).not.toHaveBeenCalled();
            expect(seriesRepo.update).not.toHaveBeenCalled();
        });

        it('throws when targetSermonId points to a sermon not owned by the actor', async () => {
            const placeholder = makePlaceholder({ userId: 'other-user' });
            const sermonRepo = stubSermonRepoWithExisting(placeholder);
            const useCase = new GenerateSermonFromPaperUseCase(
                stubPaperRepo(makePaper()),
                sermonRepo,
                stubTransformer(),
            );

            await expect(
                useCase.execute({
                    paperId: 'paper-1',
                    actorUserId: 'user-1',
                    tone: 'pastoral',
                    targetSermonId: 'sermon-placeholder',
                }),
            ).rejects.toThrow(/no pertenece al actor/);
        });

        it('throws when targetSermonId does not exist', async () => {
            const sermonRepo = {
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                findById: vi.fn(async () => null),
                findByShareToken: vi.fn(),
                findByUserId: vi.fn(),
                findAll: vi.fn(),
                findByDraftId: vi.fn(),
                findBySourcePaperId: vi.fn(),
            } as any;
            const useCase = new GenerateSermonFromPaperUseCase(
                stubPaperRepo(makePaper()),
                sermonRepo,
                stubTransformer(),
            );

            await expect(
                useCase.execute({
                    paperId: 'paper-1',
                    actorUserId: 'user-1',
                    tone: 'pastoral',
                    targetSermonId: 'missing-sermon',
                }),
            ).rejects.toThrow(/no encontrado/);
        });
    });
});
