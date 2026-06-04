import { describe, it, expect, vi } from 'vitest';
import { VerifySermonCitationsUseCase } from '../VerifySermonCitationsUseCase';
import type { SermonEntity } from '@dosfilos/domain';

const stubSermon = (overrides: Partial<SermonEntity> = {}): SermonEntity =>
    ({
        id: 'sermon-1',
        userId: 'user-1',
        title: 'Test sermon',
        content: '',
        bibleReferences: [],
        tags: [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        isShared: false,
        authorName: 'Pastor',
        preachingHistory: [],
        ...overrides,
    }) as any;

const stubSermonRepo = (sermon: SermonEntity | null) =>
    ({
        findById: vi.fn(async () => sermon),
    }) as any;

const stubPaperRepo = (paper: any) =>
    ({
        getPaper: vi.fn(async () => paper),
    }) as any;

const stubChatRepo = (session: any) =>
    ({
        getSession: vi.fn(async () => session),
    }) as any;

describe('VerifySermonCitationsUseCase', () => {
    it('throws when sermon does not exist', async () => {
        const useCase = new VerifySermonCitationsUseCase(
            stubSermonRepo(null),
            stubPaperRepo(null),
            stubChatRepo(null),
        );
        await expect(
            useCase.execute({ ownerId: 'user-1', sermonId: 'missing' }),
        ).rejects.toThrow(/not found/);
    });

    it('throws when sermon belongs to a different user', async () => {
        const sermon = stubSermon({ userId: 'other-user' });
        const useCase = new VerifySermonCitationsUseCase(
            stubSermonRepo(sermon),
            stubPaperRepo(null),
            stubChatRepo(null),
        );
        await expect(
            useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' }),
        ).rejects.toThrow(/does not belong/);
    });

    it('returns sourceKind=null when sermon has no paper or Faculty origin', async () => {
        const sermon = stubSermon({ content: 'Some sermon content with no citations.' });
        const useCase = new VerifySermonCitationsUseCase(
            stubSermonRepo(sermon),
            stubPaperRepo(null),
            stubChatRepo(null),
        );
        const result = await useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' });
        expect(result.sourceKind).toBe(null);
        expect(result.citations).toEqual([]);
    });

    it('flags fabricated citation as not-found when author not in source', async () => {
        const sermon = stubSermon({
            sourcePaperId: 'paper-1',
            content: `Some content.

> "La paciencia de Dios es fortaleza activa."
> — *John Owen, Sobre la Paciencia*

More.`,
        });
        const paper = {
            assembledMarkdown: 'Paper about 2 Pedro 3:9 without any Owen reference.',
            sources: [],
        };
        const useCase = new VerifySermonCitationsUseCase(
            stubSermonRepo(sermon),
            stubPaperRepo(paper),
            stubChatRepo(null),
        );
        const result = await useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' });
        expect(result.sourceKind).toBe('paper');
        expect(result.citations).toHaveLength(1);
        expect(result.citations[0]!.status).toBe('not-found');
        expect(result.citations[0]!.note).toContain('Owen');
    });

    it('verifies citation when author and quote both appear literally in paper source', async () => {
        const sermon = stubSermon({
            sourcePaperId: 'paper-1',
            content: `> "La paciencia de Dios es fortaleza activa."
> — *John Owen, Sobre la Paciencia*`,
        });
        const paper = {
            assembledMarkdown: `Owen escribió que "la paciencia de Dios es fortaleza activa" en su tratado.`,
            sources: [],
        };
        const useCase = new VerifySermonCitationsUseCase(
            stubSermonRepo(sermon),
            stubPaperRepo(paper),
            stubChatRepo(null),
        );
        const result = await useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' });
        expect(result.citations).toHaveLength(1);
        expect(result.citations[0]!.status).toBe('verified');
    });

    it('verifies paraphrased citation (fuzzy match) above 55% similarity', async () => {
        const sermon = stubSermon({
            sourcePaperId: 'paper-1',
            content: `> "La paciencia divina es expresión activa de Su amor soberano hacia los pecadores."
> — *John Owen, Patience*`,
        });
        const paper = {
            assembledMarkdown: `Owen sostiene que la paciencia divina es expresión activa del amor soberano hacia pecadores que necesitan arrepentirse.`,
            sources: [],
        };
        const useCase = new VerifySermonCitationsUseCase(
            stubSermonRepo(sermon),
            stubPaperRepo(paper),
            stubChatRepo(null),
        );
        const result = await useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' });
        expect(result.citations[0]!.status).toBe('verified');
        expect(result.citations[0]!.similarity).toBeGreaterThanOrEqual(0.55);
    });

    it('uses Faculty conversation as source when sourceFacultySessionId is set', async () => {
        const sermon = stubSermon({
            sourceFacultySessionId: 'session-1',
            content: `> "Cristo es el cumplimiento de la ley moral y ceremonial."
> — *Calvino, Institución*`,
        });
        const session = {
            messages: [
                { content: 'Conversation about Cristo y la ley.' },
                { content: 'Calvino enseña que Cristo es el cumplimiento de la ley moral y ceremonial en su Institución de la religión cristiana.' },
            ],
        };
        const useCase = new VerifySermonCitationsUseCase(
            stubSermonRepo(sermon),
            stubPaperRepo(null),
            stubChatRepo(session),
        );
        const result = await useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' });
        expect(result.sourceKind).toBe('faculty');
        // Quote text appears almost verbatim in the source → verified
        // via substring match. The Calvino author surname is also
        // present (Stage 1 of the verifier).
        expect(['verified', 'fuzzy-low']).toContain(result.citations[0]!.status);
    });

    it('returns empty citations when sermon has no quote blocks', async () => {
        const sermon = stubSermon({
            sourcePaperId: 'paper-1',
            content: 'Plain sermon content without any author quotes. Just biblical exposition.',
        });
        const paper = { assembledMarkdown: 'Paper content', sources: [] };
        const useCase = new VerifySermonCitationsUseCase(
            stubSermonRepo(sermon),
            stubPaperRepo(paper),
            stubChatRepo(null),
        );
        const result = await useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' });
        expect(result.citations).toEqual([]);
    });

    it('reads sermon content from wizardProgress.draft when content is empty', async () => {
        const sermon = stubSermon({
            sourcePaperId: 'paper-1',
            content: '',
            wizardProgress: {
                currentStep: 3,
                passage: 'Test',
                lastSaved: new Date(),
                draft: {
                    title: 'Test',
                    introduction: 'Intro',
                    body: [
                        {
                            point: 'Punto I',
                            content: 'Content',
                            authorityQuote: `> "Made up quote here from invented author."
> — *Fake Author, Imagined Book*`,
                        },
                    ],
                    conclusion: 'Conclusion',
                },
            },
        });
        const paper = { assembledMarkdown: 'Paper content without Fake Author.', sources: [] };
        const useCase = new VerifySermonCitationsUseCase(
            stubSermonRepo(sermon),
            stubPaperRepo(paper),
            stubChatRepo(null),
        );
        const result = await useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' });
        expect(result.citations).toHaveLength(1);
        expect(result.citations[0]!.status).toBe('not-found');
    });

    it('verifies library-backed citations against the citationManifest (ADR-031)', async () => {
        const excerpt = 'El creyente halla su fortaleza en la provision de Cristo para toda situacion.';
        const sermon = stubSermon({
            // standalone: no paper / Faculty origin, but library-backed via manifest
            citationManifest: {
                version: '1',
                entries: [
                    { sourceId: 'S1', resourceId: 'r1', chunkId: 'c1', title: 'La Predicación', author: 'John MacArthur', page: '120', excerpt },
                ],
            },
            wizardProgress: {
                draft: {
                    title: 'Fortaleza',
                    introduction: 'Intro',
                    body: [{ point: 'Punto I', content: `"${excerpt}" — *John MacArthur, La Predicación*` }],
                    conclusion: 'Conclusion',
                },
            },
        } as any);
        const useCase = new VerifySermonCitationsUseCase(stubSermonRepo(sermon), stubPaperRepo(null), stubChatRepo(null));
        const result = await useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' });
        // manifest present → corpus is the library, NOT null (no false "unavailable")
        expect(result.sourceKind).toBe('library');
        expect(result.sourceCorpusLength).toBeGreaterThan(0);
        // quote came verbatim from the manifest excerpt → not a false "invented" flag
        expect(result.citations).toHaveLength(1);
        expect(result.citations[0]!.status).not.toBe('not-found');
        expect(result.hasLibraryManifest).toBe(true);
    });

    it('reports hasLibraryManifest even for a paper-derived sermon (narrative anchors, no false "no citations")', async () => {
        const sermon = stubSermon({
            sourcePaperId: 'paper-1',
            citationManifest: {
                version: '1',
                entries: [{ sourceId: 'S1', resourceId: 'r1', chunkId: 'c1', title: 'Comentario', author: 'Autor', page: '10', excerpt: 'algo' }],
            },
            wizardProgress: { draft: { title: 'T', introduction: 'Exposición sin comillas.', body: [{ point: 'I', content: 'Cuerpo.' }], conclusion: 'C' } },
        } as any);
        const paper = { assembledMarkdown: 'Paper content.', sources: [] };
        const useCase = new VerifySermonCitationsUseCase(stubSermonRepo(sermon), stubPaperRepo(paper), stubChatRepo(null));
        const result = await useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' });
        expect(result.sourceKind).toBe('paper'); // paper takes the kind
        expect(result.hasLibraryManifest).toBe(true); // but manifest present → UI shows narrative-citations message, not "no citations"
        expect(result.citations).toHaveLength(0); // no pull-quotes
    });

    it('reads the manifest from wizardProgress.draft when not yet published (pre-publish)', async () => {
        const excerpt = 'La vida cristiana es una vida de dependencia constante de Dios y su gracia.';
        const sermon = stubSermon({
            // no top-level citationManifest yet (unpublished draft)
            wizardProgress: {
                draft: {
                    title: 'Dependencia',
                    introduction: 'Intro',
                    body: [{ point: 'I', content: `"${excerpt}" — *Charles Ryrie, Teología Básica*` }],
                    conclusion: 'C',
                    citationManifest: {
                        version: '1',
                        entries: [
                            { sourceId: 'S1', resourceId: 'r1', chunkId: 'c1', title: 'Teología Básica', author: 'Charles Ryrie', page: '5', excerpt },
                        ],
                    },
                },
            },
        } as any);
        const useCase = new VerifySermonCitationsUseCase(stubSermonRepo(sermon), stubPaperRepo(null), stubChatRepo(null));
        const result = await useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' });
        expect(result.sourceKind).toBe('library'); // draft manifest found → not null/unavailable
        expect(result.citations[0]!.status).not.toBe('not-found');
    });

    it('still flags a quote absent from the manifest (real invented citation)', async () => {
        const sermon = stubSermon({
            citationManifest: {
                version: '1',
                entries: [
                    { sourceId: 'S1', resourceId: 'r1', chunkId: 'c1', title: 'La Predicación', author: 'John MacArthur', page: '120', excerpt: 'Algo totalmente distinto sobre homiletica.' },
                ],
            },
            wizardProgress: {
                draft: {
                    title: 'T', introduction: 'Intro',
                    body: [{ point: 'I', content: `"Una cita inventada que no aparece en ninguna fuente real." — *Autor Falso, Libro Imaginario*` }],
                    conclusion: 'C',
                },
            },
        } as any);
        const useCase = new VerifySermonCitationsUseCase(stubSermonRepo(sermon), stubPaperRepo(null), stubChatRepo(null));
        const result = await useCase.execute({ ownerId: 'user-1', sermonId: 'sermon-1' });
        expect(result.sourceKind).toBe('library'); // manifest present → not null
        expect(result.citations[0]!.status).toBe('not-found'); // genuinely invented → still caught
    });
});
