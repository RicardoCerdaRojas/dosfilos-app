/**
 * Pastoral Fidelity — Phase 1 six-step spine seed.
 *
 * Persisted as top-level collection `pastoralSeeds/{seedId}` (ADR-015).
 * 1:1 with the sermon that consumes it; in Fase 5 the `projectId` ref
 * will also be populated when `Project` lands.
 *
 * The seed is the pastor's own voice — produced through six steps of
 * personal study before the wizard is allowed to generate a draft. Step 6
 * (Insight) is AI-forbidden by design (ADR-002 + manifesto § Step 5/6/8).
 */

/**
 * Six sub-steps of the spine. The wizard enforces them lineally; a step
 * cannot be marked complete until its own validation passes, and the
 * sermon wizard cannot leave Step 1 (seed) until `completed === true`.
 */
export type PastoralSeedStepKey =
    | 'reading'
    | 'syntax'
    | 'morphology'
    | 'recognition'
    | 'function'
    | 'insight';

/**
 * Tools the pastor may invoke from within a step. Tracked for the audit
 * panel so the pastor can see what they consulted at each step and the
 * system can surface depth-of-study metrics in later phases.
 */
export type PastoralSeedTool =
    | 'greek-tutor'
    | 'hebrew-tutor'
    | 'canonical-analyzer'
    | 'cross-ref'
    | 'faculty-historical'
    /**
     * Phase 1.5 — pastor opened `PastoralWordStudyModal`. Replaces the
     * `'greek-tutor' | 'hebrew-tutor'` log when the sub-flag is on. The
     * legacy values stay in the union for histórica tool-consult logs.
     */
    | 'pastoral-word-study';

export interface ToolUsage {
    tool: PastoralSeedTool;
    step: PastoralSeedStepKey;
    invokedAt: Date;
    durationSeconds: number;
}

export interface WordStudy {
    /** Original-language form, e.g. "δικαιοσύνη" or "חֶסֶד". */
    word: string;
    /** Where in the passage the word appears (e.g. "Rom 8:4"). */
    reference: string;
    /** Pastor's own discovery — ≥30 chars validator. */
    pastorDiscovery: string;
    /**
     * Phase 1 legacy: link back to the greek/hebrew tutor session that
     * produced this. Retained for back-compat with seeds created before
     * Phase 1.5; new studies populate `wordAnalysisId` instead.
     */
    tutorInteractionId?: string;
    /**
     * Phase 1.5: id of the cached `PastoralWordAnalysis` doc that
     * sourced this study. Format matches
     * `buildPastoralWordAnalysisCacheKey`. Optional — pastor may also
     * add studies manually without consulting the modal.
     */
    wordAnalysisId?: string;
    /** Lemma in dictionary form (added Phase 1.5 for analytics). */
    lemma?: string;
    /** Original-language family this study came from. */
    language?: 'greek' | 'hebrew';
}

export interface ParallelRef {
    /** Bible reference of the parallel, e.g. "Gálatas 5:1". */
    reference: string;
    /** Pastor's own note explaining why the parallel matters — ≥30 chars. */
    relevanceNote: string;
    /** Whether the pastor surfaced it themself or the cross-ref engine did. */
    source: 'pastor-suggested' | 'cross-ref-engine-suggested';
}

/**
 * Audit-only event for Step 6 (Insight). Captures DOM paste events on
 * AI-forbidden fields so we can detect copy-paste from external LLMs.
 * Never blocks; the pastoral conversation about "your voice" stays
 * informational. Future phases may surface this in the audit panel or
 * roll up to a "voice authenticity" metric.
 */
export type InsightField =
    | 'centralIdea'
    | 'observations'
    | 'openQuestion'
    | 'pastoralAnecdote'
    | 'doxologicalApplication';

export interface PasteEvent {
    step: 'insight';
    field: InsightField;
    charsCount: number;
    at: Date;
}

export interface ReadingStepData {
    /** Pastor's first impression after reading the passage — ≥50 chars. */
    firstImpression: string;
    completedAt?: Date;
    timeSpentSeconds: number;
}

export interface SyntaxStepData {
    mainClause: {
        /** Reference of the main clause, e.g. "Romanos 8:1a". */
        reference: string;
        /** Pastor's note on the clause — ≥30 chars. */
        pastorNote: string;
    };
    completedAt?: Date;
    timeSpentSeconds: number;
}

