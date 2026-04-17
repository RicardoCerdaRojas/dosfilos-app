/**
 * hint-engine.ts
 *
 * Pure application-layer service that resolves which hints should be shown
 * for a given WordAnalysis and DetectivePhase.
 *
 * Has no React dependency — fully testable as a plain function.
 */

import type { WordAnalysis, HintDefinition } from '@dosfilos/domain';
import { HINT_ALL_PHASES, HintConditionKey } from '@dosfilos/domain';
import { HINT_CONDITIONS } from './hint-conditions';

/**
 * Evaluates a single condition key against a word.
 * Falls back to false if the key is unknown (forward-compatibility guard).
 */
function evaluateCondition(word: WordAnalysis, key: HintConditionKey): boolean {
  const fn = HINT_CONDITIONS[key];
  if (!fn) {
    console.warn(`[HintEngine] Unknown condition key: ${key}`);
    return false;
  }
  return fn(word);
}

/**
 * Resolves the list of hints that apply to a given word and phase.
 *
 * A hint is shown when:
 *  1. It is enabled
 *  2. Its phase matches the current phase OR is HINT_ALL_PHASES
 *  3. ALL of its `conditions` evaluate to true (AND logic)
 *  4. NONE of its `excludeConditions` evaluate to true (NOT logic)
 *
 * Returns hints sorted by their `order` field.
 */
export function resolveHints(
  catalog: readonly HintDefinition[],
  word: WordAnalysis,
  phase: number,
): HintDefinition[] {
  return catalog
    .filter(hint => {
      if (!hint.enabled) return false;

      // Phase scope
      const phaseMatches =
        hint.phase === HINT_ALL_PHASES || hint.phase === phase;
      if (!phaseMatches) return false;

      // All include-conditions must be true
      const conditionsMet =
        hint.conditions.length === 0 ||
        hint.conditions.every(key => evaluateCondition(word, key));
      if (!conditionsMet) return false;

      // No exclude-condition may be true
      const notExcluded =
        hint.excludeConditions.length === 0 ||
        !hint.excludeConditions.some(key => evaluateCondition(word, key));
      return notExcluded;
    })
    .sort((a, b) => a.order - b.order);
}
