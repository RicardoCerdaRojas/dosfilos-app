/**
 * TranslationBuilder
 *
 * Displayed at the bottom of the discovery word-by-word investigation.
 * Accumulates each word's translation as the student completes them,
 * forming a growing sentence. Shows the verse reference and a progress bar.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DiscoveryWordState } from '../../hooks/useDiscoveryMode';
import { PenLineIcon } from 'lucide-react';

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
    .map((w) => w.studentTranslation);

  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-muted/10 to-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <PenLineIcon className="w-4 h-4 text-indigo-500" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('discovery.builder.title', { defaultValue: 'Tu Traducción' })}
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground">{verseReference}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted/30 relative">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Translation sentence */}
      <div className="px-4 py-4 min-h-[56px]">
        {translationFragments.length > 0 ? (
          <p className="text-sm text-foreground leading-relaxed">
            {translationFragments.map((frag, i) => (
              <React.Fragment key={i}>
                <span className="bg-emerald-100/50 dark:bg-emerald-900/20 px-1 py-0.5 rounded text-emerald-800 dark:text-emerald-300 font-medium">
                  {frag}
                </span>
                {i < translationFragments.length - 1 && <span className="text-muted-foreground mx-0.5"> </span>}
              </React.Fragment>
            ))}
            {completedCount < totalWords && (
              <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-1 align-middle animate-blink" />
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {t('discovery.builder.empty', { defaultValue: 'Las traducciones aparecerán aquí a medida que completes cada palabra...' })}
          </p>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {t('discovery.builder.words', {
            defaultValue: '{{count}} de {{total}} palabras',
            count: completedCount,
            total: totalWords,
          })}
        </span>
        <span className="font-mono">{Math.round(percentage)}%</span>
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
