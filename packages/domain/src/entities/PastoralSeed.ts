/**
 * Pastoral Fidelity — eight-step spine seed (Phase 1.6, ADR-022).
 *
 * Persisted as top-level collection `pastoralSeeds/{seedId}` (ADR-015).
 * 1:1 with the sermon that consumes it; in Fase 5 the `projectId` ref
 * will also be populated when `Project` lands.
 *
 * The seed is the pastor's own voice — produced through eight steps of
 * personal study before the wizard is allowed to generate a draft. Step 8
 * (Insight) is AI-forbidden by design (ADR-002 + manifesto § Step 5/6/8),
 * as is the principle field of Step 7 (`timelessPrinciple.principle`).
 *
 * Phase 1.6 changes vs. the original six-step spine (ADR-022):
 *   - rename `syntax` → `structuralAnalysis`, `morphology` → `wordStudies`
 *     (keys + labels; the inner array `wordStudies` → `studies`)
 *   - insert `contextGenre` (pos 2, ADR-024) + `timelessPrinciple` (pos 7,
 *     the Kaiser/Robinson bridge between exégesis and homilética)
 */

import type { LiteraryGenre } from '../exegesis/expository/BookPanorama';

/**
 * Eight sub-steps of the spine. The wizard enforces them lineally; a step
 * cannot be marked complete until its own validation passes, and the
 * sermon wizard cannot leave Step 1 (seed) until `completed === true`.
 */
export type PastoralSeedStepKey =
    | 'reading'
    | 'contextGenre'
    | 'structuralAnalysis'
    | 'wordStudies'
    | 'recognition'
    | 'function'
    | 'timelessPrinciple'
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
    | 'pastoral-word-study'
    /** Phase 1.6 — pastor consulted the book panorama / genre proposal. */
    | 'book-panorama'
    /** Phase 1.6 — pastor consulted historical-cultural background (RAG). */
    | 'historical-context';

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
 * Audit-only event for Step 8 (Insight) and Step 7 (principle). Captures
 * DOM paste events on AI-forbidden fields so we can detect copy-paste
 * from external assistants. Never blocks; the pastoral conversation about
 * "your voice" stays informational.
 */
export type InsightField =
    | 'centralIdea'
    | 'observations'
    | 'openQuestion'
    | 'pastoralAnecdote'
    | 'doxologicalApplication'
    /** Phase 1.6 — paste audit also covers the timeless principle field. */
    | 'principle';

export interface PasteEvent {
    step: 'insight' | 'timelessPrinciple';
    field: InsightField;
    charsCount: number;
    at: Date;
}

export interface ReadingStepData {
    /** Pastor's first impression after reading the passage — ≥50 chars. */
    firstImpression: string;
    /**
     * Phase 1.6 — pastor opened the original-text / parsing panel. This is
     * a data-driven insumo (SBLGNT + parsing data, NOT an LLM generation),
     * so it never produces an `AiAssistLog`. Audit-only.
     */
    originalTextConsulted?: boolean;
    completedAt?: Date;
    timeSpentSeconds: number;
}

/**
 * Phase 1.6 (ADR-024) — Contexto + Género. Genre governs the rules of
 * reading, so it precedes structural analysis. The assistant proposes the
 * genre + book outline (`BookPanorama` reuse); the pastor confirms the
 * genre and writes the interpretive implication in their own words.
 */
export interface ContextGenreStepData {
    /** Literary genre — proposed by the assistant, confirmed by the pastor. */
    genre: LiteraryGenre | '';
    /** True once the pastor confirms the proposed genre (aiProposed → userConfirmed). */
    genreConfirmed: boolean;
    /** Pastor's own interpretive implication of the genre — ≥X chars (human). */
    genreImplication: string;
    /** Where the pericope sits in the book's argument/outline (pastor note). */
    bookLocationNote: string;
    /** Whether historical-cultural background was consulted (RAG / Faculty). */
    historicalContextConsulted: boolean;
    completedAt?: Date;
    timeSpentSeconds: number;
}

/** Phase 1.6 — rename of the former `SyntaxStepData` (structural/discourse analysis). */
export interface StructuralAnalysisStepData {
    mainClause: {
        /** Reference of the main clause, e.g. "Romanos 8:1a". */
        reference: string;
        /** Pastor's note on the clause — ≥30 chars. */
        pastorNote: string;
    };
    completedAt?: Date;
    timeSpentSeconds: number;
}

/** Phase 1.6 — rename of the former `MorphologyStepData` (lexical semantics / word studies). */
export interface WordStudiesStepData {
    /** Minimum 2 entries to satisfy the step. Renamed from `wordStudies` (ADR-022 D2). */
    studies: WordStudy[];
    completedAt?: Date;
    timeSpentSeconds: number;
}

