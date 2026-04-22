/**
 * ProgressiveHintList
 *
 * A hint list with progressive disclosure for the nominal detective.
 * Instead of showing all hints at once (which can give away answers),
 * hints are revealed in levels:
 *
 *  Level 0: Always visible (backward compat, or generic observation prompts)
 *  Level 1: Revealed when student clicks "💡 Necesito una pista"
 *  Level 2: Revealed when student clicks again
 *  Level 3: Never shown here — injected in the post-error feedback block
 *
 * This component is presentation-only; hint resolution and condition
 * evaluation remain in the HintEngine.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { HintDefinition } from '@dosfilos/domain';
import { HintList } from './HintList';

interface ProgressiveHintListProps {
  /** All resolved hints for this phase (including all levels) */
  hints: HintDefinition[];
  /** Optional class name */
  className?: string;
}

export function ProgressiveHintList({ hints, className = '' }: ProgressiveHintListProps) {
  const { t } = useTranslation('hebrewTutor');
  const [revealedLevel, setRevealedLevel] = useState(0);

  // Partition hints by level
  const { visibleHints, nextLevel, maxAvailableLevel } = useMemo(() => {
    // Separate hints into levels (level 3 = remedial, excluded from progressive reveal)
    const progressive = hints.filter(h => (h.level ?? 0) < 3);
    const visible = progressive.filter(h => (h.level ?? 0) <= revealedLevel);

    // Find the next unrevealed level (1 or 2)
    const unrevealed = progressive.filter(h => (h.level ?? 0) > revealedLevel);
    const next = unrevealed.length > 0
      ? Math.min(...unrevealed.map(h => h.level ?? 0))
      : null;

    const maxLevel = progressive.length > 0
      ? Math.max(...progressive.map(h => h.level ?? 0))
      : 0;

    return { visibleHints: visible, nextLevel: next, maxAvailableLevel: maxLevel };
  }, [hints, revealedLevel]);

  const handleRevealNext = () => {
    if (nextLevel !== null) {
      setRevealedLevel(nextLevel);
    }
  };

  // Count how many hint requests the student has made (for button label)
  const requestCount = revealedLevel;

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {/* Rendered visible hints */}
      {visibleHints.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <HintList hints={visibleHints} />
        </div>
      )}

      {/* "Need a hint" button — only shown if there are unrevealed hints */}
      {nextLevel !== null && (
        <button
          onClick={handleRevealNext}
          className={`
            w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl
            text-xs font-medium transition-all duration-200
            border border-dashed
            ${requestCount === 0
              ? 'border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20'
              : 'border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20'}
          `}
        >
          <span className="text-sm">
            {requestCount === 0 ? '💡' : '🔍'}
          </span>
          {requestCount === 0
            ? t('detective.hints.requestFirst', { defaultValue: 'Necesito una pista' })
            : t('detective.hints.requestMore', { defaultValue: 'Otra pista más' })}
        </button>
      )}
    </div>
  );
}

/**
 * Extracts only level-3 (remedial) hints from the full hint list.
 * These are shown in the post-error feedback block, not in the progressive list.
 */
export function getRemedialHints(hints: HintDefinition[]): HintDefinition[] {
  return hints.filter(h => (h.level ?? 0) === 3);
}
