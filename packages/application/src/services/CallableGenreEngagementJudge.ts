/**
 * Redacción v2 Fase 1 (§4.4) A3 — adapter client-side de `IGenreEngagementJudge`
 * que proxya el juicio al callable `evaluateGenreEngagement` (tier Sonnet,
 * server-side). Hermano de `CallableCoverageEngagementJudge`.
 *
 * FAIL-CLOSED: si el callable falla o devuelve algo inválido, NO lanza — devuelve
 * el judgment neutro (no engancha, no contradice) para que el dispatch NO
 * confronte ni confirme. Mejor no confrontar que confrontar con dato dudoso. El
 * `verdict:'unclear'` (para la sombra) viaja en la respuesta del callable y lo
 * consume el path de registro por separado, no el puerto.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type { GenreEngagementInput, GenreEngagementJudgment, IGenreEngagementJudge } from '@dosfilos/domain';

/** Judgment neutro: ni confronta ni confirma (fail-closed del dispatch). */
const SAFE_NON_CONFRONT: GenreEngagementJudgment = {
    substantive: true,
    engagedAnchor: false,
    contradictsAnchor: false,
};

export class CallableGenreEngagementJudge implements IGenreEngagementJudge {
    async judge(input: GenreEngagementInput): Promise<GenreEngagementJudgment> {
        try {
            const callable = httpsCallable(getFunctions(), 'evaluateGenreEngagement');
            const response = await callable(input);
            const data = response.data as { judgment?: Partial<GenreEngagementJudgment> };
            const j = data?.judgment;
            if (
                !j ||
                typeof j.substantive !== 'boolean' ||
                typeof j.engagedAnchor !== 'boolean' ||
                typeof j.contradictsAnchor !== 'boolean'
            ) {
                return SAFE_NON_CONFRONT;
            }
            return { substantive: j.substantive, engagedAnchor: j.engagedAnchor, contradictsAnchor: j.contradictsAnchor };
        } catch {
            // Fail-closed: la caída del juez no confronta al pastor.
            return SAFE_NON_CONFRONT;
        }
    }
}
