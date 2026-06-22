/**
 * ADR-035 CA1 (D commit 5) — adapter client-side de `ICoverageEngagementJudge`
 * que proxya el juicio de engagement al callable `evaluateCoverageEngagement`
 * (tier Sonnet, server-side; la ANTHROPIC_API_KEY es secret de servidor).
 *
 * Espeja `CallableLlmClient`: el use case corre client-side, el LLM vive detrás
 * de un callable con App Check + auth. El use case llama al PUERTO; este adapter
 * es el único que sabe del callable.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
    CoverageEngagementInput,
    ICoverageEngagementJudge,
    MisreadingJudgment,
} from '@dosfilos/domain';

export class CallableCoverageEngagementJudge implements ICoverageEngagementJudge {
    async judge(input: CoverageEngagementInput): Promise<MisreadingJudgment> {
        const callable = httpsCallable(getFunctions(), 'evaluateCoverageEngagement');
        const response = await callable(input);
        const data = response.data as { judgment?: MisreadingJudgment };
        if (
            !data?.judgment ||
            typeof data.judgment.substantive !== 'boolean' ||
            typeof data.judgment.engagedAnchor !== 'boolean' ||
            typeof data.judgment.contradictsAnchor !== 'boolean'
        ) {
            throw new Error('evaluateCoverageEngagement returned no valid judgment.');
        }
        return data.judgment;
    }
}
