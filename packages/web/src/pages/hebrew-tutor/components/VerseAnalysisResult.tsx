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
 */

import React from 'react';
import { WordCard } from './WordCard';
import { VerbTable } from './VerbTable';
import { WordTutorSheet } from './WordTutorSheet';
import { VerbDetectivePanel } from './VerbDetectivePanel';
import { MorphemeSpan } from './MorphemeSpan';
import { EyeIcon, EyeOffIcon, PaletteIcon, ActivityIcon, PrinterIcon, DownloadIcon, FileTextIcon } from 'lucide-react';
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
          </div>
          <div className="flex items-center gap-4 print:hidden">
            {onForceRefresh && (
              <div className="group relative">
                <button
                  id="ht-force-refresh-btn"
                  onClick={onForceRefresh}
                  disabled={!canForceRefresh}
                  className="text-xs flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground hover:text-primary"
                >
                  ⟳ {t('verseAnalyzer.forceRefresh')}
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

        {/* Hebrew text — RTL, large serif. Clickable grouped words. */}
        <div
          dir="rtl"
          className="text-3xl sm:text-4xl font-serif leading-loose text-foreground mb-3 tracking-wide flex flex-wrap gap-x-3 justify-center"
          lang="he"
        >
          {analysis.words.map((w, i) => {
            const isVerb = !!w.verbMorphology && showVerbMarkers;
            return (
              <span
                key={i}
                onClick={() => setTutorWord(w)}
                className={`cursor-pointer hover:bg-primary/5 rounded pb-1 px-1 transition-all relative ${
                  isVerb ? "border-b-2 border-emerald-500/50 hover:border-emerald-500/80" : "border-b-2 border-transparent hover:border-primary/30"
                }`}
                title={isVerb ? "Verbo (Haz clic para analizar)" : "Haz clic para analizar"}
              >
                {w.morphemes && w.morphemes.length > 0 ? (
                  <MorphemeSpan segments={w.morphemes} variant="text" disableColors={!showColors} />
                ) : (
                  w.hebrewText
                )}
              </span>
            );
          })}
        </div>

        {/* Transliteration */}
        <p className="text-sm italic text-muted-foreground">
          {analysis.transliteration}
        </p>
      </div>

      {/* ── Translations ──────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-3 print:block">
        <div className="print:mb-4">
          <TranslationPanel
            label={t('verseAnalyzer.analysis.literalTranslation')}
            text={analysis.literalTranslation}
            icon="🔍"
          />
        </div>
        <div className="print:mb-4">
          <TranslationPanel
            label={t('verseAnalyzer.analysis.fluidTranslation')}
            text={analysis.fluidTranslation}
            icon="📖"
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
          <span>🔤</span>
          {t('verseAnalyzer.analysis.wordAnalysis')}
          <span className="text-xs font-normal text-muted-foreground/60">({analysis.words.length} palabras)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 print:block">
          {analysis.words.map((word, i) => (
            <WordCard 
              key={`${word.hebrewWord}-${i}`} 
              word={word} 
              index={i} 
              onFocus={() => setTutorWord(word)}
              onInvestigate={setDetectiveWord}
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
            <span>📝</span>
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
        isOpen={!!detectiveWord}
        onClose={() => setDetectiveWord(null)}
      />
    </div>
  );
};

// ── Sub-component ──────────────────────────────────────────────────────────────

const TranslationPanel: React.FC<{ label: string; text: string; icon: string }> = ({
  label, text, icon,
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex items-center gap-1.5 mb-2">
      <span>{icon}</span>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-sm text-foreground leading-relaxed">{text}</p>
  </div>
);
