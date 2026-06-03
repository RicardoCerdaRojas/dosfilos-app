import { describe, it, expect, vi } from 'vitest';
import { RunFidelityPassUseCase } from '../RunFidelityPassUseCase';
import type {
    CitationManifest,
    FidelityEvaluationInput,
    FidelityEvaluationResult,
    FidelityVerdict,
    IFidelityEvaluator,
    ISermonRepository,
} from '@dosfilos/domain';

function makeVerdict(overrides: Partial<FidelityVerdict>): FidelityVerdict {
    return {
        marker: 1,
        claim: 'En el principio era el Verbo, y el Verbo era con Dios.',
        citedSource: {
            sourceId: 'S1',
            resourceId: 'res-1',
            chunkId: 'c-1',
            title: 'SBLGNT — Juan 1:1',
            excerpt: 'Ἐν ἀρχῇ ἦν ὁ λόγος…',
        },
        verdict: 'supports',
        reasoning: 'El texto griego confirma la apertura del prólogo joánico.',
        confidence: 0.92,
        modelUsed: 'flash',
        evaluatedAt: new Date('2026-05-30T12:00:00Z'),
        ...overrides,
    };
}

function makeEvaluation(verdicts: FidelityVerdict[]): FidelityEvaluationResult {
    return {
        reportId: 'sermon-7-1717070400000',
        sermonId: 'sermon-7',
        generatedAt: new Date('2026-05-30T12:00:00Z'),
        modelTier: 'flash',
        verdicts,
        skippedMarkers: 0,
    };
}

function makeMocks(evaluation: FidelityEvaluationResult, citationManifest?: CitationManifest) {
    const evaluate = vi.fn<[FidelityEvaluationInput], Promise<FidelityEvaluationResult>>(
        async () => evaluation,
    );
    const evaluator: IFidelityEvaluator = { evaluate };

    const updateFidelityReport = vi.fn().mockResolvedValue(undefined);
    const findById = vi.fn().mockResolvedValue(
        citationManifest ? { id: evaluation.sermonId, citationManifest } : null,
    );
    const sermonRepository = {
        updateFidelityReport,
        findById,
    } as unknown as ISermonRepository;

    return { evaluator, sermonRepository, evaluate, updateFidelityReport, findById };
}

describe('RunFidelityPassUseCase', () => {
    it('persists the evaluator output with computed summary and gateStatus=pass', async () => {
        const verdicts = [
            makeVerdict({ marker: 1, verdict: 'supports' }),
            makeVerdict({ marker: 2, verdict: 'supports' }),
        ];
        const { evaluator, sermonRepository, evaluate, updateFidelityReport } = makeMocks(
            makeEvaluation(verdicts),
        );

        const useCase = new RunFidelityPassUseCase(evaluator, sermonRepository);
        const report = await useCase.execute({ sermonId: 'sermon-7' });

        expect(evaluate).toHaveBeenCalledWith({ sermonId: 'sermon-7', locale: undefined });
        expect(report.gateStatus).toBe('pass');
        expect(report.summary.supports).toBe(2);
        expect(report.summary.unrelatedRatio).toBe(0);
        expect(report.verdicts).toHaveLength(2);
        expect(updateFidelityReport).toHaveBeenCalledWith('sermon-7', report);
    });

    it('emits hard-block when unrelated+contradicts exceed 20% of fresh markers', async () => {
        const verdicts = [
            makeVerdict({ marker: 1, verdict: 'supports' }),
            makeVerdict({ marker: 2, verdict: 'supports' }),
            makeVerdict({ marker: 3, verdict: 'supports' }),
            makeVerdict({ marker: 4, verdict: 'unrelated' }),
            makeVerdict({ marker: 5, verdict: 'contradicts' }),
        ];
        const { evaluator, sermonRepository } = makeMocks(makeEvaluation(verdicts));

        const useCase = new RunFidelityPassUseCase(evaluator, sermonRepository);
        const report = await useCase.execute({ sermonId: 'sermon-7' });

        expect(report.gateStatus).toBe('hard-block');
        expect(report.summary.unrelated).toBe(1);
        expect(report.summary.contradicts).toBe(1);
        expect(report.summary.unrelatedRatio).toBeCloseTo(0.4);
    });

    it('emits soft-block when partial verdicts exceed 10% of fresh markers', async () => {
        const verdicts = [
            makeVerdict({ marker: 1, verdict: 'supports' }),
            makeVerdict({ marker: 2, verdict: 'supports' }),
            makeVerdict({ marker: 3, verdict: 'supports' }),
            makeVerdict({ marker: 4, verdict: 'supports' }),
            makeVerdict({ marker: 5, verdict: 'partial' }),
        ];
        const { evaluator, sermonRepository } = makeMocks(makeEvaluation(verdicts));

        const useCase = new RunFidelityPassUseCase(evaluator, sermonRepository);
        const report = await useCase.execute({ sermonId: 'sermon-7' });

        expect(report.gateStatus).toBe('soft-block');
        expect(report.summary.partial).toBe(1);
        expect(report.summary.partialRatio).toBeCloseTo(0.2);
    });

    it('forwards locale to the evaluator', async () => {
        const { evaluator, sermonRepository, evaluate } = makeMocks(makeEvaluation([]));
        const useCase = new RunFidelityPassUseCase(evaluator, sermonRepository);

        await useCase.execute({ sermonId: 'sermon-7', locale: 'en' });

        expect(evaluate).toHaveBeenCalledWith({ sermonId: 'sermon-7', locale: 'en' });
    });

    it('attaches the attribution sub-report computed from the sermon manifest', async () => {
        const manifest: CitationManifest = {
            version: '1',
            entries: [
                {
                    sourceId: 'S1',
                    resourceId: 'sblgnt',
                    chunkId: 'c-1',
                    title: 'SBLGNT — Juan 1:1',
                    excerpt: 'Ἐν ἀρχῇ ἦν ὁ λόγος…',
                },
                {
                    sourceId: 'S2',
                    resourceId: 'res-cc-by',
                    chunkId: 'c-2',
                    title: 'Comentario abierto',
                    excerpt: '…',
                    license: 'CC BY 4.0',
                    // no requiredAttribution lines → flagged as missing
                },
            ],
        };
        const { evaluator, sermonRepository } = makeMocks(makeEvaluation([]), manifest);
        const useCase = new RunFidelityPassUseCase(evaluator, sermonRepository);

        const report = await useCase.execute({ sermonId: 'sermon-7' });

        expect(report.attributionReport).toBeDefined();
        // SBLGNT base-text block renders (CC BY 4.0); morphology stays latent.
        expect(report.attributionReport?.requiredAttributions.map((b) => b.sourceId)).toEqual([
            'sblgnt',
        ]);
        // The CC BY source without attribution lines is flagged.
        expect(report.attributionReport?.ok).toBe(false);
        expect(report.attributionReport?.missingAttributions).toEqual([
            { sourceId: 'res-cc-by', title: 'Comentario abierto', license: 'CC BY 4.0' },
        ]);
    });

    it('returns gateStatus=pass when the sermon has no markers to evaluate', async () => {
        const { evaluator, sermonRepository, updateFidelityReport } = makeMocks(makeEvaluation([]));
        const useCase = new RunFidelityPassUseCase(evaluator, sermonRepository);

        const report = await useCase.execute({ sermonId: 'sermon-7' });

        expect(report.gateStatus).toBe('pass');
        expect(report.verdicts).toHaveLength(0);
        expect(report.summary.totalMarkers).toBe(0);
        expect(updateFidelityReport).toHaveBeenCalledOnce();
    });
});
