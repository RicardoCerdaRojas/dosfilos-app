import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    aggregateWitnessResult,
    escalateWitnessedClaim,
    type WitnessVerdict,
    type WitnessedClaim,
} from '@dosfilos/domain';

// Captura el payload que el shadow envía al callable — esta es la "muestra
// del log real escribiéndose": la forma exacta del registro que aterriza en
// `doxologicalGateShadow/`.
const callableSpy = vi.fn().mockResolvedValue({ data: { recorded: true } });

vi.mock('firebase/functions', () => ({
    getFunctions: () => ({}),
    httpsCallable: () => callableSpy,
}));

import { logDoxologicalShadow, logDoxologicalShadowFailure } from '../doxologicalShadow';

function verdict(over: Partial<WitnessVerdict>): WitnessVerdict {
    return { witness: 'context', dissents: false, reasoning: '', evidence: [], confidence: 0.9, ...over };
}

function doxClaim(level: WitnessedClaim['detectedLevel'], dissents: number): WitnessedClaim {
    return escalateWitnessedClaim({
        key: 'doxologicalApplication',
        kind: 'doxologicalApplication',
        text: 'Adoramos al Verbo encarnado que se hizo carne por nosotros.',
        detectedLevel: level,
        verdicts: Array.from({ length: 3 }, (_, i) =>
            verdict({
                dissents: i < dissents,
                witness: (['context', 'parallels', 'confession'] as const)[i],
            }),
        ),
    });
}

function resultWith(claims: WitnessedClaim[]) {
    return aggregateWitnessResult({
        seedId: 'seed-1',
        sermonId: 'sermon-1',
        claims,
        confessionalWitnessesEnabled: true,
    });
}

describe('logDoxologicalShadow', () => {
    beforeEach(() => callableSpy.mockClear());

    it('writes the full shadow record for a soft-blocked doxological claim (wizard)', async () => {
        await logDoxologicalShadow({
            result: resultWith([doxClaim('distinctive', 2)]),
            flow: 'wizard',
            witnessLatencyMs: 1840,
            cacheHit: false,
            oneShotVerdict: 'block',
        });

        expect(callableSpy).toHaveBeenCalledTimes(1);
        expect(callableSpy).toHaveBeenCalledWith({
            seedId: 'seed-1',
            sermonId: 'sermon-1',
            flow: 'wizard',
            doxologicalText: 'Adoramos al Verbo encarnado que se hizo carne por nosotros.',
            status: 'soft',
            escalation: 'soft-block',
            witnessLatencyMs: 1840,
            cacheHit: false,
            oneShotVerdict: 'block',
        });
    });

    it('logs a pass (guided, no one-shot) — the sample of passes for miss review', async () => {
        await logDoxologicalShadow({
            result: resultWith([doxClaim('distinctive', 0)]),
            flow: 'guided-insight',
            witnessLatencyMs: 2210,
            cacheHit: true,
        });

        expect(callableSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                flow: 'guided-insight',
                status: 'pass',
                escalation: 'pass',
                oneShotVerdict: null,
                cacheHit: true,
            }),
        );
    });

    it('skips logging when there is no doxological claim (absent)', async () => {
        const noDox = resultWith([
            escalateWitnessedClaim({
                key: 'centralIdea',
                kind: 'centralIdea',
                text: 'El Verbo es Dios.',
                detectedLevel: 'distinctive',
                verdicts: Array.from({ length: 3 }, () => verdict({})),
            }),
        ]);
        await logDoxologicalShadow({ result: noDox, flow: 'wizard', witnessLatencyMs: 100 });
        expect(callableSpy).not.toHaveBeenCalled();
    });

    it('never throws — fail-open even if the callable rejects', async () => {
        callableSpy.mockRejectedValueOnce(new Error('network down'));
        await expect(
            logDoxologicalShadow({
                result: resultWith([doxClaim('distinctive', 3)]),
                flow: 'wizard',
                witnessLatencyMs: 1,
            }),
        ).resolves.toBeUndefined();
    });
});

describe('logDoxologicalShadowFailure', () => {
    beforeEach(() => callableSpy.mockClear());

    it('records a fail-open row with the failure reason and no verdict', async () => {
        await logDoxologicalShadowFailure({
            seedId: 'seed-9',
            sermonId: 'sermon-9',
            flow: 'guided-insight',
            failure: 'witness validation returned no result',
        });
        expect(callableSpy).toHaveBeenCalledWith({
            seedId: 'seed-9',
            sermonId: 'sermon-9',
            flow: 'guided-insight',
            failure: 'witness validation returned no result',
        });
    });

    it('never throws', async () => {
        callableSpy.mockRejectedValueOnce(new Error('boom'));
        await expect(
            logDoxologicalShadowFailure({ seedId: 's', sermonId: 'sm', flow: 'wizard', failure: 'x' }),
        ).resolves.toBeUndefined();
    });
});
