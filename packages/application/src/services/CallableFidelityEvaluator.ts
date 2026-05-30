/**
 * Pastoral Fidelity — Phase 3 PR 1 (ADR-029) — client-side adapter for
 * `IFidelityEvaluator` that proxies to the `evaluateClaimSourceFidelity`
 * Cloud Function.
 *
 * The use case (`RunFidelityPassUseCase`) runs in the browser; the LLM
 * keys (Gemini + Anthropic) are server-only secrets, so the actual
 * batch + escalation logic lives in the callable. This adapter takes
 * the raw payload returned by the callable and re-hydrates the `Date`
 * fields the domain types expect (the wire format ships epoch millis).
 *
 * Mirrors the pattern of `CallableLlmClient` (Phase 2.5 PR B).
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
    FidelityEvaluationInput,
    FidelityEvaluationResult,
    FidelityVerdict,
    IFidelityEvaluator,
} from '@dosfilos/domain';

interface CallableVerdictPayload {
    marker: number;
    claim: string;
    citedSource: FidelityVerdict['citedSource'];
    verdict: FidelityVerdict['verdict'];
    reasoning: string;
    confidence: number;
    modelUsed: 'flash' | 'sonnet';
    evaluatedAt: number;
    stale?: boolean;
}

interface CallableEvaluateResponse {
    reportId: string;
    sermonId: string;
    generatedAt: number;
    modelTier: 'flash' | 'sonnet' | 'mixed';
    verdicts: CallableVerdictPayload[];
    skippedMarkers: number;
}

export class CallableFidelityEvaluator implements IFidelityEvaluator {
    async evaluate(input: FidelityEvaluationInput): Promise<FidelityEvaluationResult> {
        const callable = httpsCallable(getFunctions(), 'evaluateClaimSourceFidelity');
        const response = await callable({
            sermonId: input.sermonId,
            locale: input.locale ?? 'es',
        });
        const data = response.data as CallableEvaluateResponse;

        return {
            reportId: data.reportId,
            sermonId: data.sermonId,
            generatedAt: new Date(data.generatedAt),
            modelTier: data.modelTier,
            verdicts: data.verdicts.map((v) => ({
                marker: v.marker,
                claim: v.claim,
                citedSource: v.citedSource,
                verdict: v.verdict,
                reasoning: v.reasoning,
                confidence: v.confidence,
                modelUsed: v.modelUsed,
                evaluatedAt: new Date(v.evaluatedAt),
                ...(v.stale !== undefined ? { stale: v.stale } : {}),
            })),
            skippedMarkers: data.skippedMarkers ?? 0,
        };
    }
}
