/**
 * VerseAnalyzerPage
 *
 * Main page for the "Analizador de Versículos" tool.
 * Layout: sidebar selector (left) + result area (right/main).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpenIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { VerseSelector } from './components/VerseSelector';
import { VerseAnalysisResult } from './components/VerseAnalysisResult';
import { HebrewLoadingTips } from './components/HebrewLoadingTips';
import { useVerseAnalysis } from './hooks/useVerseAnalysis';

export const VerseAnalyzerPage: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(true);
  const { t } = useTranslation('hebrewTutor');
  const {
    selectedBook,
    selectedChapter,
    selectedVerse,
    bookIndex,
    analysis,
    isLoadingIndex,
    isAnalyzing,
    error,
    setBook,
    setChapter,
    setVerse,
    analyze,
    clearError,
    canReanalyze,
  } = useVerseAnalysis();

  return (
    <div className="flex flex-col h-full min-h-0 w-full relative print:block print:h-auto">
      {/* ── Top Header with Actions ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t('verseAnalyzer.title')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t('verseAnalyzer.description')}
          </p>
        </div>
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetTrigger asChild>
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors shrink-0">
               <BookOpenIcon className="w-4 h-4" />
               Cambiar Versículo
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[340px] sm:w-[400px] overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle>Navegador Bíblico</SheetTitle>
              <SheetDescription>Selecciona el libro, capítulo y versículo</SheetDescription>
            </SheetHeader>
            <div className="pt-2">
              <VerseSelector
                selectedBook={selectedBook}
                selectedChapter={selectedChapter}
                selectedVerse={selectedVerse}
                bookIndex={bookIndex}
                isLoadingBook={isLoadingIndex}
                onBookChange={setBook}
                onChapterChange={setChapter}
                onVerseChange={setVerse}
                onAnalyze={() => {
                  analyze(false);
                  setIsDrawerOpen(false);
                }}
                isAnalyzing={isAnalyzing}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Main: analysis result ────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto print:overflow-visible print:block">
        {/* Error banner */}
        {error && (
          <div
            id="ht-error-banner"
            className="mb-4 flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4"
          >
            <span className="text-destructive text-lg">⚠</span>
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
            <button onClick={clearError} className="text-destructive/60 hover:text-destructive text-lg leading-none">
              ×
            </button>
          </div>
        )}

        {isAnalyzing && <HebrewLoadingTips />}

        {/* Result */}
        {!isAnalyzing && analysis && (
          <VerseAnalysisResult
            analysis={analysis}
            canForceRefresh={canReanalyze}
            onForceRefresh={() => analyze(true)}
          />
        )}

        {/* Empty state */}
        {!isAnalyzing && !analysis && !error && (
          <EmptyState t={t} />
        )}
      </main>
    </div>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ t: (key: string) => string }> = ({ t }) => (
  <div className="flex flex-col items-center justify-center h-full py-20 text-center">
    {/* Decorative Hebrew letters */}
    <div className="text-6xl font-serif text-muted-foreground/20 mb-6 leading-none" dir="rtl" lang="he">
      אָמַר יְהוָה
    </div>
    <h2 className="text-lg font-semibold text-foreground mb-2">
      {t('verseAnalyzer.placeholder.title')}
    </h2>
    <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
      {t('verseAnalyzer.placeholder.description')}
    </p>
  </div>
);
