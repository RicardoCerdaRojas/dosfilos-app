/**
 * Pastoral Fidelity — Phase 2.5 (ADR-025) Study Depth model.
 *
 * One Study Companion, one coverage model, three moments. This file is the
 * **coverage model**: seven dimensions, each scored 0-100, derived from the
 * pastor's own eight-step seed (structured evidence, no LLM). Phase B adds a
 * second evidence source (inferred from Faculty chat) that merges into the
 * same dimensions.
 *
 * The assessment lives 1:1 with the `pastoralSeed` — NOT with a project
 * (project-as-container is Fase 5, not built). Persisted as the subdoc
 * `pastoralSeeds/{seedId}/studyDepth/current`.
 *
 * Anti-gamification (ADR-025): the numeric score is internal (feeds the
 * Phase C gate + Fase 4 badge + metrics). Pastor-facing UI shows only the
 * qualitative `CoverageState`, never points/streaks/leaderboards.
 */

import type { PastoralSeed } from './PastoralSeed';

/**
 * The seven canonical dimensions, re-derived from the eight-step spine
 * (ADR-025). Order is the pastor's study order.
 */
export type DimensionId =
    | 'D1_lectura'
    | 'D2_contextoGenero'
    | 'D3_estructura'
    | 'D4_palabras'
    | 'D5_reconocimiento'
    | 'D6_funcion'
    | 'D7_confrontacion';

export const DIMENSION_ORDER: DimensionId[] = [
    'D1_lectura',
    'D2_contextoGenero',
    'D3_estructura',
    'D4_palabras',
    'D5_reconocimiento',
    'D6_funcion',
    'D7_confrontacion',
];

/**
 * Qualitative coverage shown in the badge. Never a number, never a streak.
 * Bands: 0 untouched · 1-39 started · 40-74 covered · 75-100 deep.
 */
export type CoverageState = 'untouched' | 'started' | 'covered' | 'deep';

/**
 * A dimension is "weak" (gate confronts it in PR C) below this score.
 * Aligned with the phase doc (`weakDimensions` = scores < 60).
 */
export const WEAK_DIMENSION_THRESHOLD = 60;

export interface DimensionScore {
    id: DimensionId;
    /** 0-100. Internal; not shown as a number to the pastor. */
    score: number;
    /** Qualitative band derived from `score`. */
    state: CoverageState;
    /** How many structured signals contributed (badge tooltip / debugging). */
    evidenceCount: number;
    /**
     * Per-dim manual override (ADR-027). When `true`, the pastor asserts the
     * dimension is covered even if the tracker did not detect it. Floors the
     * score to the "covered" band. Audited; not a gate bypass — evidence
     * correction.
     */
    pastorMarkedComplete?: boolean;
    /** Timestamp of the most recent evidence (seed.updatedAt in PR A). */
    lastEvidenceAt?: Date;
}

export interface StudyDepthAssessment {
    seedId: string;
    userId: string;
    /** Bible passage under study (mirrors `PastoralSeed.passage`). */
    passage: string;
    dimensions: Record<DimensionId, DimensionScore>;
    /** Weighted average (uniform weights in v1). 0-100, internal. */
    overallScore: number;
    /** Dimensions with score < `WEAK_DIMENSION_THRESHOLD`, sorted ascending. */
    weakDimensions: DimensionId[];
    updatedAt: Date;
}

/**
 * Phase 2.5 PR C (ADR-027) — Audit snapshot captured at the moment the
 * pastor turns study into sermon. Embedded into `Sermon.studyDepthSnapshot`.
 * Read by Fase 4's "Sello propio" badge + override-rate metrics. Pure
 * record — never recomputed (the seed may evolve after generation).
 */
