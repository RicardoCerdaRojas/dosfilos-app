import { describe, it, expect } from 'vitest';
import { aggregateShadowReport, type ShadowRow } from '../doxologicalShadowReport';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_000 * DAY; // día base arbitrario

function row(over: Partial<ShadowRow>): ShadowRow {
    return {
        id: Math.random().toString(36),
        flow: 'wizard',
        status: 'pass',
        escalation: 'pass',
        oneShotVerdict: 'pass',
        witnessLatencyMs: 1000,
        cacheHit: false,
        failure: null,
        failureCause: null,
        segment: 'real',
        seedId: 's1',
        sermonId: 'sm1',
        userId: 'u1',
        doxologicalText: 'x',
        createdAtMs: NOW,
        ...over,
    };
}

describe('aggregateShadowReport — reloj', () => {
    it('cuenta seedIds distintos por segmento (no filas)', () => {
        const rows = [
            row({ seedId: 'a', segment: 'real' }),
            row({ seedId: 'a', segment: 'real' }), // misma seed → cuenta 1
            row({ seedId: 'b', segment: 'real' }),
            row({ seedId: 'c', segment: 'ambassador' }),
        ];
        const r = aggregateShadowReport(rows, NOW);
        expect(r.clock.distinctSeedsBySegment.real).toBe(2);
        expect(r.clock.distinctSeedsBySegment.ambassador).toBe(1);
        expect(r.clock.distinctRealSeeds).toBe(2);
    });

    it('readyToAdjudicate solo si AMBOS pisos (≥20 real Y ≥7 días)', () => {
        // 20 real seeds pero creados hoy → días = 0 → no listo.
        const fresh = Array.from({ length: 20 }, (_, i) =>
            row({ seedId: `seed${i}`, createdAtMs: NOW }),
        );
        const r1 = aggregateShadowReport(fresh, NOW);
        expect(r1.clock.floorRealMet).toBe(true);
        expect(r1.clock.floorDaysMet).toBe(false);
        expect(r1.clock.readyToAdjudicate).toBe(false);

        // 20 real seeds con día0 hace 8 días → ambos pisos.
        const aged = Array.from({ length: 20 }, (_, i) =>
            row({ seedId: `seed${i}`, createdAtMs: NOW - 8 * DAY }),
        );
        const r2 = aggregateShadowReport(aged, NOW);
        expect(r2.clock.daysElapsed).toBe(8);
        expect(r2.clock.readyToAdjudicate).toBe(true);
    });
});

describe('aggregateShadowReport — corte 1 delta', () => {
    it('candidato delta = guiado + real + soft/hard + oneShotVerdict null', () => {
        const rows = [
            row({ flow: 'guided-insight', segment: 'real', status: 'hard', oneShotVerdict: null, seedId: 'g1' }),
            row({ flow: 'guided-socratic', segment: 'real', status: 'soft', oneShotVerdict: null, seedId: 'g2' }),
            // wizard (oneShotVerdict no-null) → NO es delta aunque sea hard
            row({ flow: 'wizard', segment: 'real', status: 'hard', oneShotVerdict: 'block', seedId: 'w1' }),
            // guiado pero segment ambassador → NO cuenta para el delta de tesis
            row({ flow: 'guided-insight', segment: 'ambassador', status: 'hard', oneShotVerdict: null, seedId: 'g3' }),
            // guiado real pero pass → no es fuga
            row({ flow: 'guided-insight', segment: 'real', status: 'pass', oneShotVerdict: null, seedId: 'g4' }),
        ];
        const r = aggregateShadowReport(rows, NOW);
        expect(r.delta.count).toBe(2);
        expect(r.delta.candidates.map((c) => c.seedId).sort()).toEqual(['g1', 'g2']);
    });

    it('fpCandidates incluye TODOS los soft/hard (cualquier flujo/segmento)', () => {
        const rows = [
            row({ status: 'hard', flow: 'wizard', segment: 'super_admin' }),
            row({ status: 'soft', flow: 'guided-insight', segment: 'real' }),
            row({ status: 'pass' }),
        ];
        const r = aggregateShadowReport(rows, NOW);
        expect(r.fpCandidates).toHaveLength(2);
    });
});

describe('aggregateShadowReport — corte 2 failure + latencia', () => {
    it('agrupa fallos por causa', () => {
        const rows = [
            row({ failure: 'x', failureCause: 'timeout' }),
            row({ failure: 'y', failureCause: 'timeout' }),
            row({ failure: 'z', failureCause: 'app-check' }),
            row({ failure: null }),
        ];
        const r = aggregateShadowReport(rows, NOW);
        expect(r.failure.byCause.timeout).toBe(2);
        expect(r.failure.byCause['app-check']).toBe(1);
        expect(r.failure.total).toBe(3);
        expect(r.failure.rate).toBeCloseTo(3 / 4);
    });

    it('latencia p50/p95/p99 SOLO sobre cacheHit=false (excluye cacheados)', () => {
        const rows = [
            ...Array.from({ length: 90 }, () => row({ cacheHit: false, witnessLatencyMs: 1000 })),
            ...Array.from({ length: 10 }, () => row({ cacheHit: false, witnessLatencyMs: 24000 })), // cold lentos
            ...Array.from({ length: 50 }, () => row({ cacheHit: true, witnessLatencyMs: 5 })), // cacheados → NO entran
        ];
        const r = aggregateShadowReport(rows, NOW);
        expect(r.latency.coldSampleSize).toBe(100); // los 50 cacheados excluidos
        expect(r.latency.p50).toBe(1000);
        expect(r.latency.p95).toBe(24000); // el 10% lento aparece en p95
        expect(r.latency.p99).toBe(24000);
    });
});
