/**
 * SaveDetectiveSessionUseCase
 *
 * Application use case: Persists a completed Modo Detective investigation
 * session to Firestore for pedagogical analytics.
 *
 * Triggered when the student completes all 6 investigation phases.
 * The resulting data is used to identify patterns in student errors
 * (e.g., which binyanim are most frequently misidentified).
 */

import type {
  IDetectiveSessionRepository,
  DetectiveSession,
  PhaseResult,
  Binyan,
  VerbType,
} from '@dosfilos/domain';
import { getPerformanceLabel, getSessionScore } from '@dosfilos/domain';

export interface SaveDetectiveSessionInput {
  readonly userId: string;
  readonly tenantId: string;
  readonly verbText: string;
  readonly verseReference: string;
  readonly expectedBinyan: Binyan;
  readonly expectedVerbType: VerbType;
  readonly phases: readonly PhaseResult[];
}

export interface SaveDetectiveSessionOutput {
  readonly sessionId: string;
  readonly score: number;
  readonly performanceLabel: 'excellent' | 'good' | 'needs-practice';
}

export class SaveDetectiveSessionUseCase {
  constructor(private readonly repository: IDetectiveSessionRepository) {}

  async execute(input: SaveDetectiveSessionInput): Promise<SaveDetectiveSessionOutput> {
    const totalCorrect = input.phases.filter(p => p.correct).length;

    const session: Omit<DetectiveSession, 'id'> = {
      userId: input.userId,
      tenantId: input.tenantId,
      verbText: input.verbText,
      verseReference: input.verseReference,
      expectedBinyan: input.expectedBinyan,
      expectedVerbType: input.expectedVerbType,
      phases: input.phases,
      totalCorrect,
      completed: input.phases.length === 6,
      completedAt: new Date().toISOString(),
    };

    const sessionId = await this.repository.saveSession(session);

    const score = getSessionScore({ ...session, id: sessionId });
    const performanceLabel = getPerformanceLabel(score);

    return { sessionId, score, performanceLabel };
  }
}
