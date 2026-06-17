/**
 * Agregación PURA de la telemetría de sombra del gate doxológico → el reloj +
 * los 2 cortes para reabrir C/D. Sin firebase, sin IO: recibe las filas crudas
 * (del callable `listDoxologicalShadow`) y devuelve el reporte. Testeable.
 */

export type ShadowSegment = 'super_admin' | 'ambassador' | 'team' | 'real' | null;
export type ShadowFlow = 'wizard' | 'guided-insight' | 'guided-socratic' | 'guided-wordstudies' | null;
export type ShadowStatus = 'pass' | 'soft' | 'hard' | null;
export type FailureCause = 'timeout' | 'error-callable' | 'app-check' | 'otro' | null;

export interface ShadowRow {
    id: string;
    flow: ShadowFlow;
    status: ShadowStatus;
    escalation: string | null;
    oneShotVerdict: 'pass' | 'block' | null;
    witnessLatencyMs: number | null;
    cacheHit: boolean;
    failure: string | null;
    failureCause: FailureCause;
    segment: ShadowSegment;
    seedId: string | null;
    sermonId: string | null;
    userId: string | null;
    doxologicalText: string;
    createdAtMs: number | null;
}

/** Pisos del flip (ambos deben cumplirse). */
const FLOOR_REAL_INSIGHTS = 20;
const FLOOR_DAYS = 7;

export interface ShadowReport {
    clock: {
        /** seedIds distintos por segmento. */
        distinctSeedsBySegment: Record<string, number>;
        /** seedIds distintos con segment=real (el piso de la tesis). */
        distinctRealSeeds: number;
        /** createdAt más viejo (día 0), en millis; null si no hay filas. */
        day0Ms: number | null;
        /** Días transcurridos desde el día 0 (al `nowMs` dado). */
        daysElapsed: number;
        floorRealMet: boolean;
        floorDaysMet: boolean;
        /** Ambos pisos cumplidos → listo para adjudicar. */
        readyToAdjudicate: boolean;
        totalRows: number;
    };
    /** Corte 1 — delta oneShotVerdict: fuga que prod deja pasar hoy. */
    delta: {
        /** Filas guiadas, segment=real, status soft/hard, oneShotVerdict=null. */
        candidates: ShadowRow[];
        count: number;
    };
    /** Todos los soft/hard (cualquier flujo/segmento) para adjudicar FP a ojo. */
    fpCandidates: ShadowRow[];
    /** Corte 2a — fallos por causa. */
    failure: {
        byCause: Record<string, number>;
        total: number;
        rate: number; // fallos / total filas
    };
    /** Corte 2b — latencia p95/p99 SOLO sobre cacheHit=false (cómputo real). */
    latency: {
        p50: number | null;
        p95: number | null;
        p99: number | null;
        coldSampleSize: number;
    };
    /** Desglose de status (pass/soft/hard) — vista rápida. */
    statusBreakdown: { pass: number; soft: number; hard: number };
}

function percentile(sorted: number[], p: number): number | null {
    if (sorted.length === 0) return null;
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(0, idx)];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function aggregateShadowReport(rows: ShadowRow[], nowMs: number): ShadowReport {
    const distinctByseg = new Map<string, Set<string>>();
    const realSeeds = new Set<string>();
    let day0Ms: number | null = null;
    const byCause: Record<string, number> = {};
    let failureTotal = 0;
    const coldLatencies: number[] = [];
    const statusBreakdown = { pass: 0, soft: 0, hard: 0 };
    const delta: ShadowRow[] = [];
    const fpCandidates: ShadowRow[] = [];

    for (const r of rows) {
        const seg = r.segment ?? 'unknown';
        if (r.seedId) {
            if (!distinctByseg.has(seg)) distinctByseg.set(seg, new Set());
            distinctByseg.get(seg)!.add(r.seedId);
            if (r.segment === 'real') realSeeds.add(r.seedId);
        }
        if (r.createdAtMs != null) {
            day0Ms = day0Ms == null ? r.createdAtMs : Math.min(day0Ms, r.createdAtMs);
        }
        if (r.failure) {
            failureTotal++;
            const cause = r.failureCause ?? 'otro';
            byCause[cause] = (byCause[cause] ?? 0) + 1;
        }
        if (r.cacheHit === false && r.witnessLatencyMs != null) {
            coldLatencies.push(r.witnessLatencyMs);
        }
        if (r.status === 'pass') statusBreakdown.pass++;
        else if (r.status === 'soft') statusBreakdown.soft++;
        else if (r.status === 'hard') statusBreakdown.hard++;

        const blocked = r.status === 'soft' || r.status === 'hard';
        if (blocked) fpCandidates.push(r);
        if (
            blocked &&
            r.segment === 'real' &&
            r.oneShotVerdict === null &&
            (r.flow === 'guided-insight' || r.flow === 'guided-socratic')
        ) {
            delta.push(r);
        }
    }

    const distinctSeedsBySegment: Record<string, number> = {};
    for (const [seg, set] of distinctByseg) distinctSeedsBySegment[seg] = set.size;

    const daysElapsed = day0Ms == null ? 0 : Math.floor((nowMs - day0Ms) / DAY_MS);
    const distinctRealSeeds = realSeeds.size;
    const floorRealMet = distinctRealSeeds >= FLOOR_REAL_INSIGHTS;
    const floorDaysMet = daysElapsed >= FLOOR_DAYS;

    coldLatencies.sort((a, b) => a - b);

    return {
        clock: {
            distinctSeedsBySegment,
            distinctRealSeeds,
            day0Ms,
            daysElapsed,
            floorRealMet,
            floorDaysMet,
            readyToAdjudicate: floorRealMet && floorDaysMet,
            totalRows: rows.length,
        },
        delta: { candidates: delta, count: delta.length },
        fpCandidates,
        failure: {
            byCause,
            total: failureTotal,
            rate: rows.length === 0 ? 0 : failureTotal / rows.length,
        },
        latency: {
            p50: percentile(coldLatencies, 50),
            p95: percentile(coldLatencies, 95),
            p99: percentile(coldLatencies, 99),
            coldSampleSize: coldLatencies.length,
        },
        statusBreakdown,
    };
}
