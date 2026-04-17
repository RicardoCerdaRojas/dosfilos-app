/**
 * VerseAnalyzerPage
 *
 * Main page for the "Analizador de Versículos" tool.
 *
 * Desktop (md+): persistent VerseNavBar replaces the Sheet modal.
 * Mobile:        compact top bar + improved Sheet drawer.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpenIcon, MenuIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { VerseSelector } from './components/VerseSelector';
import { VerseNavBar } from './components/VerseNavBar';
import { VerseAnalysisResult } from './components/VerseAnalysisResult';
import { VersePreview } from './components/VersePreview';
import { HebrewLoadingTips } from './components/HebrewLoadingTips';
import { useVerseAnalysis } from './hooks/useVerseAnalysis';
import { HEBREW_BOOKS_CATALOG } from '@dosfilos/infrastructure';

export const VerseAnalyzerPage: React.FC = () => {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);
  const { t } = useTranslation('hebrewTutor');
  const {
    selectedBook,
    selectedChapter,
    selectedVerse,
    bookIndex,
    analysis,
    hebrewVerse,
    isLoadingIndex,
    isAnalyzing,
    isLoadingVerse,
    error,
    setBook,
    setChapter,
    setVerse,
    analyze,
    clearError,
    canReanalyze,
    navigate,
    nextVerse,
    prevVerse,
  } = useVerseAnalysis();

  const currentBookName =
    HEBREW_BOOKS_CATALOG.find((b) => b.morphhbKey === selectedBook)?.nameSpanish ?? selectedBook;

  return (
    <div className="flex flex-col h-full min-h-0 w-full relative print:block print:h-auto">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-4 print:hidden">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('verseAnalyzer.title')}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t('verseAnalyzer.description')}</p>
          </div>

          {/* Mobile only: menu button */}
          <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors shrink-0">
                <MenuIcon className="w-4 h-4" />
                <span className="text-xs">{currentBookName} {selectedChapter}:{selectedVerse}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
              <SheetHeader className="pb-4 border-b border-border/50">
                <SheetTitle className="flex items-center gap-2">
                  <BookOpenIcon className="w-4 h-4 text-primary" />
                  Navegador Bíblico
                </SheetTitle>
                <SheetDescription>
                  Selecciona libro, capítulo y versículo para analizar
                </SheetDescription>
              </SheetHeader>
              <div className="pt-4">
                <VerseSelector
                  selectedBook={selectedBook}
                  selectedChapter={selectedChapter}
                  selectedVerse={selectedVerse}
                  bookIndex={bookIndex}
                  isLoadingBook={isLoadingIndex}
                  onBookChange={setBook}
                  onChapterChange={setChapter}
                  onVerseChange={setVerse}
                  onNavigate={navigate}
                  onAnalyze={() => {
                    analyze(false);
                    setIsMobileSheetOpen(false);
                  }}
                  isAnalyzing={isAnalyzing}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop nav bar */}
        <div className="hidden md:flex">
          <VerseNavBar
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            selectedVerse={selectedVerse}
            bookIndex={bookIndex}
            isLoadingIndex={isLoadingIndex}
            isAnalyzing={isAnalyzing}
            onBookChange={setBook}
            onChapterChange={setChapter}
            onVerseChange={setVerse}
            onNavigate={navigate}
            onAnalyze={() => analyze(false)}
            onNext={nextVerse}
            onPrev={prevVerse}
          />
        </div>
      </div>

      {/* ── Main: analysis result ─────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto print:overflow-visible print:block">
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

        {!isAnalyzing && analysis && (
          <VerseAnalysisResult
            analysis={analysis}
            canForceRefresh={canReanalyze}
            onForceRefresh={() => analyze(true)}
          />
        )}

        {!isAnalyzing && !analysis && hebrewVerse && (
          <VersePreview
            verse={hebrewVerse}
            isLoading={isLoadingVerse}
            onAnalyze={() => analyze(false)}
          />
        )}

        {!isAnalyzing && !analysis && !hebrewVerse && !error && <EmptyState t={t} />}
      </main>
    </div>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ t: (key: string) => string }> = ({ t }) => (
  <div className="flex flex-col items-center justify-center h-full py-20 text-center">
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
