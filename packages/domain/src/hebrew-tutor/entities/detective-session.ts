/**
 * Detective Session domain entities.
 *
 * Represents a single "Modo Detective" investigation by a student,
 * tracking their answers across all phases and persisting results
 * to Firestore for pedagogical analytics.
 *
 * Sessions are typed via a discriminated union (type: 'verb' | 'nominal')
 * so the application layer can safely narrow to the concrete session type.
 */

import type {
  Binyan,
  VerbType,
  GrammaticalCategory,
  Gender,
  GrammaticalNumber,
  NominalState,
} from '../value-objects/grammar.js';

// ── Phase Result ──────────────────────────────────────────────────────────────

/**
 * All investigation phases in the Detective Mode.
 *
 * Verb flow bifurcates after TRIAGE:
 *  - Strong path: OBSERVE → TRIAGE → COLORS → DAGESH → BINYAN → STRONG_CONFIRM
 *  - Weak path:   OBSERVE → TRIAGE → PREFORMATIVE → WEAK_ROOT → WEAK_BINYAN
 *  - Both paths end with: TRANSLATION
 *
 * Nominal flow is linear:
 *  OBSERVE → NOMINAL_CLASSIFY → NOMINAL_ARTICLE → NOMINAL_GENDER → NOMINAL_NUMBER → NOMINAL_STATE → TRANSLATION
 *
 * Values must remain stable — they are persisted in Firestore.
 */
export enum DetectivePhase {
  // ── Phases shared by all paths ────────────────────────────────────────────
  OBSERVE        = 1,   // ¿Qué tipo de palabra es?
  TRIAGE         = 7,   // ¿Cuántas radicales ves? (determines verb path)

  // ── Strong verb path ──────────────────────────────────────────────────────
  COLORS         = 2,   // Tirar los colores morfológicos
  DAGESH         = 4,   // ¿Hay dagesh forte en R2?
  BINYAN         = 5,   // Diagnóstico del binyan (Lec. 1-7)
  STRONG_CONFIRM = 6,   // Confirmar: ¿Fuerte puro o gutural?

  // ── Weak verb path ────────────────────────────────────────────────────────
  PREFORMATIVE   = 10,  // ¿Cuál es la vocal del preformativo? (Lec. 8)
  WEAK_ROOT      = 11,  // ¿Qué radical falta o se transforma?
  WEAK_BINYAN    = 12,  // Diagnóstico del binyan con claves de la Lec. 8

  // ── Final synthesis — all paths ───────────────────────────────────────────
  TRANSLATION    = 20,  // Síntesis: ¿Cómo se traduce esta palabra en contexto?

  // ── Nominal (non-verb) path ───────────────────────────────────────────────
  NOMINAL_CLASSIFY = 30,  // ¿Sustantivo, adjetivo, pronombre o partícula?
  NOMINAL_ARTICLE  = 31,  // ¿Tiene artículo definido (הַ)?
  NOMINAL_GENDER   = 32,  // ¿Masculino, femenino o común?
  NOMINAL_NUMBER   = 33,  // ¿Singular, plural o dual?
  NOMINAL_STATE    = 34,  // ¿Estado absoluto o constructo?
}

/** Result for a single phase in the detective investigation. */
export interface PhaseResult {
  readonly phase: DetectivePhase;
  /** The answer selected/submitted by the student */
  readonly userAnswer: string;
  /** The correct expected answer */
  readonly correctAnswer: string;
  /** Whether the student's answer was correct */
  readonly correct: boolean;
  /** Timestamp when the student submitted this phase */
  readonly completedAt: Date;
}

// ── Detective Session (discriminated union) ───────────────────────────────────

/**
 * Common fields shared by all detective session types.
 */
