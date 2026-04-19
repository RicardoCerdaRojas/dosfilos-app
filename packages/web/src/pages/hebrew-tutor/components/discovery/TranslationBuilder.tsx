/**
 * TranslationBuilder
 *
 * Displayed at the bottom of the discovery word-by-word investigation.
 * Accumulates each word's translation as the student completes them,
 * forming a growing sentence. Shows the verse reference and a progress bar.
 *
 * Visual design:
 *  - Card with subtle gradient background
 *  - Growing sentence displayed as connected chips
 *  - Blinking cursor at the insertion point
 *  - Animated entry for new words
 *  - Progress indicator with word count
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DiscoveryWordState } from '../../hooks/useDiscoveryMode';
import { PenLineIcon, SparklesIcon } from 'lucide-react';

interface TranslationBuilderProps {
  readonly words: readonly DiscoveryWordState[];
  readonly verseReference: string;
  readonly completedCount: number;
  readonly totalWords: number;
}

export const TranslationBuilder: React.FC<TranslationBuilderProps> = ({
  words,
  verseReference,
  completedCount,
  totalWords,
}) => {
  const { t } = useTranslation('hebrewTutor');
  const percentage = totalWords > 0 ? (completedCount / totalWords) * 100 : 0;

  // Build the visible sentence from completed translations
  const translationFragments = words
    .filter((w) => w.status === 'completed' && w.studentTranslation)
    .map((w) => ({ text: w.studentTranslation, hebrew: w.word.hebrewText }));

  const hasTranslations = translationFragments.length > 0;

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/10">
        <div className="flex items-center gap-2">
          <PenLineIcon className="w-3.5 h-3.5 text-indigo-500" />
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('discovery.builder.title', { defaultValue: 'Tu Traducción' })}
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground">{verseReference}</span>
      </div>

      {/* Translation sentence area */}
      <div className="px-4 py-5 min-h-[80px] relative">
        {hasTranslations ? (
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-2 leading-relaxed">
            {translationFragments.map((frag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30 animate-in fade-in slide-in-from-bottom-1 duration-300"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  {frag.text}
                </span>
                <span
                  className="text-[9px] text-emerald-500/60 dark:text-emerald-500/40 font-hebrew"
                  dir="rtl"
                  lang="he"
                  style={{ fontFamily: "'SBL Hebrew', 'Ezra SIL', serif" }}
                >
                  {frag.hebrew}
                </span>
              </span>
            ))}
            {completedCount < totalWords && (
              <span className="inline-block w-0.5 h-5 bg-indigo-500 rounded-full animate-blink ml-0.5" />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-3 text-center">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t('discovery.builder.empty', {
                defaultValue: 'Investiga cada palabra para construir tu traducción...',
              })}
            </p>
          </div>
        )}
      </div>

      {/* Footer with progress */}
      <div className="border-t border-border/30 bg-muted/10">
        {/* Progress bar */}
        <div className="h-[2px] bg-muted/20 relative">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-[11px] text-muted-foreground">
          <span>
            {t('discovery.builder.words', {
              defaultValue: '{{count}} de {{total}} palabras',
              count: completedCount,
              total: totalWords,
            })}
          </span>
          <span className="font-mono font-medium">{Math.round(percentage)}%</span>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .animate-blink { animation: blink 1s step-end infinite; }
      `}</style>
    </div>
  );
};