export interface StudyDepthSnapshot {
    capturedAt: Date;
    /** Overall coverage score 0-100 at gate time. */
    overallScore: number;
    /** Per-dimension score 0-100 at gate time. */
    dimensionScores: Record<DimensionId, number>;
    /** Dimensions below `WEAK_DIMENSION_THRESHOLD` at gate time. */
    weakDimensions: DimensionId[];
    /** True when the pastor proceeded despite red/weak dims. */
    bypassedConfrontation: boolean;
    /** Pastor's justification when bypassing. ≥100 chars enforced upstream. */
    justification?: string;
    /** Whether expert mode was active at gate time (softer ceremony, never silenced). */
    expertMode: boolean;
}

/** Build a snapshot from a live assessment + the gate decision. */
export function buildStudyDepthSnapshot(
    assessment: StudyDepthAssessment,
    options: {
        bypassedConfrontation: boolean;
        justification?: string;
        expertMode: boolean;
        capturedAt?: Date;
    },
): StudyDepthSnapshot {
    const dimensionScores = {} as Record<DimensionId, number>;
    for (const id of DIMENSION_ORDER) {
        dimensionScores[id] = assessment.dimensions[id]?.score ?? 0;
    }
    return {
        capturedAt: options.capturedAt ?? new Date(),
        overallScore: assessment.overallScore,
        dimensionScores,
        weakDimensions: [...assessment.weakDimensions],
        bypassedConfrontation: options.bypassedConfrontation,
        justification: options.justification?.trim() || undefined,
        expertMode: options.expertMode,
    };
}

/** Minimum chars for an override justification (ADR-027). */
export const STUDY_DEPTH_OVERRIDE_MIN_CHARS = 100;

/**
 * Per-sermon high-score threshold that counts toward expert-mode self-unlock.
 * A sermon with `studyDepthSnapshot.overallScore >= EXPERT_MODE_GOOD_SCORE`
 * and `bypassedConfrontation === false` adds to the pastor's "earned" tally.
 */
export const EXPERT_MODE_GOOD_SCORE = 70;

/** Sermons needed at >= `EXPERT_MODE_GOOD_SCORE` for the toggle to unlock. */
export const EXPERT_MODE_UNLOCK_THRESHOLD = 3;

/**
 * Count how many sermons in the list qualify the pastor for expert-mode
 * self-unlock. Qualifies = snapshot present + `overallScore >=
 * EXPERT_MODE_GOOD_SCORE` + did NOT bypass confrontation. Pure.
 */
export function countExpertModeQualifyingSermons(
    sermons: Array<{ studyDepthSnapshot?: StudyDepthSnapshot }>,
): number {
    let n = 0;
    for (const s of sermons) {
        const snap = s.studyDepthSnapshot;
        if (!snap) continue;
        if (snap.bypassedConfrontation) continue;
        if (snap.overallScore >= EXPERT_MODE_GOOD_SCORE) n++;
    }
    return n;
}

/**
 * Whether the pastor may CURRENTLY have expert mode active. Three paths:
 *  - super-admin force-set `expertModeOn === true` regardless of threshold.
 *  - pastor self-toggled after the threshold was met (toggle stays true).
 *  - threshold met but pastor has not toggled yet → still "unlockable" only.
 */
export interface ExpertModeStatus {
    /** True iff pastor's preference says expert mode is on. */
    isOn: boolean;
    /** True iff the toggle is available for the pastor to flip on. */
    isUnlocked: boolean;
    /** Reason for current state (debug + UI copy). */
    reason: 'on' | 'unlocked-not-toggled' | 'locked-below-threshold';
    /** Sermons the pastor has at or above the qualifying score. */
    qualifyingCount: number;
}

export function computeExpertModeStatus(
    profile: { expertModeOn?: boolean },
    qualifyingCount: number,
): ExpertModeStatus {
    const isOn = profile.expertModeOn === true;
    const meetsThreshold = qualifyingCount >= EXPERT_MODE_UNLOCK_THRESHOLD;
    // `isOn` always implies the gate softens (the toggle was set somehow —
    // either earned + flipped or super-admin force-on). We never auto-revoke.
    const isUnlocked = isOn || meetsThreshold;
    let reason: ExpertModeStatus['reason'];
    if (isOn) reason = 'on';
    else if (meetsThreshold) reason = 'unlocked-not-toggled';
    else reason = 'locked-below-threshold';
    return { isOn, isUnlocked, reason, qualifyingCount };
}

