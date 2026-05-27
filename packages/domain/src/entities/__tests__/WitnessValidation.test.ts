import { describe, it, expect } from 'vitest';
import { createEmptyPastoralSeed } from '../PastoralSeed';
import {
    aggregateWitnessResult,
    canProceedFromWitnesses,
    collectSeedClaims,
    countDissents,
    escalateClaim,
    escalateWitnessedClaim,
    maxEscalation,
    WITNESS_THRESHOLDS,
    type WitnessVerdict,
    type WitnessedClaim,
} from '../WitnessValidation';

function verdict(over: Partial<WitnessVerdict>): WitnessVerdict {
    return {
        witness: 'context',
        dissents: false,
        reasoning: '',
        evidence: [],
        confidence: 0.9,
        ...over,
    };
}

describe('collectSeedClaims', () => {
    it('extracts centralIdea + observations + doxologicalApplication, skips question/anecdote', () => {
        const seed = createEmptyPastoralSeed({ id: 's', sermonId: 'sm', userId: 'u', passage: 'Juan 1:1' });
        seed.insight.centralIdea = 'El Verbo es Dios.';
        seed.insight.observations = ['Obs A', '', 'Obs C'];
        seed.insight.doxologicalApplication = 'Adoramos al Verbo encarnado.';
        seed.insight.openQuestion = '¿Quién es el Verbo?';
        seed.insight.pastoralAnecdote = 'Una vez un feligrés...';

        const claims = collectSeedClaims(seed);
        expect(claims.map((c) => c.key)).toEqual([
            'centralIdea',
            'observation:0',
            'observation:2',
            'doxologicalApplication',
        ]);
        // Empty observation index 1 is skipped but indices stay stable.
        expect(claims[2].index).toBe(2);
    });
});

describe('countDissents', () => {
    it('counts only dissents at/above the confidence threshold', () => {
        const verdicts = [
            verdict({ dissents: true, confidence: 0.9 }),
            verdict({ dissents: true, confidence: WITNESS_THRESHOLDS.dissentConfidenceMin - 0.01 }),
            verdict({ dissents: false, confidence: 0.99 }),
        ];
        expect(countDissents(verdicts)).toBe(1);
    });
});

describe('escalateClaim', () => {
    it('core + any dissent = absolute-block regardless of count', () => {
        expect(escalateClaim('core', 1)).toBe('absolute-block');
        expect(escalateClaim('core', 3)).toBe('absolute-block');
    });
    it('core with zero dissent passes', () => {
        expect(escalateClaim('core', 0)).toBe('pass');
    });
    it('distinctive escalates by count up to hard-block', () => {
        expect(escalateClaim('distinctive', 0)).toBe('pass');
        expect(escalateClaim('distinctive', 1)).toBe('note');
        expect(escalateClaim('distinctive', 2)).toBe('soft-block');
        expect(escalateClaim('distinctive', 3)).toBe('hard-block');
    });
    it('open-evangelical caps at note', () => {
        expect(escalateClaim('open-evangelical', 1)).toBe('note');
        expect(escalateClaim('open-evangelical', 2)).toBe('note');
        expect(escalateClaim('open-evangelical', 3)).toBe('note');
    });
    it('null level behaves like distinctive cap (no absolute-block)', () => {
        expect(escalateClaim(null, 3)).toBe('hard-block');
        expect(escalateClaim(null, 1)).toBe('note');
    });
});

describe('aggregate + proceed', () => {
    function claim(key: string, level: WitnessedClaim['detectedLevel'], dissents: number): WitnessedClaim {
        return escalateWitnessedClaim({
            key,
            kind: key === 'centralIdea' ? 'centralIdea' : 'observation',
            text: 'x',
            detectedLevel: level,
            verdicts: Array.from({ length: 3 }, (_, i) =>
                verdict({ dissents: i < dissents, confidence: 0.9, witness: (['context', 'parallels', 'confession'] as const)[i] }),
            ),
        });
    }

    it('overall escalation is the worst claim', () => {
        const claims = [claim('centralIdea', 'distinctive', 2), claim('observation:0', 'open-evangelical', 3)];
        expect(maxEscalation(claims)).toBe('soft-block');
        const result = aggregateWitnessResult({
            seedId: 's', sermonId: 'sm', claims, confessionalWitnessesEnabled: true,
        });
        expect(result.overallEscalation).toBe('soft-block');
        expect(result.requiresFaculty).toBe(false);
    });

    it('hard-block flags requiresFaculty', () => {
        const result = aggregateWitnessResult({
            seedId: 's', sermonId: 'sm',
            claims: [claim('centralIdea', 'distinctive', 3)],
            confessionalWitnessesEnabled: true,
        });
        expect(result.requiresFaculty).toBe(true);
    });

    it('soft-block needs ≥50 chars, hard-block needs ≥100', () => {
        const result = aggregateWitnessResult({
            seedId: 's', sermonId: 'sm',
            claims: [claim('centralIdea', 'distinctive', 2), claim('observation:0', 'distinctive', 3)],
            confessionalWitnessesEnabled: true,
        });
        // No responses → both pending.
        expect(canProceedFromWitnesses(result, []).pendingKeys.sort()).toEqual(['centralIdea', 'observation:0']);
        // Short responses → still pending.
        const short = canProceedFromWitnesses(result, [
            { claimKey: 'centralIdea', response: 'A'.repeat(40) },
            { claimKey: 'observation:0', response: 'A'.repeat(80) },
        ]);
        expect(short.pendingKeys.sort()).toEqual(['centralIdea', 'observation:0']);
        // Valid responses → allowed.
        const ok = canProceedFromWitnesses(result, [
            { claimKey: 'centralIdea', response: 'A'.repeat(55) },
            { claimKey: 'observation:0', response: 'A'.repeat(110) },
        ]);
        expect(ok.allowed).toBe(true);
        expect(ok.pendingKeys).toEqual([]);
    });

    it('absolute-block can never be overridden', () => {
        const result = aggregateWitnessResult({
            seedId: 's', sermonId: 'sm',
            claims: [claim('centralIdea', 'core', 1)],
            confessionalWitnessesEnabled: true,
        });
        const decision = canProceedFromWitnesses(result, [
            { claimKey: 'centralIdea', response: 'A'.repeat(500) },
        ]);
        expect(decision.allowed).toBe(false);
        expect(decision.hasAbsoluteBlock).toBe(true);
    });
});
