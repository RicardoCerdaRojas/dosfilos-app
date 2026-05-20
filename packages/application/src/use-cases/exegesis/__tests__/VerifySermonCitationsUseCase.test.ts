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
});
