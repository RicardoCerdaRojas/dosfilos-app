/**
 * VerseAnalysisResult
 *
 * Full-page result component rendering a VerseAnalysis aggregate:
 *  1. Hebrew text + transliteration header (RTL, large, centered)
 *  2. Translation panel (literal + fluid side by side)
 *  3. Color legend
 *  4. WordCard grid (one card per analyzed word)
 *  5. VerbTable summary
 *  6. Exegetical notes section
 *
 * Bidirectional word highlighting:
 *  - Hovering a WordCard  → highlights the word in BOTH Hebrew headers (main + sticky)
 *  - Hovering a word in the main header → highlights the corresponding WordCard
 *  - Clicking a word in either header   → scrolls to the card (smooth)
 */

import React from 'react';
import { WordCard } from './WordCard';
import { VerbTable } from './VerbTable';
import { WordTutorSheet } from './WordTutorSheet';
import { VerbDetectivePanel } from './VerbDetectivePanel';
import { NominalDetectivePanel } from './NominalDetectivePanel';
import { StickyVerseHeader } from './StickyVerseHeader';
import { MorphemeSpan } from './MorphemeSpan';
import { WordTooltipContent } from './WordTooltipContent';
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip';
import { PaletteIcon, ActivityIcon, PrinterIcon, DownloadIcon, FileTextIcon, ScanTextIcon, BookOpenIcon, LayoutGridIcon, ScrollTextIcon, CopyIcon, CheckIcon, RefreshCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VerseAnalysis, WordAnalysis } from '@dosfilos/domain';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { generateVerseMarkdown } from '../utils/exportMarkdown';
import { toast } from 'sonner';

interface VerseAnalysisResultProps {
  analysis: VerseAnalysis;
  onForceRefresh?: () => void;
  canForceRefresh?: boolean;
}

// Color legend items from docs/hebreo/2_sistema-colores-unificado.md
const LEGEND_ITEMS = [
  { role: 'prefix',    hex: '#2563EB', label: 'Prefijo' },
  { role: 'root',      hex: '#64748B', label: 'Raíz' },
  { role: 'vowelMark', hex: '#F59E0B', label: 'Vocal temática' },
  { role: 'dagesh',    hex: '#EF4444', label: 'Dagesh' },
  { role: 'suffix',    hex: '#8B5CF6', label: 'Sufijo' },
];