export interface RecognitionStepData {
    /** 1–8 parallels, each with relevanceNote ≥30 chars (cap = techo de seguridad, ADR-035 R1). */
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

/**
 * Phase 1.6 (ADR-022/023) — the principlizing bridge (Kaiser) between
 * exégesis ("what it meant") and homilética ("what it means today").
 * Robinson distinguishes the *exegetical idea* (timeless theological
 * truth) from the *homiletical idea* (`insight.centralIdea`, the
 * preacher's voice for their congregation). The principle is human and
 * AI-forbidden; the assistant only *verifies* it (never generates it).
 */
export interface TimelessPrincipleStepData {
    /** The timeless theological principle — human, AI-forbidden, ≥X chars. */
    principle: string;
    /**
     * Phase 1.6 (ADR-023) — output of the principle verifier (reuses the
     * three-witnesses mechanism + a generalization check). Additive: does
     * NOT participate in `evaluatePastoralSeed`; the pastor advances on the
     * principle text alone. The report is guidance, not a gate.
     */
    verificationReport?: PrincipleVerification;
    completedAt?: Date;
    timeSpentSeconds: number;
}

/** Phase 1.6 — verifier output for the timeless principle (ADR-023). */
export interface PrincipleVerification {
    /** How the principle is grounded in the pastor's own steps 1-6. */
    grounding: string;
    /** Risk that the principle reads meaning *into* the text rather than out of it. */
    eisegesisRisk: 'low' | 'medium' | 'high';
    /**
     * Whether the principle generalizes well: too abstract to be of *this*
     * text, too specific to transfer, or well-calibrated. `unknown` when
     * the verifier could not decide.
     */
    generalization: 'too-abstract' | 'too-specific' | 'well-calibrated' | 'unknown';
    /** Pastoral note, español. Short. Never prescribes the "correct" principle. */
    notes: string;
    verifiedAt: Date;
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
    contextGenre: ContextGenreStepData;
    structuralAnalysis: StructuralAnalysisStepData;
    wordStudies: WordStudiesStepData;
    recognition: RecognitionStepData;
    function: FunctionStepData;
    timelessPrinciple: TimelessPrincipleStepData;
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
     * the eight-step validators). Imported lazily as a type to avoid a
     * runtime cycle between the seed and witness modules.
     */
    witnessReview?: import('./WitnessValidation').WitnessReview;

    /**
     * Grieta doxológica — Capa 2.B (puente de compat). Estado autoritativo del
     * gate doxológico {fingerprint, status, escalation, validatedAt, override}.
     * Aditivo + inerte: lo persiste el gate en cada autoría doxológica para que
     * el enforce (C/D, `doxological_enforce`) lo lea en el chokepoint. NO
     * participa en `evaluatePastoralSeed`. Ausente ⇒ seed pre-B (legacy):
     * en enforce pasa como `sin_auditar`, no se bloquea retroactivamente.
     */
    doxologicalGate?: import('./WitnessValidation').DoxologicalGateRecord;

    /**
     * ADR-034 — doubts the pastor raised mid-study, captured + routed to the
     * step that resolves them (never answered). Additive + optional; does NOT
     * participate in `evaluatePastoralSeed`. Resurfaced at Paso 8 / wizard.
     * Lazy type import to avoid a runtime cycle with the guided-sermon module.
     */
    openDoubts?: import('../guided-sermon/doubtRouting').RaisedDoubt[];

    /**
     * ADR-035 — perfil del pasaje (Capa 1), cristalizado al activar el estudio
     * (`schemaVersion`, reproducible). Condiciona el foco de los 8 pasos y la
     * cobertura al cierre. Additivo + opcional; NO participa en
     * `evaluatePastoralSeed`. Ausente ⇒ seed legacy: corre el flujo clásico sin
     * cobertura adaptativa (sin re-perfilar — rompería la cristalización).
     * Lazy type import para evitar un ciclo runtime con el módulo del perfil.
     */
    passageProfile?: import('./PassageProfile').PassageProfile;
}

/**
 * Per-step minimum-length thresholds. Centralised so the validators and
 * the step components surface identical guidance to the pastor.
 */
