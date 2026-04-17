/**
 * SaveDetectiveSessionUseCase
 *
 * Application use case: Persists a completed Modo Detective investigation
 * session to Firestore for pedagogical analytics.
 *
 * Supports both verbal and nominal investigations via the discriminated union
 * type. Triggered when the student completes all investigation phases.
 */

import type {
  IDetectiveSessionRepository,
  DetectiveSession,
  DetectivePhaseResult,
  Binyan,
  VerbType,
  GrammaticalCategory,
  Gender,
  GrammaticalNumber,
  NominalState,
  VerbDetectiveSession,
  NominalDetectiveSession,
} from '@dosfilos/domain';
import { getPerformanceLabel, getSessionScore } from '@dosfilos/domain';

// ── Verb Session Input ────────────────────────────────────────────────────────

export interface SaveVerbDetectiveSessionInput {
  readonly kind: 'verb';
  readonly userId: string;
  readonly tenantId: string;
  readonly wordText: string;
  readonly verseReference: string;
  readonly expectedBinyan: Binyan;
  readonly expectedVerbType: VerbType;
  readonly phases: readonly DetectivePhaseResult[];
}

// ── Nominal Session Input ─────────────────────────────────────────────────────

export interface SaveNominalDetectiveSessionInput {
  readonly kind: 'nominal';
  readonly userId: string;
  readonly tenantId: string;
  readonly wordText: string;
  readonly verseReference: string;
  readonly expectedCategory: GrammaticalCategory;
  readonly expectedGender?: Gender;
  readonly expectedNumber?: GrammaticalNumber;
  readonly expectedState?: NominalState;
  readonly phases: readonly DetectivePhaseResult[];
}

export type SaveDetectiveSessionInput =
  | SaveVerbDetectiveSessionInput
  | SaveNominalDetectiveSessionInput;

// ── Output ────────────────────────────────────────────────────────────────────

export interface SaveDetectiveSessionOutput {
  readonly sessionId: string;
  readonly score: number;
  readonly performanceLabel: 'excellent' | 'good' | 'needs-practice';
}

// ── Use Case ──────────────────────────────────────────────────────────────────

export class SaveDetectiveSessionUseCase {
  constructor(private readonly repository: IDetectiveSessionRepository) {}

  async execute(input: SaveDetectiveSessionInput): Promise<SaveDetectiveSessionOutput> {
    const totalCorrect = input.phases.filter(p => p.correct).length;

    const session: Omit<VerbDetectiveSession, 'id'> | Omit<NominalDetectiveSession, 'id'> = input.kind === 'verb'
      ? ({
          type: 'verb',
          userId: input.userId,
          tenantId: input.tenantId,
          wordText: input.wordText,
          verseReference: input.verseReference,
          expectedBinyan: input.expectedBinyan,
          expectedVerbType: input.expectedVerbType,
          phases: input.phases,
          totalCorrect,
          completed: true,
          completedAt: new Date().toISOString(),
        } satisfies Omit<VerbDetectiveSession, 'id'>)
      : ({
          type: 'nominal',
          userId: input.userId,
          tenantId: input.tenantId,
          wordText: input.wordText,
          verseReference: input.verseReference,
          expectedCategory: input.expectedCategory,
          expectedGender: input.expectedGender,
          expectedNumber: input.expectedNumber,
          expectedState: input.expectedState,
          phases: input.phases,
          totalCorrect,
          completed: true,
          completedAt: new Date().toISOString(),
        } satisfies Omit<NominalDetectiveSession, 'id'>);

    const sessionId = await this.repository.saveSession(session);

    // getSessionScore needs a full session object; the id does not affect scoring
    const scorable = { ...session, id: sessionId } as DetectiveSession;
    const score = getSessionScore(scorable);
    const performanceLabel = getPerformanceLabel(score);

    return { sessionId, score, performanceLabel };
  }
}
