import { useCallback, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    aggregateWitnessResult,
    collectSeedClaims,
    escalateWitnessedClaim,
    type DoctrineLevel,
    type PastoralSeed,
    type WitnessResult,
    type WitnessVerdict,
} from '@dosfilos/domain';

interface RawVerdict {
    index: number;
    dissents: boolean;
    confidence: number;
    reasoning: string;
    evidence: string[];
}
interface RawConfessionVerdict extends RawVerdict {
    detectedLevel: DoctrineLevel | null;
}
interface WitnessesPayload {
    claimKeys: string[];
    context: RawVerdict[];
    parallels: RawVerdict[];
    confession: RawConfessionVerdict[];
}

interface ValidateArgs {
    seed: PastoralSeed;
    confessionalWitnessesEnabled: boolean;
    /** Cross-reference strings already resolved by `useCrossReferences`. */
    crossRefs: string[];
}

/** Rich outcome of a single `validate` run — used by fire-and-forget callers
 * (e.g. the doxological shadow gate) that need latency + cache without reading
 * the racy hook state after the await. */
export interface WitnessValidateOutcome {
    result: WitnessResult | null;
    cacheHit: boolean;
    /** Wall-clock latency of the witness callable, in ms. */
    latencyMs: number;
}

interface UseWitnessValidationResult {
    result: WitnessResult | null;
    loading: boolean;
    error: string | null;
    cacheHit: boolean;
    /** Latency of the last witness callable, in ms (`null` until first run). */
    latencyMs: number | null;
    /** Runs the three witnesses + composes the escalated result. */
    validate: (args: ValidateArgs) => Promise<WitnessValidateOutcome>;
    reset: () => void;
}

function toVerdict(witness: WitnessVerdict['witness'], raw: RawVerdict | undefined): WitnessVerdict {
    return {
        witness,
        dissents: raw?.dissents ?? false,
        reasoning: raw?.reasoning ?? '',
        evidence: raw?.evidence ?? [],
        confidence: raw?.confidence ?? 0,
    };
}

/**
 * Phase 2 — runs the `validateSeedWitnesses` callable and composes the
 * raw per-witness verdicts into an escalated `WitnessResult` using the
 * pure domain logic (ADR-011). The callable stays thin (LLM only); the
 * escalation math lives here so it's deterministic + cache-stable.
 */
export function useWitnessValidation(): UseWitnessValidationResult {
    const [result, setResult] = useState<WitnessResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cacheHit, setCacheHit] = useState(false);
    const [latencyMs, setLatencyMs] = useState<number | null>(null);

    const reset = useCallback(() => {
        setResult(null);
        setError(null);
        setCacheHit(false);
        setLatencyMs(null);
    }, []);

    const validate = useCallback(async ({ seed, confessionalWitnessesEnabled, crossRefs }: ValidateArgs): Promise<WitnessValidateOutcome> => {
        const claims = collectSeedClaims(seed);
        if (claims.length === 0) {
            setError('No hay afirmaciones que validar — completa el Paso 6 (Insight).');
            return { result: null, cacheHit: false, latencyMs: 0 };
        }
        setLoading(true);
        setError(null);
        const startedAt = Date.now();
        try {
            const callable = httpsCallable(getFunctions(), 'validateSeedWitnesses');
            const payload = {
                sermonId: seed.sermonId,
                seedId: seed.id,
                passage: seed.passage,
                confessionalWitnessesEnabled,
                claims: claims.map((c) => ({ key: c.key, kind: c.kind, text: c.text })),
                context: {
                    mainClauseRef: seed.structuralAnalysis?.mainClause?.reference ?? '',
                    mainClauseNote: seed.structuralAnalysis?.mainClause?.pastorNote ?? '',
                    wordStudies: (seed.wordStudies?.studies ?? []).map((w) => ({
                        word: w.word,
                        reference: w.reference,
                        discovery: w.pastorDiscovery,
                    })),
                    originalAudienceFunction: seed.function?.originalAudienceFunction ?? '',
                },
                crossRefs,
                seedParallels: (seed.recognition?.parallels ?? []).map((p) => ({
                    reference: p.reference,
                    note: p.relevanceNote,
                })),
            };
            const response = await callable(payload);
            const data = response.data as { witnesses: WitnessesPayload; cacheHit: boolean };
            const w = data.witnesses;

            const witnessedClaims = claims.map((c, i) => {
                const confVerdict = w.confession?.[i];
                const verdicts: WitnessVerdict[] = [
                    toVerdict('context', w.context?.[i]),
                    toVerdict('parallels', w.parallels?.[i]),
                    toVerdict('confession', confVerdict),
                ];
                return escalateWitnessedClaim({
                    key: c.key,
                    kind: c.kind,
                    index: c.index,
                    text: c.text,
                    detectedLevel: confVerdict?.detectedLevel ?? null,
                    verdicts,
                });
            });

            const composed = aggregateWitnessResult({
                seedId: seed.id,
                sermonId: seed.sermonId,
                claims: witnessedClaims,
                confessionalWitnessesEnabled,
            });
            const latency = Date.now() - startedAt;
            const hit = Boolean(data.cacheHit);
            setResult(composed);
            setCacheHit(hit);
            setLatencyMs(latency);
            return { result: composed, cacheHit: hit, latencyMs: latency };
        } catch (err: any) {
            console.error('[useWitnessValidation]', err);
            setError(err?.message ?? 'No pudimos validar tu estudio con los tres testigos.');
            return { result: null, cacheHit: false, latencyMs: Date.now() - startedAt };
        } finally {
            setLoading(false);
        }
    }, []);

    return { result, loading, error, cacheHit, latencyMs, validate, reset };
}