export const VerseAnalysisResult: React.FC<VerseAnalysisResultProps> = ({ analysis, onForceRefresh, canForceRefresh = true }) => {
  const { t } = useTranslation('hebrewTutor');
  const [tutorWord, setTutorWord] = React.useState<any | null>(null);
  const [detectiveWord, setDetectiveWord] = React.useState<WordAnalysis | null>(null);
  const [showColors, setShowColors] = React.useState(true);
  const [showVerbMarkers, setShowVerbMarkers] = React.useState(true);

  /** Index of the currently highlighted word (hover from header or card). null = none. */
  const [activeWordIndex, setActiveWordIndex] = React.useState<number | null>(null);

  // ── Text scale (persisted in localStorage) ─────────────────────────────────
  const SCALE_STEPS = [0.75, 0.875, 1.0, 1.125, 1.3] as const;
  const DEFAULT_SCALE_IDX = 2; // 1.0
  const [scaleIdx, setScaleIdx] = React.useState<number>(() => {
    try {
      const saved = localStorage.getItem('ht-text-scale-idx');
      if (saved !== null) {
        const n = parseInt(saved, 10);
        if (n >= 0 && n < SCALE_STEPS.length) return n;
      }
    } catch { /* ignore */ }
    return DEFAULT_SCALE_IDX;
  });
  const textScale = SCALE_STEPS[scaleIdx];

  const decreaseScale = () => setScaleIdx(i => {
    const next = Math.max(0, i - 1);
    localStorage.setItem('ht-text-scale-idx', String(next));
    return next;
  });
  const increaseScale = () => setScaleIdx(i => {
    const next = Math.min(SCALE_STEPS.length - 1, i + 1);
    localStorage.setItem('ht-text-scale-idx', String(next));
    return next;
  });

  /** Refs for each WordCard DOM node — used to scroll cards into view */
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  /** Sentinel placed at the bottom of the main verse header — tracked by StickyVerseHeader */
  const headerSentinelRef = React.useRef<HTMLDivElement>(null);

  // Ensure cardRefs array is the right size whenever words change
  React.useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, analysis.words.length);
  }, [analysis.words.length]);

  /**
   * Called when the user hovers a Hebrew word in the main header.
   * Sets the active index so the corresponding card gets highlighted.
   */
  const handleHeaderWordHover = React.useCallback((index: number | null) => {
    setActiveWordIndex(index);
  }, []);

  /**
   * Called when the user clicks a Hebrew word in the main header.
   * Scrolls the corresponding card smoothly into view.
   */
  const handleHeaderWordClick = React.useCallback((index: number) => {
    const card = cardRefs.current[index];
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setActiveWordIndex(index);
  }, []);

  /**
   * Launches the appropriate detective panel.
   * Verbal words → VerbDetectivePanel (currently implemented).
   * Nominal words → NominalDetectivePanel (⚠️ pending — shows informative toast meanwhile).
   */
  const handleInvestigate = React.useCallback((word: WordAnalysis) => {
    setDetectiveWord(word);
  }, []);

  const [copiedHebrew, setCopiedHebrew] = React.useState(false);
  const [copiedTranslit, setCopiedTranslit] = React.useState(false);

  const handleCopyHebrew = () => {
    const hebrewText = analysis.words.map(w => w.hebrewText).join(' ');
    navigator.clipboard.writeText(hebrewText);
    setCopiedHebrew(true);
    setTimeout(() => setCopiedHebrew(false), 2000);
  };

  const handleCopyTranslit = () => {
    navigator.clipboard.writeText(analysis.transliteration);
    setCopiedTranslit(true);
    setTimeout(() => setCopiedTranslit(false), 2000);
  };

  const handleCopyMarkdown = () => {
    const md = generateVerseMarkdown(analysis);
    navigator.clipboard.writeText(md);
    toast.success('¡Análisis copiado al portapapeles en formato Markdown!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Floating sticky header — auto-appears when verse header scrolls out */}
      <StickyVerseHeader
        analysis={analysis}
        showColors={showColors}
        showVerbMarkers={showVerbMarkers}
        sentinelRef={headerSentinelRef}
        activeWordIndex={activeWordIndex}
        onWordHover={handleHeaderWordHover}
        onWordClick={handleHeaderWordClick}
        textScale={textScale}
      />
      {/* ── Header: Reference + Hebrew text ───────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-foreground">{analysis.reference}</h2>
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <button 
                onClick={() => setShowColors(!showColors)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${showColors ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                title={showColors ? "Ocultar colores morfológicos" : "Mostrar colores morfológicos"}
              >
                <PaletteIcon className="w-3.5 h-3.5" />
                {showColors ? 'Colores On' : 'Colores Off'}
              </button>
              <button 
                onClick={() => setShowVerbMarkers(!showVerbMarkers)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${showVerbMarkers ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                title={showVerbMarkers ? "Ocultar indicadores de verbo" : "Mostrar indicadores de verbo"}
              >
                <ActivityIcon className="w-3.5 h-3.5" />
                {showVerbMarkers ? 'Verbos On' : 'Verbos Off'}
              </button>
            </div>
            {/* ── Text size control ─────────────────────── */}
            <div className="flex items-center gap-0.5 bg-muted rounded-full px-1 py-0.5">
              <button
                onClick={decreaseScale}
                disabled={scaleIdx === 0}
                title="Reducir tamaño del texto"
                className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                A−
              </button>
              <span className="w-px h-3 bg-border" />
              <button
                onClick={increaseScale}
                disabled={scaleIdx === SCALE_STEPS.length - 1}
                title="Aumentar tamaño del texto"
                className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                A+
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 print:hidden">
            {onForceRefresh && (
              <div className="group relative">
                <button
                  id="ht-force-refresh-btn"
                  onClick={onForceRefresh}
                  disabled={!canForceRefresh}
                  className="text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground hover:text-primary"
                >
                  <RefreshCwIcon className="w-3 h-3" />
                  {t('verseAnalyzer.forceRefresh')}
                </button>
                {!canForceRefresh && (
                  <div className="absolute top-full mt-2 w-48 p-2 bg-secondary text-secondary-foreground text-[10px] rounded shadow-lg invisible group-hover:visible z-10 text-left">
                    Límite alcanzado de actualizaciones para este versículo.
                  </div>
                )}
              </div>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors shadow-sm">
                  <DownloadIcon className="w-3.5 h-3.5" />
                  Exportar
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={handlePrint} className="cursor-pointer flex items-center gap-2">
                  <PrinterIcon className="w-4 h-4 opacity-70" />
                  <span>Imprimir / Guardar PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyMarkdown} className="cursor-pointer flex items-center gap-2">
                  <FileTextIcon className="w-4 h-4 opacity-70" />
                  <span>Copiar como Markdown</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Hebrew text — RTL, large serif. Per-word transliteration below each word. */}
        <div
        dir="rtl"
          className="font-serif text-foreground mb-3 tracking-wide flex flex-wrap gap-x-4 justify-center leading-[1.6]"
          style={{ fontSize: `${2.25 * textScale}rem` }}
          lang="he"
        >
          {analysis.words.map((w, i) => {
            const isVerb = !!w.verbMorphology && showVerbMarkers;
            const isActive = activeWordIndex === i;
            return (
              <Tooltip key={i} delayDuration={200}>
                <TooltipTrigger asChild>
                  <span
                    onClick={() => handleHeaderWordClick(i)}
                    onMouseEnter={() => handleHeaderWordHover(i)}
                    onMouseLeave={() => handleHeaderWordHover(null)}
                    className={`
                      inline-flex flex-col items-center
                      cursor-pointer rounded-md px-1 pt-0.5 pb-1.5 transition-all duration-150 relative
                      ${isActive
                        ? 'bg-primary/15 ring-1 ring-primary/40 border-b-2 border-primary scale-105 shadow-sm'
                        : isVerb
                          ? 'border-b-2 border-emerald-500/60 hover:border-emerald-500/80 hover:bg-primary/8 hover:shadow-sm'
                          : 'border-b-2 border-transparent hover:border-primary/30 hover:bg-muted hover:shadow-sm'
                      }
                    `}
                  >
                    {/* Hebrew */}
                    <span>
                      {w.morphemes && w.morphemes.length > 0 ? (
                        <MorphemeSpan
                          segments={w.morphemes}
                          variant="text"
                          disableColors={!showColors}
                          disableNativeTooltip
                        />
                      ) : (
                        w.hebrewText
                      )}
                    </span>
                    {/* Per-word transliteration */}
                    {w.transliteration && (
                      <span
                        dir="ltr"
                        lang="la"
                        style={{ fontSize: `${11 * textScale}px` }}
                        className="font-normal italic text-muted-foreground leading-none mt-2.5 pb-2 tracking-tight block"
                      >
                        {w.transliteration}
                      </span>
                    )}
                  </span>
                </TooltipTrigger>
                <WordTooltipContent word={w} side="bottom" />
              </Tooltip>
            );
          })}
        </div>

        {/* Copy buttons row — transliteration line removed (now shown per-word) */}
        <div className="flex items-center justify-center gap-3 mt-1">
          <div className="flex items-center gap-1.5 print:hidden">
            <button
              onClick={handleCopyHebrew}
              title="Copiar texto hebreo"
              className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-primary transition-colors px-2 py-0.5 rounded-md hover:bg-primary/5"
            >
              {copiedHebrew ? <CheckIcon className="w-3 h-3 text-emerald-500" /> : <CopyIcon className="w-3 h-3" />}
              <span>Hebreo</span>
            </button>
            <button
              onClick={handleCopyTranslit}
              title="Copiar transliteración"
              className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-primary transition-colors px-2 py-0.5 rounded-md hover:bg-primary/5"
            >
              {copiedTranslit ? <CheckIcon className="w-3 h-3 text-emerald-500" /> : <CopyIcon className="w-3 h-3" />}
              <span>Translit.</span>
            </button>
          </div>
        </div>

        {/* Sentinel: IntersectionObserver tracks this to trigger the sticky header */}
        <div ref={headerSentinelRef} aria-hidden="true" className="h-px" />
      </div>

      {/* ── Translations ──────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-3 print:block">
        <div className="print:mb-4">
          <TranslationPanel
            label={t('verseAnalyzer.analysis.literalTranslation')}
            text={analysis.literalTranslation}
            icon={<ScanTextIcon className="w-3.5 h-3.5" />}
          />
        </div>
        <div className="print:mb-4">
          <TranslationPanel
            label={t('verseAnalyzer.analysis.fluidTranslation')}
            text={analysis.fluidTranslation}
            icon={<BookOpenIcon className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* ── Color legend ──────────────────────────────────────────────────── */}
      <div className="bg-muted/30 rounded-xl px-4 py-3 print:break-inside-avoid print:mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {t('verseAnalyzer.colors.legend')}
        </p>
        <div className="flex flex-wrap gap-3">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.role} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: item.hex }}
              />
              <span className="text-[11px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Word analysis grid ─────────────────────────────────────────────── */}
      <div className="print:mt-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <LayoutGridIcon className="w-4 h-4 opacity-60" />
          {t('verseAnalyzer.analysis.wordAnalysis')}
          <span className="text-xs font-normal text-muted-foreground/60">({analysis.words.length} palabras)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 print:block">
          {analysis.words.map((word, i) => (
            <WordCard
              key={`${word.hebrewWord}-${i}`}
              word={word}
              index={i}
              isActive={activeWordIndex === i}
              onFocus={() => setTutorWord(word)}
              onInvestigate={handleInvestigate}
              onHover={(hovered) => setActiveWordIndex(hovered ? i : null)}
              cardRef={(el) => { cardRefs.current[i] = el; }}
            />
          ))}
        </div>
      </div>

      {/* ── Verb table ─────────────────────────────────────────────────────── */}
      {analysis.verbTable && analysis.verbTable.length > 0 && (
        <VerbTable verbTable={analysis.verbTable} />
      )}

      {/* ── Exegetical notes ──────────────────────────────────────────────── */}
      {analysis.exegeticalNotes && analysis.exegeticalNotes.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5 print:break-inside-avoid print:mt-6">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
            <ScrollTextIcon className="w-4 h-4 opacity-70" />
            {t('verseAnalyzer.analysis.exegeticalNotes')}
          </h3>
          <ul className="space-y-2">
            {analysis.exegeticalNotes.map((note, i) => (
              <li key={i} className="text-sm text-amber-900 dark:text-amber-300 flex gap-2">
                <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-[11px] text-muted-foreground/40 text-right">
        Analizado: {new Date(analysis.analyzedAt).toLocaleString('es-CL')}
      </p>

      {/* Interactive Tutor Sheet */}
      <WordTutorSheet 
        word={tutorWord} 
        isOpen={!!tutorWord} 
        onClose={() => setTutorWord(null)} 
      />

      {/* Verb Detective Panel */}
      <VerbDetectivePanel
        word={detectiveWord}
        verseReference={analysis.verseReference ?? ''}
        isOpen={!!detectiveWord && detectiveWord.category?.toUpperCase() === 'VERB'}
        onClose={() => setDetectiveWord(null)}
      />

      {/* Nominal Detective Panel */}
      <NominalDetectivePanel
        word={detectiveWord}
        verseReference={analysis.verseReference ?? ''}
        isOpen={!!detectiveWord && ['NOUN', 'PROPER_NOUN', 'ADJECTIVE', 'PRONOUN', 'PERSONAL_PRONOUN', 'DEMONSTRATIVE_PRONOUN', 'RELATIVE_PRONOUN'].includes(detectiveWord.category?.toUpperCase() ?? '')}
        onClose={() => setDetectiveWord(null)}
      />
    </div>
  );
};

// ── Sub-component ──────────────────────────────────────────────────────────────

const TranslationPanel: React.FC<{ label: string; text: string; icon: React.ReactNode }> = ({
  label, text, icon,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground/70">{icon}</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <button
          onClick={handleCopy}
          title="Copiar traducción"
          className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-primary/5 print:hidden"
        >
          {copied
            ? <CheckIcon className="w-3 h-3 text-emerald-500" />
            : <CopyIcon className="w-3 h-3" />
          }
        </button>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );
};
