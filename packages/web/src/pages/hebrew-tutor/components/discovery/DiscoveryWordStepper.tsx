/**
 * DiscoveryWordStepper
 *
 * Displays the verse words in RTL order as an interactive stepper.
 * Each word shows its status (pending/active/completed) and the student's
 * translation once completed.
 *
 * Visual design:
 *  - Horizontal scrollable strip with RTL direction
 *  - Active word has a glowing ring + pulse animation
 *  - Completed words show a check badge and green tint
 *  - Pending words are semi-transparent with dashed border
 *  - A progress bar runs underneath the entire strip
 */

import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2Icon } from 'lucide-react';
import type { DiscoveryWordState } from '../../hooks/useDiscoveryMode';

interface DiscoveryWordStepperProps {
  readonly words: readonly DiscoveryWordState[];
  readonly activeWordIndex: number;
  readonly onWordClick: (index: number) => void;
}

export const DiscoveryWordStepper: React.FC<DiscoveryWordStepperProps> = ({
  words,
  activeWordIndex,
  onWordClick,
}) => {
  const { t } = useTranslation('hebrewTutor');
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const completedCount = words.filter(w => w.status === 'completed').length;
  const percentage = words.length > 0 ? (completedCount / words.length) * 100 : 0;

  // Auto-scroll to active word
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeWordIndex]);

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/10">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('discovery.stepper.title', { defaultValue: 'Palabras del versículo' })}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {completedCount > 0 && (
              <CheckCircle2Icon className="w-3 h-3 text-emerald-500" />
            )}
            <span className="text-[11px] font-medium text-muted-foreground">
              {completedCount}/{words.length}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-muted/20 relative">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 transition-all duration-700 ease-out rounded-r-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Word strip */}
      <div
        ref={scrollRef}
        className="flex gap-2 p-3 overflow-x-auto scrollbar-thin scrollbar-thumb-border/40"
        dir="rtl"
      >
        {words.map((dw, i) => {
          const isActive = i === activeWordIndex && dw.status === 'active';
          const isCompleted = dw.status === 'completed';
          const isPending = dw.status === 'pending';
          const isClickable = isCompleted;

          return (
            <button
              key={i}
              ref={isActive ? activeRef : undefined}
              onClick={() => isClickable && onWordClick(i)}
              disabled={!isClickable}
              className={`
                relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl
                border-2 transition-all duration-300 shrink-0 min-w-[60px]
                ${isActive
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-lg shadow-indigo-500/15 scale-105 discovery-word-glow'
                  : isCompleted
                    ? 'border-emerald-400/50 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-500 hover:shadow-sm cursor-pointer'
                    : 'border-dashed border-border/40 bg-muted/10 opacity-40'
                }
              `}
            >
              {/* Completed badge */}
              {isCompleted && (
                <div className="absolute -top-1.5 -left-1.5">
                  <CheckCircle2Icon className="w-4 h-4 text-emerald-500 drop-shadow-sm" />
                </div>
              )}

              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                  <span className="flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  </span>
                </div>
              )}

              {/* Hebrew text */}
              <span
                dir="rtl"
                lang="he"
                className={`
                  text-base font-semibold leading-tight whitespace-nowrap
                  ${isActive
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : isCompleted
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }
                `}
                style={{ fontFamily: "'SBL Hebrew', 'Ezra SIL', serif" }}
              >
                {dw.word.hebrewText}
              </span>

              {/* Student translation (if completed) */}
              {isCompleted && dw.studentTranslation && (
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium max-w-[80px] truncate leading-none">
                  {dw.studentTranslation}
                </span>
              )}

              {/* Pending placeholder */}
              {isPending && (
                <span className="text-[9px] text-muted-foreground/30">
                  {i + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes discovery-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.25); }
          50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
        }
        .discovery-word-glow { animation: discovery-glow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
