/**
 * HebrewTutorPage
 *
 * Entry point for the Hebrew Tutor module, wrapped in the provider.
 * Supports two modes:
 *   - Analyzer: traditional full-verse analysis (VerseAnalyzerPage)
 *   - Discovery: word-by-word investigation first, then comparison (DiscoveryModePage)
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HebrewTutorProvider } from './HebrewTutorProvider';
import { VerseAnalyzerPage } from './VerseAnalyzerPage';
import { DiscoveryModePage } from './DiscoveryModePage';
import { BookOpenIcon, CompassIcon } from 'lucide-react';

type TutorMode = 'analyzer' | 'discovery';

export const HebrewTutorPage: React.FC = () => {
  const [mode, setMode] = useState<TutorMode>('analyzer');
  const { t } = useTranslation('hebrewTutor');

  return (
    <div className="flex flex-col h-full bg-background print:block print:h-auto">
      <HebrewTutorProvider>
        {/* ── Mode switcher ────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 px-4 sm:px-6 lg:px-8 pt-4 print:hidden">
          <div className="inline-flex rounded-xl bg-muted/40 border border-border/30 p-1 shadow-sm">
            <button
              onClick={() => setMode('analyzer')}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                ${mode === 'analyzer'
                  ? 'bg-background text-foreground shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}
              `}
            >
              <BookOpenIcon className="w-3.5 h-3.5" />
              {t('modes.analyzer', { defaultValue: 'Analizador' })}
            </button>
            <button
              onClick={() => setMode('discovery')}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                ${mode === 'discovery'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-200/60 dark:border-indigo-800/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}
              `}
            >
              <CompassIcon className="w-3.5 h-3.5" />
              {t('modes.discovery', { defaultValue: 'Descubrimiento' })}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 print:p-0 print:overflow-visible print:block print:h-auto">
          {mode === 'analyzer' ? <VerseAnalyzerPage /> : <DiscoveryModePage />}
        </div>
      </HebrewTutorProvider>
    </div>
  );
};