/** Per-dim manual overrides persisted on the assessment doc (ADR-027). */
export type DimensionOverrides = Partial<Record<DimensionId, { pastorMarkedComplete: boolean }>>;

// ─────────────────────────────────────────────────────────────────────────
// Scoring helpers — deterministic, pure, pinned by tests.
// ─────────────────────────────────────────────────────────────────────────

function clamp01(x: number): number {
    return Math.max(0, Math.min(1, x));
}

function chars(value: string | undefined): number {
    return (value ?? '').trim().length;
}

/**
 * Maps free-text length to a 0..1 coverage fraction. Meeting the wizard's
 * own minimum yields 0.6 ("covered"); reaching `deep` yields 1.0. Below the
 * minimum ramps 0..0.6 so a partial attempt still registers.
 */
function textCoverage(len: number, min: number, deep: number): number {
    if (len <= 0) return 0;
    if (len < min) return 0.6 * (len / min);
    return 0.6 + 0.4 * clamp01((len - min) / Math.max(1, deep - min));
}

/** Same shape as `textCoverage` but for item counts (word studies, parallels). */
function countCoverage(n: number, min: number, deep: number): number {
    if (n <= 0) return 0;
    if (n < min) return 0.6 * (n / min);
    return 0.6 + 0.4 * clamp01((n - min) / Math.max(1, deep - min));
}

function meanCoverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Number of structured signals present for a dimension (badge tooltip). */
type DimComputation = { frac: number; evidenceCount: number };

function computeD1(seed: PastoralSeed): DimComputation {
    const r = seed.reading;
    const base = textCoverage(chars(r?.firstImpression), 50, 250);
    const consulted = r?.originalTextConsulted ? 0.1 : 0;
    const frac = base > 0 ? clamp01(base + consulted) : 0;
    let evidenceCount = 0;
    if (chars(r?.firstImpression) > 0) evidenceCount++;
    if (r?.originalTextConsulted) evidenceCount++;
    return { frac, evidenceCount };
}

function computeD2(seed: PastoralSeed): DimComputation {
    const c = seed.contextGenre;
    const confirmed = c?.genreConfirmed ? 1 : 0;
    const impl = textCoverage(chars(c?.genreImplication), 60, 240);
    const loc = chars(c?.bookLocationNote) > 0 ? 1 : 0;
    const hist = c?.historicalContextConsulted ? 1 : 0;
    const frac = clamp01(0.4 * confirmed + 0.4 * impl + 0.1 * loc + 0.1 * hist);
    let evidenceCount = 0;
    if (confirmed) evidenceCount++;
    if (impl > 0) evidenceCount++;
    if (loc) evidenceCount++;
    if (hist) evidenceCount++;
    return { frac, evidenceCount };
}

function computeD3(seed: PastoralSeed): DimComputation {
    const s = seed.structuralAnalysis;
    const hasRef = chars(s?.mainClause?.reference) > 0 ? 1 : 0;
    const note = textCoverage(chars(s?.mainClause?.pastorNote), 30, 150);
    const frac = clamp01(0.3 * hasRef + 0.7 * note);
    let evidenceCount = 0;
    if (hasRef) evidenceCount++;
    if (note > 0) evidenceCount++;
    return { frac, evidenceCount };
}

function computeD4(seed: PastoralSeed): DimComputation {
    const studies = seed.wordStudies?.studies ?? [];
    const countCov = countCoverage(studies.length, 2, 5);
    const discQuality = meanCoverage(studies.map((w) => textCoverage(chars(w?.pastorDiscovery), 30, 150)));
    const frac = studies.length > 0 ? clamp01(0.7 * countCov + 0.3 * discQuality) : 0;
    return { frac, evidenceCount: studies.length };
}