interface DetectiveSessionBase {
  /** Auto-generated Firestore document ID */
  readonly id?: string;
  /** Firebase Auth UID of the student */
  readonly userId: string;
  /** Tenant (church/seminary) identifier */
  readonly tenantId: string;
  /** Hebrew text of the investigated word, e.g. "וַיְהִי" */
  readonly wordText: string;
  /** Verse reference, e.g. "Jonás 1:1" */
  readonly verseReference: string;
  /** Ordered results for each phase */
  readonly phases: readonly PhaseResult[];
  /** Number of phases answered correctly */
  readonly totalCorrect: number;
  /** Whether ALL phases were completed */
  readonly completed: boolean;
  /** ISO timestamp when the session was finished */
  readonly completedAt: string;
}

/** Session for a verbal investigation (strong or weak path). */
export interface VerbDetectiveSession extends DetectiveSessionBase {
  readonly type: 'verb';
  /** The correct binyan (from Gemini analysis) */
  readonly expectedBinyan: Binyan;
  /** The correct verb type (from Gemini analysis) */
  readonly expectedVerbType: VerbType;
}

/** Session for a nominal (non-verb) investigation. */
export interface NominalDetectiveSession extends DetectiveSessionBase {
  readonly type: 'nominal';
  /** Primary grammatical category (NOUN, ADJECTIVE, PRONOUN, PARTICLE…) */
  readonly expectedCategory: GrammaticalCategory;
  /** Expected gender if applicable */
  readonly expectedGender?: Gender;
  /** Expected grammatical number if applicable */
  readonly expectedNumber?: GrammaticalNumber;
  /** Expected state (absolute / construct) for nouns and adjectives */
  readonly expectedState?: NominalState;
}

/**
 * Discriminated union. Use the `type` field to narrow to the concrete type.
 *
 * Existing Firestore documents without a `type` field should be read as
 * `type: 'verb'` by the infrastructure adapter for backward compatibility.
 */
export type DetectiveSession = VerbDetectiveSession | NominalDetectiveSession;

// ── Factory / Scoring ─────────────────────────────────────────────────────────

/** Creates a new in-progress verbal detective session. */
export function createVerbDetectiveSession(params: {
  userId: string;
  tenantId: string;
  wordText: string;
  verseReference: string;
  expectedBinyan: Binyan;
  expectedVerbType: VerbType;
}): Omit<VerbDetectiveSession, 'id'> {
  return {
    type: 'verb',
    ...params,
    phases: [],
    totalCorrect: 0,
    completed: false,
    completedAt: '',
  };
}

/** Creates a new in-progress nominal detective session. */
export function createNominalDetectiveSession(params: {
  userId: string;
  tenantId: string;
  wordText: string;
  verseReference: string;
  expectedCategory: GrammaticalCategory;
  expectedGender?: Gender;
  expectedNumber?: GrammaticalNumber;
  expectedState?: NominalState;
}): Omit<NominalDetectiveSession, 'id'> {
  return {
    type: 'nominal',
    ...params,
    phases: [],
    totalCorrect: 0,
    completed: false,
    completedAt: '',
  };
}

/**
 * @deprecated Use {@link createVerbDetectiveSession} instead.
 * Kept for backward compatibility with existing call sites that pass `verbText`.
 */
export function createDetectiveSession(params: {
  userId: string;
  tenantId: string;
  verbText: string;
  verseReference: string;
  expectedBinyan: Binyan;
  expectedVerbType: VerbType;
}): Omit<VerbDetectiveSession, 'id'> {
  return createVerbDetectiveSession({
    ...params,
    wordText: params.verbText,
  });
}

/** Returns score percentage (0–100) for a completed session. */
export function getSessionScore(session: DetectiveSession): number {
  if (session.phases.length === 0) return 0;
  return Math.round((session.totalCorrect / session.phases.length) * 100);
}

/** Returns a human-readable performance label. */
export function getPerformanceLabel(score: number): 'excellent' | 'good' | 'needs-practice' {
  if (score >= 83) return 'excellent';    // 5+ correct
  if (score >= 50) return 'good';         // 3-4 correct
  return 'needs-practice';               // 0-2 correct
}
