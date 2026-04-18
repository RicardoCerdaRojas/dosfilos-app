/**
 * DiscoveryModePage
 *
 * Main page for the "Modo Descubrimiento" flow.
 * The student selects a verse, the analysis runs silently, then words are
 * presented one-by-one for detective investigation. After all words are
 * investigated, the student composes a full translation and compares it
 * against the expert analysis.
 *
 * Flow:  idle → preparing → investigating → composing → comparing
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpenIcon,
  MenuIcon,
  SparklesIcon,
  CompassIcon,
  ArrowRightIcon,
  SearchIcon,
  SendIcon,
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { GrammaticalCategory } from '@dosfilos/domain';
import { HEBREW_BOOKS_CATALOG } from '@dosfilos/infrastructure';

import { useDiscoveryMode } from './hooks/useDiscoveryMode';
import { VerseSelector } from './components/VerseSelector';
import { VerseNavBar } from './components/VerseNavBar';
import { HebrewLoadingTips } from './components/HebrewLoadingTips';
import { VerbDetectivePanel } from './components/VerbDetectivePanel';
import { NominalDetectivePanel } from './components/NominalDetectivePanel';
import { DiscoveryWordStepper } from './components/discovery/DiscoveryWordStepper';
import { TranslationBuilder } from './components/discovery/TranslationBuilder';
import { TranslationComparison } from './components/discovery/TranslationComparison';
import { ParticleQuickPanel } from './components/discovery/ParticleQuickPanel';

// ── Word category routing ─────────────────────────────────────────────────────

const VERB_CATEGORIES = new Set([GrammaticalCategory.VERB]);

const NOMINAL_CATEGORIES = new Set([
  GrammaticalCategory.NOUN,
  GrammaticalCategory.PROPER_NOUN,
  GrammaticalCategory.ADJECTIVE,
  GrammaticalCategory.PRONOUN,
  GrammaticalCategory.PERSONAL_PRONOUN,
  GrammaticalCategory.DEMONSTRATIVE_PRONOUN,
  GrammaticalCategory.RELATIVE_PRONOUN,
]);

function getDetectiveType(category: GrammaticalCategory): 'verb' | 'nominal' | 'particle' {
  if (VERB_CATEGORIES.has(category)) return 'verb';
  if (NOMINAL_CATEGORIES.has(category)) return 'nominal';
  return 'particle';
}

// ── Component ─────────────────────────────────────────────────────────────────

export const DiscoveryModePage: React.FC = () => {
  const { t } = useTranslation('hebrewTutor');
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Detective panel state
  const [detectiveOpen, setDetectiveOpen] = useState(false);
  const [detectiveType, setDetectiveType] = useState<'verb' | 'nominal' | 'particle'>('particle');

  const dm = useDiscoveryMode();

  const currentBookName =
    HEBREW_BOOKS_CATALOG.find((b) => b.morphhbKey === dm.selectedBook)?.nameSpanish ?? dm.selectedBook;

  // ── Detective routing ──────────────────────────────────────────────────

  const openDetective = useCallback(() => {
    if (!dm.activeWord) return;
    const type = getDetectiveType(dm.activeWord.category);
    setDetectiveType(type);
    setDetectiveOpen(true);
  }, [dm.activeWord]);

  const handleDetectiveClose = useCallback(() => {
    setDetectiveOpen(false);
  }, []);

  const handleParticleComplete = useCallback(
    (translation: string) => {
      dm.completeWord(translation, 100); // Particles always score 100
    },
    [dm],
  );

  // When the existing detective panels close (user clicks X or sheet closes),
  // if the word has no translation yet, prompt for one via the stepper
  const handleDetectiveCloseWithTranslation = useCallback(() => {
    setDetectiveOpen(false);
    // The detective is closing; the student can provide a translation 
    // via the word click → re-open detective pattern
  }, []);

  // Word click on stepper (for reviewing completed words)
  const handleWordClick = useCallback(
    (index: number) => {
      // Currently we only allow reviewing, not re-investigating
      // Could open a read-only view in the future
    },
    [],
  );

  // ── Composing phase submit ─────────────────────────────────────────────

  const handleComposingSubmit = useCallback(() => {
    dm.submitTranslation();
  }, [dm]);

  return (
    <div className="flex flex-col h-full min-h-0 w-full relative">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-4 print:hidden">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <CompassIcon className="w-5 h-5 text-indigo-500" />
              <h1 className="text-xl font-bold text-foreground">
                {t('discovery.title', { defaultValue: 'Modo Descubrimiento' })}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('discovery.description', {
                defaultValue: 'Traduce palabra por palabra antes de ver el análisis experto.',
              })}
            </p>
          </div>

          {/* Mobile only: menu button */}
          <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors shrink-0">
                <MenuIcon className="w-4 h-4" />
                <span className="text-xs">
                  {currentBookName} {dm.selectedChapter}:{dm.selectedVerse}
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
              <SheetHeader className="pb-4 border-b border-border/50">
                <SheetTitle className="flex items-center gap-2">
                  <BookOpenIcon className="w-4 h-4 text-primary" />
                  {t('discovery.navigator', { defaultValue: 'Navegador Bíblico' })}
                </SheetTitle>
                <SheetDescription>
                  {t('discovery.navigatorDesc', {
                    defaultValue: 'Selecciona libro, capítulo y versículo para descubrir',
                  })}
                </SheetDescription>
              </SheetHeader>
              <div className="pt-4">
                <VerseSelector
                  selectedBook={dm.selectedBook}
                  selectedChapter={dm.selectedChapter}
                  selectedVerse={dm.selectedVerse}
                  bookIndex={dm.bookIndex}
                  isLoadingBook={dm.isLoadingIndex}
                  onBookChange={dm.setBook}
                  onChapterChange={dm.setChapter}
                  onVerseChange={dm.setVerse}
                  onNavigate={dm.navigate}
                  onAnalyze={() => {
                    dm.startDiscovery();
                    setIsMobileSheetOpen(false);
                  }}
                  isAnalyzing={dm.phase === 'preparing'}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop nav bar */}
        <div className="hidden md:flex">
          <VerseNavBar
            selectedBook={dm.selectedBook}
            selectedChapter={dm.selectedChapter}
            selectedVerse={dm.selectedVerse}
            bookIndex={dm.bookIndex}
            isLoadingIndex={dm.isLoadingIndex}
            isAnalyzing={dm.phase === 'preparing'}
            onBookChange={dm.setBook}
            onChapterChange={dm.setChapter}
            onVerseChange={dm.setVerse}
            onNavigate={dm.navigate}
            onAnalyze={() => dm.startDiscovery()}
            onNext={dm.nextVerse}
            onPrev={dm.prevVerse}
          />
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Error banner */}
        {dm.error && (
          <div className="mb-4 flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <span className="text-destructive text-lg">⚠</span>
            <div className="flex-1">
              <p className="text-sm text-destructive font-medium">{dm.error}</p>
            </div>
            <button
              onClick={dm.clearError}
              className="text-destructive/60 hover:text-destructive text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Phase: Preparing (loading screen) */}
        {dm.phase === 'preparing' && <HebrewLoadingTips />}

        {/* Phase: Investigating */}
        {dm.phase === 'investigating' && dm.activeWord && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Hebrew verse display */}
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                {dm.verseDisplayReference}
              </p>
              <p
                dir="rtl"
                lang="he"
                className="text-2xl sm:text-3xl leading-loose font-hebrew text-foreground"
                style={{ fontFamily: "'SBL Hebrew', 'Ezra SIL', serif" }}
              >
                {dm.hebrewVerse?.hebrewText ?? dm.discoveryWords.map(w => w.word.hebrewText).join(' ')}
              </p>
            </div>

            {/* Word stepper */}
            <DiscoveryWordStepper
              words={dm.discoveryWords}
              activeWordIndex={dm.activeWordIndex}
              onWordClick={handleWordClick}
            />

            {/* Active word CTA */}
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex flex-col items-center gap-1">
                <span
                  dir="rtl"
                  lang="he"
                  className="text-4xl font-semibold text-indigo-700 dark:text-indigo-300"
                  style={{ fontFamily: "'SBL Hebrew', 'Ezra SIL', serif" }}
                >
                  {dm.activeWord.hebrewText}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('discovery.investigate.wordN', {
                    defaultValue: 'Palabra {{n}} de {{total}}',
                    n: dm.activeWordIndex + 1,
                    total: dm.totalWords,
                  })}
                </span>
              </div>
              <button
                onClick={openDetective}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm shadow-lg hover:bg-indigo-600 active:scale-[0.98] transition-all"
              >
                <SearchIcon className="w-4 h-4" />
                {t('discovery.investigate.start', { defaultValue: 'Investigar esta palabra' })}
              </button>
            </div>

            {/* Translation builder */}
            <TranslationBuilder
              words={dm.discoveryWords}
              verseReference={dm.verseDisplayReference}
              completedCount={dm.completedCount}
              totalWords={dm.totalWords}
            />

            {/* Finish investigation button */}
            {dm.completedCount === dm.totalWords && dm.totalWords > 0 && (
              <div className="flex items-center justify-center py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button
                  onClick={dm.finishInvestigation}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-lg hover:bg-emerald-600 active:scale-[0.98] transition-all"
                >
                  <ArrowRightIcon className="w-4 h-4" />
                  {t('discovery.investigate.finish', { defaultValue: 'Componer traducción completa →' })}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase: Composing */}
        {dm.phase === 'composing' && (
          <div className="space-y-5 max-w-2xl mx-auto animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-foreground">
                {t('discovery.compose.title', { defaultValue: 'Compón tu traducción' })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('discovery.compose.description', {
                  defaultValue:
                    'A partir de tus traducciones palabra por palabra, edita la traducción completa del versículo. Puedes modificarla libremente.',
                })}
              </p>
            </div>

            {/* Hebrew text reference */}
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                {dm.verseDisplayReference}
              </p>
              <p
                dir="rtl"
                lang="he"
                className="text-2xl leading-loose font-hebrew text-foreground"
                style={{ fontFamily: "'SBL Hebrew', 'Ezra SIL', serif" }}
              >
                {dm.hebrewVerse?.hebrewText ?? dm.discoveryWords.map(w => w.word.hebrewText).join(' ')}
              </p>
            </div>

            {/* Word translations summary */}
            <div className="flex flex-wrap gap-2 justify-center" dir="rtl">
              {dm.discoveryWords.map((dw, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg bg-muted/30 border border-border/40"
                >
                  <span
                    dir="rtl"
                    lang="he"
                    className="text-sm font-semibold text-foreground"
                    style={{ fontFamily: "'SBL Hebrew', 'Ezra SIL', serif" }}
                  >
                    {dw.word.hebrewText}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {dw.studentTranslation || '—'}
                  </span>
                </div>
              ))}
            </div>

            {/* Full translation textarea */}
            <textarea
              value={dm.studentFullTranslation}
              onChange={(e) => dm.setStudentFullTranslation(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors resize-none"
              placeholder={t('discovery.compose.placeholder', {
                defaultValue: 'Escribe o edita tu traducción completa...',
              })}
            />

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleComposingSubmit}
                disabled={!dm.studentFullTranslation.trim()}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                <SendIcon className="w-4 h-4" />
                {t('discovery.compose.submit', { defaultValue: 'Comparar con análisis experto →' })}
              </button>
            </div>
          </div>
        )}

        {/* Phase: Comparing */}
        {dm.phase === 'comparing' && dm.expertAnalysis && (
          <TranslationComparison
            studentFullTranslation={dm.studentFullTranslation}
            expertAnalysis={dm.expertAnalysis}
            discoveryWords={dm.discoveryWords}
            onReset={dm.reset}
            onNextVerse={() => {
              dm.nextVerse();
              // After navigating, need to start discovery on new verse
            }}
          />
        )}

        {/* Phase: Idle (empty state) */}
        {dm.phase === 'idle' && !dm.error && (
          <DiscoveryEmptyState
            t={t}
            onQuickStart={(b, c, v) => dm.navigate(b, c, v)}
            openMobileSheet={() => setIsMobileSheetOpen(true)}
          />
        )}
      </main>

      {/* ── Detective panels ─────────────────────────────────────────────── */}
      {detectiveType === 'verb' && (
        <VerbDetectivePanel
          word={dm.activeWord}
          verseReference={dm.verseDisplayReference}
          isOpen={detectiveOpen}
          onClose={handleDetectiveCloseWithTranslation}
          onDiscoveryComplete={(translation, score) => {
            dm.completeWord(translation, score);
            setDetectiveOpen(false);
          }}
        />
      )}

      {detectiveType === 'nominal' && (
        <NominalDetectivePanel
          word={dm.activeWord}
          verseReference={dm.verseDisplayReference}
          isOpen={detectiveOpen}
          onClose={handleDetectiveCloseWithTranslation}
          onDiscoveryComplete={(translation, score) => {
            dm.completeWord(translation, score);
            setDetectiveOpen(false);
          }}
        />
      )}

      {detectiveType === 'particle' && (
        <ParticleQuickPanel
          word={dm.activeWord}
          isOpen={detectiveOpen}
          onClose={handleDetectiveClose}
          onComplete={handleParticleComplete}
        />
      )}
    </div>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────

const DiscoveryEmptyState: React.FC<{
  t: (key: string, opts?: Record<string, string>) => string;
  onQuickStart: (book: string, chapter: number, verse: number) => void;
  openMobileSheet: () => void;
}> = ({ t, onQuickStart, openMobileSheet }) => (
  <div className="flex flex-col items-center justify-center h-full py-12 px-4 max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
    {/* Visual header */}
    <div className="relative mb-10 group">
      <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full opacity-50 group-hover:opacity-70 transition-opacity duration-700" />
      <div className="relative bg-background/40 backdrop-blur-xl border border-white/10 dark:border-slate-800/50 p-10 rounded-3xl shadow-2xl flex flex-col items-center justify-center min-w-[280px]">
        <CompassIcon className="w-16 h-16 text-indigo-500 mb-4" />
        <div
          className="text-6xl md:text-7xl font-hebrew text-foreground/80 leading-none drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
          dir="rtl"
          lang="he"
        >
          חֲקֹר
        </div>
        <p className="text-sm text-muted-foreground mt-2 italic">&ldquo;Investiga&rdquo;</p>
      </div>
    </div>

    {/* Copy */}
    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight text-center">
      {t('discovery.empty.title', { defaultValue: 'Descubre traduciendo' })}
    </h2>
    <p className="text-base md:text-lg text-muted-foreground max-w-md text-center leading-relaxed mb-10">
      {t('discovery.empty.description', {
        defaultValue:
          'Investiga cada palabra del versículo con el detective antes de ver el análisis del experto.',
      })}
    </p>

    {/* Quick actions */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
      <button
        onClick={openMobileSheet}
        className="md:hidden group flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
            <SearchIcon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-foreground text-sm">
              {t('discovery.empty.search', { defaultValue: 'Buscar Pasaje' })}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('discovery.empty.searchDesc', { defaultValue: 'Abre el navegador' })}
            </div>
          </div>
        </div>
        <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
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
            <div className="text-xs text-muted-foreground">
              {t('discovery.empty.genesis', { defaultValue: 'El principio de todo' })}
            </div>
          </div>
        </div>
        <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
      </button>

      <button
        onClick={() => onQuickStart('Genesis', 3, 10)}
        className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <BookOpenIcon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-foreground text-sm">Génesis 3:10</div>
            <div className="text-xs text-muted-foreground">
              {t('discovery.empty.gen310', { defaultValue: 'La desnudez revelada' })}
            </div>
          </div>
        </div>
        <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
      </button>
    </div>

    <div className="hidden md:flex mt-12 items-center gap-2 text-sm text-muted-foreground opacity-70">
      <ArrowRightIcon className="w-4 h-4 -rotate-90 animate-bounce" />
      <span>
        {t('discovery.empty.hint', { defaultValue: 'Usa el navegador superior para buscar un versículo' })}
      </span>
    </div>
  </div>
);