export interface MorphologyStepData {
    /** Minimum 2 entries to satisfy the step. */
    wordStudies: WordStudy[];
    completedAt?: Date;
    timeSpentSeconds: number;
}

export interface RecognitionStepData {
    /** 1–3 parallels, each with relevanceNote ≥30 chars. */
    parallels: ParallelRef[];
    completedAt?: Date;
    timeSpentSeconds: number;
}

export interface FunctionStepData {
    /** Pastor's free-text on what the text did to its original audience — ≥100 chars. */
    originalAudienceFunction: string;
    completedAt?: Date;
    timeSpentSeconds: number;
}

export interface InsightStepData {
    /** One-sentence central idea — ≥30 chars. Verbatim required in draft. */
    centralIdea: string;
    /** Minimum 3 observations, each ≥40 chars. */
    observations: string[];
    /** ≥30 chars. */
    openQuestion: string;
    /** ≥80 chars. */
    pastoralAnecdote: string;
    /** Manifesto Paso 8 (doxological application) — ≥80 chars. */
    doxologicalApplication: string;
    /** DOM paste events on AI-forbidden fields. Audit only. */
    pasteEvents: PasteEvent[];
    completedAt?: Date;
    timeSpentSeconds: number;
}

export interface PastoralSeed {
    id: string;
    sermonId: string;
    /** Populated in Fase 5 when `Project` lands. Optional in v1. */
    projectId?: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;

    /** Bible passage the seed studies. Mirrors `Sermon.bibleReferences[0]`. */
    passage: string;

    reading: ReadingStepData;
    syntax: SyntaxStepData;
    morphology: MorphologyStepData;
    recognition: RecognitionStepData;
    function: FunctionStepData;
    insight: InsightStepData;

    totalTimeSeconds: number;
    toolsConsulted: ToolUsage[];
    /** True iff every step's validator passes. Set by `evaluatePastoralSeed`. */
    completed: boolean;
    completedAt?: Date;

    /**
     * Phase 2 (ADR-011) — the pastor's review of the three-witnesses gate:
     * which claims were blocked and how they responded. Optional + additive;
     * does NOT participate in `evaluatePastoralSeed` (`completed` is purely
     * the six-step validators). Imported lazily as a type to avoid a runtime
     * cycle between the seed and witness modules.
     */
    witnessReview?: import('./WitnessValidation').WitnessReview;
}

/**
 * Per-step minimum-length thresholds. Centralised so the validators and
 * the step components surface identical guidance to the pastor.
 */
export const PASTORAL_SEED_THRESHOLDS = {
    reading: { firstImpressionMinChars: 50 },
    syntax: { pastorNoteMinChars: 30 },
    morphology: {
        minWordStudies: 2,
        pastorDiscoveryMinChars: 30,
    },
    recognition: {
        minParallels: 1,
        maxParallels: 3,
        relevanceNoteMinChars: 30,
    },
    function: { originalAudienceFunctionMinChars: 100 },
    insight: {
        centralIdeaMinChars: 30,
        minObservations: 3,
        observationMinChars: 40,
        openQuestionMinChars: 30,
        pastoralAnecdoteMinChars: 80,
        doxologicalApplicationMinChars: 80,
    },
} as const;

export interface StepValidationResult {
    valid: boolean;
    /** Empty when `valid === true`. Human-readable, surfaced under the step UI. */
    reasons: string[];
}

export interface PastoralSeedEvaluation {
    perStep: Record<PastoralSeedStepKey, StepValidationResult>;
    /** True iff every step's validator returns `valid: true`. */
    completed: boolean;
    /** Helpful for the breadcrumb / progress indicator. */
    completedSteps: PastoralSeedStepKey[];
}

function countChars(value: string | undefined): number {
    return (value ?? '').trim().length;
}

export function validateReading(data: ReadingStepData | undefined): StepValidationResult {
    const reasons: string[] = [];
    if (!data) return { valid: false, reasons: ['Paso 1 (Lectura) sin iniciar.'] };
    const len = countChars(data.firstImpression);
    const min = PASTORAL_SEED_THRESHOLDS.reading.firstImpressionMinChars;
    if (len < min) reasons.push(`Primera impresión requiere ≥${min} caracteres (actual: ${len}).`);
    return { valid: reasons.length === 0, reasons };
}