function computeD5(seed: PastoralSeed): DimComputation {
    const parallels = seed.recognition?.parallels ?? [];
    const countCov = countCoverage(parallels.length, 1, 3);
    const noteQuality = meanCoverage(parallels.map((p) => textCoverage(chars(p?.relevanceNote), 30, 150)));
    const frac = parallels.length > 0 ? clamp01(0.6 * countCov + 0.4 * noteQuality) : 0;
    return { frac, evidenceCount: parallels.length };
}

function computeD6(seed: PastoralSeed): DimComputation {
    const funcCov = textCoverage(chars(seed.function?.originalAudienceFunction), 100, 400);
    const princCov = textCoverage(chars(seed.timelessPrinciple?.principle), 60, 240);
    const hasWitness = seed.witnessReview ? 1 : 0;
    const frac = clamp01(0.5 * funcCov + 0.3 * princCov + 0.2 * hasWitness);
    let evidenceCount = 0;
    if (funcCov > 0) evidenceCount++;
    if (princCov > 0) evidenceCount++;
    if (hasWitness) evidenceCount++;
    return { frac, evidenceCount };
}

function computeD7(seed: PastoralSeed): DimComputation {
    // Coarse in PR A (presence of confrontation artifacts). PR B enriches D7
    // from Faculty argumentative engagement; Fase 4 from contra-scan.
    const hasVerification = seed.timelessPrinciple?.verificationReport ? 1 : 0;
    const hasWitnessReview = seed.witnessReview ? 1 : 0;
    const frac = clamp01(0.5 * hasVerification + 0.5 * hasWitnessReview);
    return { frac, evidenceCount: hasVerification + hasWitnessReview };
}

const DIM_COMPUTERS: Record<DimensionId, (seed: PastoralSeed) => DimComputation> = {
    D1_lectura: computeD1,
    D2_contextoGenero: computeD2,
    D3_estructura: computeD3,
    D4_palabras: computeD4,
    D5_reconocimiento: computeD5,
    D6_funcion: computeD6,
    D7_confrontacion: computeD7,
};

/** Floor a manually-completed dimension into the "covered" band. */
const PASTOR_MARKED_FLOOR = 60;

export function coverageState(score: number): CoverageState {
    if (score <= 0) return 'untouched';
    if (score < 40) return 'started';
    if (score < 75) return 'covered';
    return 'deep';
}

/**
 * Compute the full assessment from the pastor's seed (structured evidence)
 * plus any persisted per-dim manual overrides (ADR-027). Pure.
 */
export function computeStudyDepthFromSeed(
    seed: PastoralSeed,
    overrides: DimensionOverrides = {},
): StudyDepthAssessment {
    const dimensions = {} as Record<DimensionId, DimensionScore>;
    for (const id of DIMENSION_ORDER) {
        const { frac, evidenceCount } = DIM_COMPUTERS[id](seed);
        let score = Math.round(100 * clamp01(frac));
        const marked = overrides[id]?.pastorMarkedComplete === true;
        if (marked) score = Math.max(score, PASTOR_MARKED_FLOOR);
        dimensions[id] = {
            id,
            score,
            state: coverageState(score),
            evidenceCount,
            pastorMarkedComplete: marked || undefined,
            lastEvidenceAt: evidenceCount > 0 ? seed.updatedAt : undefined,
        };
    }
    const scores = DIMENSION_ORDER.map((id) => dimensions[id].score);
    const overallScore = Math.round(meanCoverage(scores));
    const weakDimensions = DIMENSION_ORDER.filter(
        (id) => dimensions[id].score < WEAK_DIMENSION_THRESHOLD,
    ).sort((a, b) => dimensions[a].score - dimensions[b].score);

    return {
        seedId: seed.id,
        userId: seed.userId,
        passage: seed.passage,
        dimensions,
        overallScore,
        weakDimensions,
        updatedAt: seed.updatedAt,
    };
}
