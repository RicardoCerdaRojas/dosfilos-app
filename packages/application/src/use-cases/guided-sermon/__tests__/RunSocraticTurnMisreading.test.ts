import { describe, it, expect, vi } from 'vitest';
import {
    createDefaultStepPolicyRegistry,
    type IAIChatRepository,
    type ICoverageEngagementJudge,
    type ILlmClient,
    type IPastoralSeedRepository,
    type MisreadingJudgment,
    type PastoralSeed,
} from '@dosfilos/domain';
import { RunSocraticTurnUseCase } from '../RunSocraticTurnUseCase';

/**
 * ADR-035 D commit 3 — dispatch del confront de lectura errónea, probado en CI
 * con JUEZ FAKE (sin LLM real, sin enforce-on en prod): pasamos enforceCoverage
 * explícito al input y un coverageJudge fake con veredicto canónico.
 */

const LONG = (n: number) => 'a'.repeat(n);

function makeSeed(): PastoralSeed {
    return {
        id: 'seed-1',
        sermonId: 'srm-1',
        userId: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
        passage: '2 Pedro 2:10-22',
        reading: { firstImpression: LONG(120), timeSpentSeconds: 0 },
        contextGenre: { genre: 'epistle', genreConfirmed: true, genreImplication: LONG(120), bookLocationNote: '', historicalContextConsulted: true, timeSpentSeconds: 0 },
        structuralAnalysis: { mainClause: { reference: '2 Pedro 2:10', pastorNote: LONG(60) }, timeSpentSeconds: 0 },
        wordStudies: { studies: [], timeSpentSeconds: 0 },
        recognition: { parallels: [], timeSpentSeconds: 0 },
        function: { originalAudienceFunction: '', timeSpentSeconds: 0 },
        timelessPrinciple: { principle: '', timeSpentSeconds: 0 },
        insight: { centralIdea: '', observations: [], openQuestion: '', pastoralAnecdote: '', doxologicalApplication: '', pasteEvents: [], timeSpentSeconds: 0 },
        totalTimeSeconds: 0,
        toolsConsulted: [],
        completed: false,
        passageProfile: {
            schemaVersion: 1,
            passage: '2 Pedro 2:10-22',
            genres: ['epistle'],
            movements: [],
            features: [
                {
                    typeKey: 'common-misreading',
                    verseRef: 'v.20-22',
                    claim: 'se pierde la salvación',
                    whyWrong: 'describe falsos maestros que apostatan',
                    correctiveAnchor: [{ reference: 'v.22' }, { reference: 'Juan 10:28-29' }],
                },
            ],
            generatedAt: new Date(),
        },
    } as PastoralSeed;
}

function makeRepos(seed: PastoralSeed, stepAttempts: Record<string, number> = {}) {
    const chatRepo = {
        getSession: vi.fn(async () => ({
            id: 's1',
            guidedSermonSession: { seedId: seed.id, currentStep: 'function', status: 'active', stepAttempts, startedAt: new Date() },
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

/** LLM normal: devuelve 'orient' (no confront, no advance) — para los ramales no-misreading. */
const orientLlm: ILlmClient = { generate: async () => JSON.stringify({ kind: 'orient', agentReply: 'Profundicemos.' }) };

function fakeJudge(judgment: MisreadingJudgment): ICoverageEngagementJudge {
    return { judge: vi.fn(async () => judgment) };
}

const registry = createDefaultStepPolicyRegistry();
const contradictsEngaged: MisreadingJudgment = { substantive: true, engagedAnchor: true, contradictsAnchor: true };
const ortogonal: MisreadingJudgment = { substantive: true, engagedAnchor: false, contradictsAnchor: false };

const baseInput = { userId: 'u1', sessionId: 's1', pastorMessage: LONG(120) };

describe('RunSocraticTurnUseCase — confront de misreading (D, juez fake)', () => {
    it('enforce + contradice (attempt 0) → confront common-misreading, retry (no avanza)', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, { function: 0 });
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, orientLlm, registry, fakeJudge(contradictsEngaged));
        const res = await uc.execute({ ...baseInput, enforceCoverage: true });
        expect(res.output.kind).toBe('confront');
        expect((res.output as { errorLabel: string }).errorLabel).toBe('common-misreading');
        expect(res.nextStep).toBe('function'); // retry, mismo paso
    });

    it('override floor: agota el tope (attempt 1) → NO re-confronta, registra discrepancia, cae al flujo normal', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, { function: 1 }); // ya hubo 1 re-confront
        const judge = fakeJudge(contradictsEngaged);
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, orientLlm, registry, judge);
        const res = await uc.execute({ ...baseInput, enforceCoverage: true });
        // No es confront de misreading: el override liberó al flujo normal (orient).
        expect(res.output.kind).toBe('orient');
        // Discrepancia REGISTRADA (override floor):
        const calls = (seedRepo.appendAiAssistLog as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls.some((c) => c[1]?.assistType === 'coverageMisreadingOverride')).toBe(true);
    });

    it('ortogonal (no tocó la mala lectura) → sin confront de misreading (flujo normal)', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, { function: 0 });
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, orientLlm, registry, fakeJudge(ortogonal));
        const res = await uc.execute({ ...baseInput, enforceCoverage: true });
        expect(res.output.kind).toBe('orient'); // no confront
    });

    it('enforceCoverage false → el juez NUNCA se llama (flujo clásico)', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, { function: 0 });
        const judge = fakeJudge(contradictsEngaged);
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, orientLlm, registry, judge);
        await uc.execute({ ...baseInput, enforceCoverage: false });
        expect((judge.judge as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    });

    it('sin coverageJudge inyectado → no-op (no crash, flujo clásico)', async () => {
        const seed = makeSeed();
        const { chatRepo, seedRepo } = makeRepos(seed, { function: 0 });
        const uc = new RunSocraticTurnUseCase(chatRepo, seedRepo, orientLlm, registry);
        const res = await uc.execute({ ...baseInput, enforceCoverage: true });
        expect(res.output.kind).toBe('orient');
    });
});
