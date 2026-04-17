/**
 * Detective Session domain entities.
 *
 * Represents a single "Modo Detective" investigation by a student,
 * tracking their answers across all 6 phases and persisting results
 * to Firestore for pedagogical analytics.
 */

import type { Binyan, VerbType } from '../value-objects/grammar.js';

// ── Phase Result ──────────────────────────────────────────────────────────────

/**
 * All investigation phases in the Detective Mode.
 *
 * The flow bifurcates after TRIAGE:
 *  - Strong verb path : OBSERVE → TRIAGE → COLORS → DAGESH → BINYAN → STRONG_CONFIRM
 *  - Weak verb path   : OBSERVE → TRIAGE → PREFORMATIVE → WEAK_ROOT → WEAK_BINYAN → WEAK_TYPE
 *
 * Values must remain stable — they are persisted in Firestore.
 */
export enum DetectivePhase {
  // ── Phases shared by both paths ──────────────────────────────────────────
  OBSERVE        = 1,   // ¿Es verbo?
  TRIAGE         = 7,   // ¿Cuántas radicales ves? (determines path)

  // ── Strong verb path ──────────────────────────────────────────────────────
  COLORS         = 2,   // Tirar los colores morfológicos
  DAGESH         = 4,   // ¿Hay dagesh forte en R2?
  BINYAN         = 5,   // Diagnóstico del binyan (Lec. 1-7)
  STRONG_CONFIRM = 6,   // Confirmar: ¿Fuerte o Débil? (valor = viejo WEAK_VERB)

  // ── Weak verb path ────────────────────────────────────────────────────────
  PREFORMATIVE   = 10,  // ¿Cuál es la vocal del preformativo? (Lec. 8)
  WEAK_ROOT      = 11,  // ¿Qué radical falta o se transforma?
  WEAK_BINYAN    = 12,  // Diagnóstico del binyan con claves de la Lec. 8
  WEAK_TYPE      = 13,  // (Placeholder — not currently used in any path)

  // ── Final synthesis — both paths ──────────────────────────────────────────
  TRANSLATION    = 20,  // Síntesis: ¿Cómo se traduce este verbo en contexto?
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

// ── Detective Session ─────────────────────────────────────────────────────────

/**
 * Aggregate root for a single detective investigation session.
 * One session = one verb investigated through all 6 phases.
 */
export interface DetectiveSession {
  /** Auto-generated Firestore document ID */
  readonly id?: string;
  /** Firebase Auth UID of the student */
  readonly userId: string;
  /** Tenant (church/seminary) identifier */
  readonly tenantId: string;
  /** Hebrew text of the investigated verb, e.g. "וַיְהִי" */
  readonly verbText: string;
  /** Verse reference, e.g. "Jonás 1:1" */
  readonly verseReference: string;
  /** The correct binyan (from Gemini analysis) */
  readonly expectedBinyan: Binyan;
  /** The correct verb type (from Gemini analysis) */
  readonly expectedVerbType: VerbType;
  /** Ordered results for each of the 6 phases */
  readonly phases: readonly PhaseResult[];
  /** Number of phases answered correctly (0-6) */
  readonly totalCorrect: number;
  /** Whether ALL 6 phases were completed */
  readonly completed: boolean;
  /** ISO timestamp when the session was finished */
  readonly completedAt: string;
}

// ── Factory / Scoring ─────────────────────────────────────────────────────────

/** Creates a new in-progress session (before phases are completed). */
export function createDetectiveSession(params: {
  userId: string;
  tenantId: string;
  verbText: string;
  verseReference: string;
  expectedBinyan: Binyan;
  expectedVerbType: VerbType;
}): Omit<DetectiveSession, 'id'> {
  return {
    ...params,
    phases: [],
    totalCorrect: 0,
    completed: false,
    completedAt: '',
  };
}

/** Returns score percentage (0–100) for a completed session. */
export function getSessionScore(session: DetectiveSession): number {
  if (session.phases.length === 0) return 0;
  return Math.round((session.totalCorrect / session.phases.length) * 100);
}

/** Returns a human-readable performance label. */
export function getPerformanceLabel(score: number): 'excellent' | 'good' | 'needs-practice' {
  if (score >= 83) return 'excellent';    // 5-6 correct
  if (score >= 50) return 'good';         // 3-4 correct
  return 'needs-practice';               // 0-2 correct
}
