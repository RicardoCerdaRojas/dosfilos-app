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
import { BookOpenIcon, MenuIcon, SparklesIcon, SearchIcon, ArrowRightIcon } from 'lucide-react';
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

        {!isAnalyzing && !analysis && !hebrewVerse && !error && (
          <EmptyState 
            t={t} 
            onQuickStart={(b, c, v) => navigate(b, c, v)}
            openMobileSheet={() => setIsMobileSheetOpen(true)}
          />
        )}
      </main>
    </div>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ 
  t: (key: string) => string;
  onQuickStart: (book: string, chapter: number, verse: number) => void;
  openMobileSheet: () => void;
}> = ({ t, onQuickStart, openMobileSheet }) => (
  <div className="flex flex-col items-center justify-center h-full py-12 px-4 max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
    {/* Visual Header */}
    <div className="relative mb-10 group">
      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-50 group-hover:opacity-70 transition-opacity duration-700"></div>
      <div className="relative bg-background/40 backdrop-blur-xl border border-white/10 dark:border-slate-800/50 p-10 rounded-3xl shadow-2xl flex flex-col items-center justify-center min-w-[280px]">
        <div className="text-8xl md:text-9xl font-hebrew text-foreground/80 leading-none drop-shadow-sm transition-transform duration-500 group-hover:scale-105" dir="rtl" lang="he">
          אָמַר יְהוָה
        </div>
      </div>
    </div>

    {/* Main Copy */}
    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight text-center">
      {t('verseAnalyzer.placeholder.title') || "Explora el texto original"}
    </h2>
    <p className="text-base md:text-lg text-muted-foreground max-w-md text-center leading-relaxed mb-10">
      {t('verseAnalyzer.placeholder.description') || "Descubre la riqueza del hebreo bíblico con análisis morfológico detallado, traducción contextual y herramientas pedagógicas."}
    </p>

    {/* Quick Actions */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
      {/* Mobile: open sheet / Desktop: pointer to nav */}
      <button
        onClick={openMobileSheet}
        className="md:hidden group flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <SearchIcon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-foreground text-sm">Buscar Pasaje</div>
            <div className="text-xs text-muted-foreground">Abre el navegador</div>
          </div>
        </div>
        <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </button>

      <button
        onClick={() => onQuickStart('Genesis', 1, 1)}
        className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 shadow-sm hover:shadow-md hover:border-blue-500/40 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-foreground text-sm">Génesis 1:1</div>
            <div className="text-xs text-muted-foreground">El principio de todo</div>
          </div>
        </div>
        <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
      </button>

      <button
        onClick={() => onQuickStart('Jonah', 1, 1)}
        className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <BookOpenIcon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-foreground text-sm">Jonás 1:1</div>
            <div className="text-xs text-muted-foreground">Un llamado divino</div>
          </div>
        </div>
        <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
      </button>
    </div>
    
    <div className="hidden md:flex mt-12 items-center gap-2 text-sm text-muted-foreground opacity-70">
      <ArrowRightIcon className="w-4 h-4 -rotate-90 animate-bounce" />
      <span>Usa el navegador superior para buscar un versículo</span>
    </div>
  </div>
);