export function validateSyntax(data: SyntaxStepData | undefined): StepValidationResult {
    const reasons: string[] = [];
    if (!data) return { valid: false, reasons: ['Paso 2 (Sintaxis) sin iniciar.'] };
    if (!data.mainClause?.reference?.trim()) reasons.push('Falta referencia de la oración principal.');
    const len = countChars(data.mainClause?.pastorNote);
    const min = PASTORAL_SEED_THRESHOLDS.syntax.pastorNoteMinChars;
    if (len < min) reasons.push(`Nota sobre la oración principal requiere ≥${min} caracteres (actual: ${len}).`);
    return { valid: reasons.length === 0, reasons };
}

export function validateMorphology(data: MorphologyStepData | undefined): StepValidationResult {
    const reasons: string[] = [];
    if (!data) return { valid: false, reasons: ['Paso 3 (Morfología) sin iniciar.'] };
    const t = PASTORAL_SEED_THRESHOLDS.morphology;
    const studies = data.wordStudies ?? [];
    if (studies.length < t.minWordStudies) {
        reasons.push(`Mínimo ${t.minWordStudies} estudios de palabras (actual: ${studies.length}).`);
    }
    studies.forEach((s, i) => {
        if (!s.word?.trim()) reasons.push(`Estudio #${i + 1}: falta la palabra original.`);
        if (!s.reference?.trim()) reasons.push(`Estudio #${i + 1}: falta la referencia.`);
        const len = countChars(s.pastorDiscovery);
        if (len < t.pastorDiscoveryMinChars) {
            reasons.push(`Estudio #${i + 1}: descubrimiento requiere ≥${t.pastorDiscoveryMinChars} caracteres (actual: ${len}).`);
        }
    });
    return { valid: reasons.length === 0, reasons };
}

export function validateRecognition(data: RecognitionStepData | undefined): StepValidationResult {
    const reasons: string[] = [];
    if (!data) return { valid: false, reasons: ['Paso 4 (Reconocimiento) sin iniciar.'] };
    const t = PASTORAL_SEED_THRESHOLDS.recognition;
    const parallels = data.parallels ?? [];
    if (parallels.length < t.minParallels) {
        reasons.push(`Mínimo ${t.minParallels} paralelo canónico (actual: ${parallels.length}).`);
    }
    if (parallels.length > t.maxParallels) {
        reasons.push(`Máximo ${t.maxParallels} paralelos (actual: ${parallels.length}).`);
    }
    parallels.forEach((p, i) => {
        if (!p.reference?.trim()) reasons.push(`Paralelo #${i + 1}: falta la referencia.`);
        const len = countChars(p.relevanceNote);
        if (len < t.relevanceNoteMinChars) {
            reasons.push(`Paralelo #${i + 1}: nota de relevancia requiere ≥${t.relevanceNoteMinChars} caracteres (actual: ${len}).`);
        }
    });
    return { valid: reasons.length === 0, reasons };
}

export function validateFunction(data: FunctionStepData | undefined): StepValidationResult {
    const reasons: string[] = [];
    if (!data) return { valid: false, reasons: ['Paso 5 (Función) sin iniciar.'] };
    const len = countChars(data.originalAudienceFunction);
    const min = PASTORAL_SEED_THRESHOLDS.function.originalAudienceFunctionMinChars;
    if (len < min) reasons.push(`Respuesta sobre función original requiere ≥${min} caracteres (actual: ${len}).`);
    return { valid: reasons.length === 0, reasons };
}

