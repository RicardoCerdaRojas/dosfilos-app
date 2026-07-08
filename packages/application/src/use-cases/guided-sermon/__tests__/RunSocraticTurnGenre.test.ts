import { describe, it, expect, vi } from 'vitest';
import {
    createDefaultStepPolicyRegistry,
    type GenreEngagementJudgment,
    type IAIChatRepository,
    type IGenreEngagementJudge,
    type ILlmClient,
    type IPastoralSeedRepository,
    type PastoralSeed,
} from '@dosfilos/domain';
import { RunSocraticTurnUseCase } from '../RunSocraticTurnUseCase';

/**
 * Redacción v2 Fase 1 (§4.4) A2 — dispatch del override de género en el paso 2,
 * probado en CI con JUEZ FAKE (sin LLM real, sin enforce-on): pasamos
 * enforceGenreOverride explícito + un genreJudge fake con veredicto canónico.
 * Mismo molde que el confront de misreading (RunSocraticTurnMisreading.test.ts).
 */

const LONG = (n: number) => 'a'.repeat(n);

function makeSeed(): PastoralSeed {
    return {
        id: 'seed-1',
        sermonId: 'srm-1',
        userId: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
        passage: 'Romanos 8:1-4',
        reading: { firstImpression: LONG(120), timeSpentSeconds: 0 },
        contextGenre: { genre: 'epistle', genreConfirmed: true, genreProvenance: 'aiProposed', genreImplication: LONG(120), bookLocationNote: '', historicalContextConsulted: true, timeSpentSeconds: 0 },
        structuralAnalysis: { mainClause: { reference: '', pastorNote: '' }, timeSpentSeconds: 0 },
        wordStudies: { studies: [], timeSpentSeconds: 0 },
        recognition: { parallels: [], timeSpentSeconds: 0 },
        function: { originalAudienceFunction: '', timeSpentSeconds: 0 },
        timelessPrinciple: { principle: '', timeSpentSeconds: 0 },
        insight: { centralIdea: '', observations: [], openQuestion: '', pastoralAnecdote: '', doxologicalApplication: '', pasteEvents: [], timeSpentSeconds: 0 },
        totalTimeSeconds: 0,
        toolsConsulted: [],
        completed: false,
    } as PastoralSeed;
}

function makeRepos(seed: PastoralSeed, currentStep = 'contextGenre', stepAttempts: Record<string, number> = {}) {
    const chatRepo = {
        getSession: vi.fn(async () => ({
            id: 's1',
            guidedSermonSession: { seedId: seed.id, currentStep, status: 'active', stepAttempts, startedAt: new Date() },
            messages: [],
        })),
        addMessageToSession: vi.fn(async () => {}),
        updateGuidedSermonSession: vi.fn(async () => {}),
    } as unknown as IAIChatRepository;
    const seedRepo = {
        getById: vi.fn(async () => seed),
        update: vi.fn(async () => {}),
        appendAiAssistLog: vi.fn(async () => {}),
    } as unknown as IPastoralSeedRepository;
    return { chatRepo, seedRepo };
}

/** LLM normal: 'orient' (no confront, no advance) — para los ramales no-confront. */
const orientLlm: ILlmClient = { generate: async () => JSON.stringify({ kind: 'orient', agentReply: 'Profundicemos.' }) };

function fakeGenreJudge(judgment: GenreEngagementJudgment): IGenreEngagementJudge {
    return { judge: vi.fn(async () => judgment) };
}

const registry = createDefaultStepPolicyRegistry();
const contradictsEngaged: GenreEngagementJudgment = { substantive: true, engagedAnchor: true, contradictsAnchor: true };
const kept: GenreEngagementJudgment = { substantive: true, engagedAnchor: true, contradictsAnchor: false };

const baseInput = { userId: 'u1', sessionId: 's1', pastorMessage: LONG(120) };

describe('RunSocraticTurnUseCase — override de género (A2, juez fake)', () => {
    it('enforce + lee otro género (attempt 0) → confront genre-override, retry (no avanza)', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, 'contextGenre', { contextGenre: 0 });
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, orientLlm, registry, undefined, fakeGenreJudge(contradictsEngaged));
        const res = await uc.execute({ ...baseInput, enforceGenreOverride: true });
        expect(res.output.kind).toBe('confront');
        expect((res.output as { errorLabel: string }).errorLabel).toBe('genre-override');
        expect(res.nextStep).toBe('contextGenre'); // retry, mismo paso
    });

    it('override floor: agota el tope (attempt 1) → NO re-confronta, registra discrepancia, cae al flujo normal', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, 'contextGenre', { contextGenre: 1 });
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, orientLlm, registry, undefined, fakeGenreJudge(contradictsEngaged));
        const res = await uc.execute({ ...baseInput, enforceGenreOverride: true });
        expect(res.output.kind).toBe('orient'); // liberado al flujo normal
        const calls = (seedRepo.appendAiAssistLog as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls.some((c) => c[1]?.assistType === 'genreOverride')).toBe(true);
    });

    it('mantiene el género propuesto (no contradice) → sin confront (flujo normal)', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, 'contextGenre', { contextGenre: 0 });
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, orientLlm, registry, undefined, fakeGenreJudge(kept));
        const res = await uc.execute({ ...baseInput, enforceGenreOverride: true });
        expect(res.output.kind).toBe('orient');
    });

    it('enforceGenreOverride false → el juez NUNCA se llama (flujo clásico)', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, 'contextGenre', { contextGenre: 0 });
        const judge = fakeGenreJudge(contradictsEngaged);
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, orientLlm, registry, undefined, judge);
        await uc.execute({ ...baseInput, enforceGenreOverride: false });
        expect((judge.judge as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });

    it('fuera del paso 2 (contextGenre) → el juez NUNCA se llama', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, 'structuralAnalysis', { structuralAnalysis: 0 });
        const judge = fakeGenreJudge(contradictsEngaged);
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, orientLlm, registry, undefined, judge);
        await uc.execute({ ...baseInput, enforceGenreOverride: true });
        expect((judge.judge as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });

    it('sin genreJudge inyectado → no-op (no crash, flujo clásico)', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, 'contextGenre', { contextGenre: 0 });
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, orientLlm, registry);
        const res = await uc.execute({ ...baseInput, enforceGenreOverride: true });
        expect(res.output.kind).toBe('orient');
    });
});
