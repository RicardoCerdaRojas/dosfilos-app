/**
 * DiscoveryWordStepper
 *
 * Displays the verse words in RTL order as an interactive stepper.
 * Each word shows its status (pending/active/completed) and the student's
 * translation once completed. The active word pulses to draw attention.
 *
 * Words are laid out in a flex-wrap container with RTL direction,
 * matching natural Hebrew reading order.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2Icon, CircleDotIcon, CircleIcon } from 'lucide-react';
import type { DiscoveryWordState } from '../../hooks/useDiscoveryMode';

interface DiscoveryWordStepperProps {
  readonly words: readonly DiscoveryWordState[];
  readonly activeWordIndex: number;
  readonly onWordClick: (index: number) => void;
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'border-border/60 bg-muted/20 opacity-60',
  active:    'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md',
  completed: 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20',
};

export const DiscoveryWordStepper: React.FC<DiscoveryWordStepperProps> = ({
  words,
  activeWordIndex,
  onWordClick,
}) => {
  const { t } = useTranslation('hebrewTutor');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('discovery.stepper.title', { defaultValue: 'Palabras del versículo' })}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t('discovery.stepper.progress', {
            defaultValue: '{{completed}}/{{total}} completadas',
            completed: words.filter(w => w.status === 'completed').length,
            total: words.length,
          })}
        </span>
      </div>

      {/* RTL word grid */}
      <div className="flex flex-wrap gap-2" dir="rtl">
        {words.map((dw, i) => {
          const isActive = i === activeWordIndex && dw.status === 'active';
          const isClickable = dw.status === 'completed';

          return (
            <button
              key={i}
              onClick={() => isClickable && onWordClick(i)}
              disabled={!isClickable}
              className={`
                relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border-2
                transition-all duration-300
                ${STATUS_STYLES[dw.status]}
                ${isActive ? 'animate-pulse-slow' : ''}
                ${isClickable ? 'cursor-pointer hover:border-emerald-500 hover:shadow-sm' : 'cursor-default'}
              `}
            >
              {/* Status icon */}
              <div className="absolute -top-1.5 -right-1.5">
                {dw.status === 'completed' && (
                  <CheckCircle2Icon className="w-4 h-4 text-emerald-500 fill-emerald-100 dark:fill-emerald-900/50" />
                )}
                {dw.status === 'active' && (
                  <CircleDotIcon className="w-4 h-4 text-indigo-500 animate-pulse" />
                )}
                {dw.status === 'pending' && (
                  <CircleIcon className="w-3.5 h-3.5 text-muted-foreground/40" />
                )}
              </div>

              {/* Hebrew text */}
              <span
                dir="rtl"
                lang="he"
                className={`
                  text-lg font-semibold leading-tight
                  ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'}
                `}
                style={{ fontFamily: "'SBL Hebrew', 'Ezra SIL', serif" }}
              >
                {dw.word.hebrewText}
              </span>

              {/* Student translation (if completed) */}
              {dw.status === 'completed' && dw.studentTranslation && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium max-w-[120px] truncate">
                  {dw.studentTranslation}
                </span>
              )}

              {/* Word index label */}
              <span className="text-[9px] text-muted-foreground/50 font-mono">
                {i + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Subtle animation keyframe */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
        }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
