/**
 * DetectiveResultSummary
 *
 * Final summary after completing all 6 phases.
 * Shows a score, performance label, per-phase result breakdown,
 * and the full pedagogical explanation of the verb.
 */

import React from 'react';
import { CheckCircle2, XCircle, Trophy, BookOpen, RotateCcw } from 'lucide-react';
import { DetectivePhase } from '@dosfilos/domain';
import type { PhaseResult, WordAnalysis } from '@dosfilos/domain';

interface DetectiveResultSummaryProps {
  word: WordAnalysis;
  phases: PhaseResult[];
  score: number;
  performanceLabel: 'excellent' | 'good' | 'needs-practice';
  onReset: () => void;
}

const PHASE_LABELS: Record<DetectivePhase, string> = {
  // Shared
  [DetectivePhase.OBSERVE]:           'Observación Inicial',
  [DetectivePhase.TRIAGE]:            'Clasificación: ¿Fuerte o Débil?',

  // Strong path
  [DetectivePhase.COLORS]:            'Identificación de Colores',
  [DetectivePhase.DAGESH]:            'Inspección de Dagesh',
  [DetectivePhase.BINYAN]:            'Diagnóstico de Binyan',
  [DetectivePhase.STRONG_CONFIRM]:    'Confirmación del Tipo Verbal',
  [DetectivePhase.WEAK_VERB]:         'Fuerte o Débil',

  // Weak path
  [DetectivePhase.PREFIX]:            'Inspección de Prefijos',
  [DetectivePhase.PREFORMATIVE]:      'Análisis del Preformativo',
  [DetectivePhase.WEAK_ROOT]:         'Tipo de Debilidad de la Raíz',
  [DetectivePhase.WEAK_BINYAN]:       'Diagnóstico de Binyan (Débil)',

  // Both paths — synthesis
  [DetectivePhase.WEAK_TYPE]:         'Tipo de Verbo Débil',
  [DetectivePhase.TRANSLATION]:       'Traducción Contextual',
};

const PERFORMANCE_CONFIG = {
  excellent:      { label: '¡Investigación Magistral!', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', emoji: '🏆' },
  good:           { label: 'Buen Trabajo', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', emoji: '👍' },
  'needs-practice': { label: 'Sigue Practicando', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', emoji: '📚' },
};

export const DetectiveResultSummary: React.FC<DetectiveResultSummaryProps> = ({
  word,
  phases,
  score,
  performanceLabel,
  onReset,
}) => {
  const perf = PERFORMANCE_CONFIG[performanceLabel];
  const verbMorph = word.verbMorphology;
  const totalCorrect = phases.filter(p => p.correct).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ── Merged: score + verb ─────────────────────────────────────── */}
      <div className={`${perf.bg} ${perf.border} border rounded-2xl p-4 flex flex-wrap items-center gap-4`}>

        {/* Left column — score */}
        <div className="flex items-center gap-3 flex-1 min-w-[160px]">
          <div className="text-3xl flex-shrink-0">{perf.emoji}</div>
          <div>
            <h3 className={`text-base font-bold leading-tight ${perf.color}`}>{perf.label}</h3>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-2xl font-black ${perf.color}`}>{score}%</span>
              <span className="text-xs text-muted-foreground">({totalCorrect}/{phases.length} fases)</span>
            </div>
            {/* Score bar */}
            <div className="mt-1.5 h-1.5 w-28 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  performanceLabel === 'excellent' ? 'bg-emerald-500' :
                  performanceLabel === 'good'      ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-border/60 hidden sm:block" />

        {/* Right column — verb */}
        <div className="flex items-center gap-3 flex-1 min-w-[160px]">
          <div dir="rtl" lang="he" className="text-3xl font-serif text-foreground flex-shrink-0">
            {word.hebrewText}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {verbMorph?.binyan} · {verbMorph?.verbType}
            </p>
            <p className="text-xs text-muted-foreground truncate">{word.root} — {word.rootMeaning}</p>
            <p className="text-xs text-muted-foreground">{word.transliteration}</p>
          </div>
        </div>
      </div>

      {/* Phase-by-phase breakdown */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Desglose por Fase
        </p>
        <div className="space-y-2">
          {phases.map(p => (
            <div
              key={p.phase}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${
                p.correct
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
              }`}
            >
              {p.correct
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                : <XCircle    className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{PHASE_LABELS[p.phase]}</p>
                {!p.correct && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Tu respuesta: <span className="text-orange-600 dark:text-orange-400">{p.userAnswer || '—'}</span>
                    {' · '}Correcto: <span className="text-emerald-600 dark:text-emerald-400">{p.correctAnswer}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recognition clues */}
      {verbMorph && verbMorph.recognitionClues.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              Claves de reconocimiento (Farfán)
            </p>
          </div>
          <ul className="space-y-1">
            {verbMorph.recognitionClues.map((clue, i) => (
              <li key={i} className="text-xs text-indigo-700 dark:text-indigo-300 flex gap-1.5">
                <span className="flex-shrink-0">•</span><span>{clue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Explanation */}
      {word.explanation && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            📝 Explicación Pedagógica
          </p>
          <p className="text-sm text-foreground leading-relaxed">{word.explanation}</p>
        </div>
      )}

      {/* Reset button */}
      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Investigar otro verbo
      </button>
    </div>
  );
};