export function validateInsight(data: InsightStepData | undefined): StepValidationResult {
    const reasons: string[] = [];
    if (!data) return { valid: false, reasons: ['Paso 6 (Insight) sin iniciar.'] };
    const t = PASTORAL_SEED_THRESHOLDS.insight;
    const ci = countChars(data.centralIdea);
    if (ci < t.centralIdeaMinChars) reasons.push(`Idea central requiere ≥${t.centralIdeaMinChars} caracteres (actual: ${ci}).`);
    const observations = data.observations ?? [];
    if (observations.length < t.minObservations) {
        reasons.push(`Mínimo ${t.minObservations} observaciones (actual: ${observations.length}).`);
    }
    observations.forEach((o, i) => {
        const len = countChars(o);
        if (len < t.observationMinChars) {
            reasons.push(`Observación #${i + 1}: requiere ≥${t.observationMinChars} caracteres (actual: ${len}).`);
        }
    });
    const oq = countChars(data.openQuestion);
    if (oq < t.openQuestionMinChars) reasons.push(`Pregunta abierta requiere ≥${t.openQuestionMinChars} caracteres (actual: ${oq}).`);
    const pa = countChars(data.pastoralAnecdote);
    if (pa < t.pastoralAnecdoteMinChars) reasons.push(`Anécdota pastoral requiere ≥${t.pastoralAnecdoteMinChars} caracteres (actual: ${pa}).`);
    const dx = countChars(data.doxologicalApplication);
    if (dx < t.doxologicalApplicationMinChars) reasons.push(`Aplicación doxológica requiere ≥${t.doxologicalApplicationMinChars} caracteres (actual: ${dx}).`);
    return { valid: reasons.length === 0, reasons };
}

const STEP_VALIDATORS: Record<PastoralSeedStepKey, (seed: PastoralSeed) => StepValidationResult> = {
    reading: (seed) => validateReading(seed.reading),
    syntax: (seed) => validateSyntax(seed.syntax),
    morphology: (seed) => validateMorphology(seed.morphology),
    recognition: (seed) => validateRecognition(seed.recognition),
    function: (seed) => validateFunction(seed.function),
    insight: (seed) => validateInsight(seed.insight),
};

export const PASTORAL_SEED_STEP_ORDER: PastoralSeedStepKey[] = [
    'reading',
    'syntax',
    'morphology',
    'recognition',
    'function',
    'insight',
];

export function evaluatePastoralSeed(seed: PastoralSeed): PastoralSeedEvaluation {
    const perStep = {} as Record<PastoralSeedStepKey, StepValidationResult>;
    const completedSteps: PastoralSeedStepKey[] = [];
    for (const key of PASTORAL_SEED_STEP_ORDER) {
        const result = STEP_VALIDATORS[key](seed);
        perStep[key] = result;
        if (result.valid) completedSteps.push(key);
    }
    return {
        perStep,
        completed: completedSteps.length === PASTORAL_SEED_STEP_ORDER.length,
        completedSteps,
    };
}

/**
 * Factory used by the service when the wizard enters Step 1 for the
 * first time. Initialises every step with empty data so the autosave
 * hook can write partial progress without nullability dances.
 */
export function createEmptyPastoralSeed(args: {
    id: string;
    sermonId: string;
    userId: string;
    passage: string;
    projectId?: string;
    now?: Date;
}): PastoralSeed {
    const now = args.now ?? new Date();
    return {
        id: args.id,
        sermonId: args.sermonId,
        userId: args.userId,
        projectId: args.projectId,
        createdAt: now,
        updatedAt: now,
        passage: args.passage,
        reading: { firstImpression: '', timeSpentSeconds: 0 },
        syntax: { mainClause: { reference: '', pastorNote: '' }, timeSpentSeconds: 0 },
        morphology: { wordStudies: [], timeSpentSeconds: 0 },
        recognition: { parallels: [], timeSpentSeconds: 0 },
        function: { originalAudienceFunction: '', timeSpentSeconds: 0 },
        insight: {
            centralIdea: '',
            observations: [],
            openQuestion: '',
            pastoralAnecdote: '',
            doxologicalApplication: '',
            pasteEvents: [],
            timeSpentSeconds: 0,
        },
        totalTimeSeconds: 0,
        toolsConsulted: [],
        completed: false,
    };
}

/**
 * AI-forbidden field paths inside the seed. Consumers that pre-populate
 * the seed from derived contexts (paper / Faculty) MUST NOT write to
 * these fields automatically — the pastor's own voice goes there.
 *
 * Surfaced as a runtime guard for `paperToWizardProgress`-style mappers
 * and documented in the manifesto + ADR-002.
 */
export const PASTORAL_SEED_AI_FORBIDDEN_FIELDS = [
    'insight.centralIdea',
    'insight.observations',
    'insight.openQuestion',
    'insight.pastoralAnecdote',
    'insight.doxologicalApplication',
] as const;

export type PastoralSeedAiForbiddenField = (typeof PASTORAL_SEED_AI_FORBIDDEN_FIELDS)[number];