export const PASTORAL_SEED_THRESHOLDS = {
    reading: { firstImpressionMinChars: 50 },
    contextGenre: { genreImplicationMinChars: 60 },
    structuralAnalysis: { pastorNoteMinChars: 30 },
    wordStudies: {
        minWordStudies: 2,
        pastorDiscoveryMinChars: 30,
    },
    recognition: {
        minParallels: 1,
        maxParallels: 3,
        relevanceNoteMinChars: 30,
    },
    function: { originalAudienceFunctionMinChars: 100 },
    timelessPrinciple: { principleMinChars: 60 },
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

export function validateContextGenre(data: ContextGenreStepData | undefined): StepValidationResult {
    const reasons: string[] = [];
    if (!data) return { valid: false, reasons: ['Paso 2 (Contexto y Género) sin iniciar.'] };
    if (!data.genre) reasons.push('Falta confirmar el género literario del texto.');
    else if (!data.genreConfirmed) reasons.push('Confirma el género literario propuesto antes de continuar.');
    const len = countChars(data.genreImplication);
    const min = PASTORAL_SEED_THRESHOLDS.contextGenre.genreImplicationMinChars;
    if (len < min) {
        reasons.push(`Implicancia del género requiere ≥${min} caracteres (actual: ${len}).`);
    }
    return { valid: reasons.length === 0, reasons };
}

export function validateStructuralAnalysis(
    data: StructuralAnalysisStepData | undefined,
): StepValidationResult {
    const reasons: string[] = [];
    if (!data) return { valid: false, reasons: ['Paso 3 (Análisis Estructural) sin iniciar.'] };
    if (!data.mainClause?.reference?.trim()) reasons.push('Falta referencia de la oración principal.');
    const len = countChars(data.mainClause?.pastorNote);
    const min = PASTORAL_SEED_THRESHOLDS.structuralAnalysis.pastorNoteMinChars;
    if (len < min) reasons.push(`Nota sobre la oración principal requiere ≥${min} caracteres (actual: ${len}).`);
    return { valid: reasons.length === 0, reasons };
}

export function validateWordStudies(data: WordStudiesStepData | undefined): StepValidationResult {
    const reasons: string[] = [];
    if (!data) return { valid: false, reasons: ['Paso 4 (Estudio de Palabras) sin iniciar.'] };
    const t = PASTORAL_SEED_THRESHOLDS.wordStudies;
    const studies = data.studies ?? [];
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
    if (!data) return { valid: false, reasons: ['Paso 5 (Reconocimiento) sin iniciar.'] };
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
    if (!data) return { valid: false, reasons: ['Paso 6 (Función) sin iniciar.'] };
    const len = countChars(data.originalAudienceFunction);
    const min = PASTORAL_SEED_THRESHOLDS.function.originalAudienceFunctionMinChars;
    if (len < min) reasons.push(`Respuesta sobre función original requiere ≥${min} caracteres (actual: ${len}).`);
    return { valid: reasons.length === 0, reasons };
}

export function validateTimelessPrinciple(
    data: TimelessPrincipleStepData | undefined,
): StepValidationResult {
    const reasons: string[] = [];
    if (!data) return { valid: false, reasons: ['Paso 7 (Principio Atemporal) sin iniciar.'] };
    const len = countChars(data.principle);
    const min = PASTORAL_SEED_THRESHOLDS.timelessPrinciple.principleMinChars;
    if (len < min) reasons.push(`El principio teológico requiere ≥${min} caracteres (actual: ${len}).`);
    return { valid: reasons.length === 0, reasons };
}

export function validateInsight(data: InsightStepData | undefined): StepValidationResult {
    const reasons: string[] = [];
    if (!data) return { valid: false, reasons: ['Paso 8 (Insight) sin iniciar.'] };
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
    contextGenre: (seed) => validateContextGenre(seed.contextGenre),
    structuralAnalysis: (seed) => validateStructuralAnalysis(seed.structuralAnalysis),
    wordStudies: (seed) => validateWordStudies(seed.wordStudies),
    recognition: (seed) => validateRecognition(seed.recognition),
    function: (seed) => validateFunction(seed.function),
    timelessPrinciple: (seed) => validateTimelessPrinciple(seed.timelessPrinciple),
    insight: (seed) => validateInsight(seed.insight),
};

export const PASTORAL_SEED_STEP_ORDER: PastoralSeedStepKey[] = [
    'reading',
    'contextGenre',
    'structuralAnalysis',
    'wordStudies',
    'recognition',
    'function',
    'timelessPrinciple',
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
    /**
     * Optional literary genre, deterministically inferred from the passage's
     * book (`inferGenreFromBook`). When supplied, the genre is pre-set and
     * marked confirmed so the Context/Genre step validator only gates on the
     * pastor's interpretive IMPLICATION — without it, the genre stays empty and
     * the validator can never pass (the guided conversational flow has no UI to
     * confirm a proposed genre). The pastor still writes the implication.
     */
    genre?: LiteraryGenre;
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
        contextGenre: {
            genre: args.genre ?? '',
            genreConfirmed: Boolean(args.genre),
            genreImplication: '',
            bookLocationNote: '',
            historicalContextConsulted: false,
            timeSpentSeconds: 0,
        },
        structuralAnalysis: { mainClause: { reference: '', pastorNote: '' }, timeSpentSeconds: 0 },
        wordStudies: { studies: [], timeSpentSeconds: 0 },
        recognition: { parallels: [], timeSpentSeconds: 0 },
        function: { originalAudienceFunction: '', timeSpentSeconds: 0 },
        timelessPrinciple: { principle: '', timeSpentSeconds: 0 },
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
 * and documented in the manifesto + ADR-002 / ADR-022.
 */
export const PASTORAL_SEED_AI_FORBIDDEN_FIELDS = [
    'timelessPrinciple.principle',
    'insight.centralIdea',
    'insight.observations',
    'insight.openQuestion',
    'insight.pastoralAnecdote',
    'insight.doxologicalApplication',
] as const;

export type PastoralSeedAiForbiddenField = (typeof PASTORAL_SEED_AI_FORBIDDEN_FIELDS)[number];
