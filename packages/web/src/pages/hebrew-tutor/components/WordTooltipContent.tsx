/**
 * WordTooltipContent
 *
 * Unified rich tooltip for Hebrew words in both the static and sticky verse headers.
 *
 * Shows:
 *  - Grammatical category (colored badge)
 *  - Gloss / translation (with robust fallback chain)
 *  - For verbs: binyan, verb form, temporal value, and P-G-N
 *  - For nominals: gender, number, state (when present)
 */

import React from 'react';
import { TooltipContent } from '@/components/ui/tooltip';
import type { WordAnalysis } from '@dosfilos/domain';

// ── Category badge colors (mirrors WordCard) ─────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  verb:        'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  noun:        'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  pronoun:     'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  preposition: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  conjunction: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  article:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  particle:    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  adverb:      'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  interjection:'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  proper_noun: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  numeral:     'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
};

const getCatColor = (cat?: string | null) =>
  CATEGORY_COLORS[(cat ?? '').toLowerCase()] ?? CATEGORY_COLORS.particle;

const CATEGORY_ES: Record<string, string> = {
  verb: 'VERBO',
  noun: 'SUSTANTIVO',
  adjective: 'ADJETIVO',
  pronoun: 'PRONOMBRE',
  personal_pronoun: 'PRONOMBRE PERSONAL',
  demonstrative_pronoun: 'PRONOMBRE DEMOSTRATIVO',
  relative_pronoun: 'PRONOMBRE RELATIVO',
  preposition: 'PREPOSICIÓN',
  conjunction: 'CONJUNCIÓN',
  article: 'ARTÍCULO',
  definite_article: 'ARTÍCULO DEFINIDO',
  particle: 'PARTÍCULA',
  adverb: 'ADVERBIO',
  interjection: 'INTERJECCIÓN',
  proper_noun: 'NOMBRE PROPIO',
  numeral: 'NUMERAL',
  object_marker: 'MARCADOR DE OBJETO',
  interrogative: 'INTERROGATIVO',
  negative_particle: 'PARTÍCULA NEGATIVA',
};
const translateCategory = (cat?: string | null) =>
  cat ? (CATEGORY_ES[cat.toLowerCase()] || cat.replace('_', ' ').toUpperCase()) : '';

const STATE_ES: Record<string, string> = {
  absolute: 'ABSOLUTO',
  construct: 'CONSTRUCTO',
};
const translateState = (state?: string | null) => 
  state ? (STATE_ES[state.toLowerCase()] || state.toUpperCase()) : '';

/** Robust gloss: tries multiple fields before giving up. */
const resolveGloss = (w: WordAnalysis): string =>
  w.translation || w.lemmaGloss || w.rootMeaning || w.root || w.hebrewText || '';

// ── Small display helpers ────────────────────────────────────────────────────

const MorphPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col items-center min-w-[44px]">
    <span className="text-[9px] uppercase tracking-widest text-foreground/70 dark:text-gray-400 font-bold leading-none mb-0.5">
      {label}
    </span>
    <span className="text-[11px] font-semibold text-foreground leading-none">
      {value}
    </span>
  </div>
);

const pgnLabel = (person?: number, gender?: string, number?: string): string => {
  // Person is a numeric enum: 1 = 1st, 2 = 2nd, 3 = 3rd
  const p = person != null ? String(person).charAt(0) : '';
  // Gender and GrammaticalNumber are already single-char strings ('M','F','C' / 'S','P','D')
  const g = gender != null ? String(gender).charAt(0) : '';
  const n = number != null ? String(number).charAt(0) : '';
  return `${p}${g}${n}`.toUpperCase();
};


// ── Component ────────────────────────────────────────────────────────────────

interface WordTooltipContentProps {
  word: WordAnalysis;
  side?: 'top' | 'bottom';
}

export const WordTooltipContent: React.FC<WordTooltipContentProps> = ({
  word,
  side = 'bottom',
}) => {
  const gloss = resolveGloss(word);
  const vm = word.verbMorphology;
  const nm = word.nominalMorphology;
  const hasMorphemes = word.morphemes && word.morphemes.length > 0;

  return (
    <TooltipContent
      side={side}
      sideOffset={8}
      className="p-0 overflow-hidden min-w-[160px] max-w-[280px] border border-border/60 shadow-lg"
    >
      {/* ── Top row: category + gloss ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
        {word.category && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${getCatColor(word.category)}`}
          >
            {translateCategory(word.category)}
          </span>
        )}
        {gloss && (
          <span className="text-[12px] font-medium text-primary-foreground leading-snug">
            {gloss}
          </span>
        )}
      </div>

      {/* ── Verb morphology row ── */}
      {vm && (
        <div className="flex items-start gap-3 px-3 py-2 bg-blue-50/80 dark:bg-blue-900/20 flex-wrap">
          {vm.binyan    && <MorphPill label="Binyan"  value={vm.binyan} />}
          {vm.verbForm  && <MorphPill label="Forma"   value={vm.verbForm} />}
          {(vm.person || vm.gender || vm.number) && (
            <MorphPill label="P-G-N" value={pgnLabel(vm.person, vm.gender, vm.number)} />
          )}
          {vm.temporalValue && (
            <div className="w-full">
              <span className="text-[9px] uppercase tracking-widest text-foreground/70 dark:text-gray-400 font-bold leading-none">
                Valor temporal
              </span>
              <p className="text-[10px] text-foreground/90 font-medium mt-0.5 leading-snug">
                {vm.temporalValue}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Nominal morphology row ── */}
      {nm && (nm.gender || nm.number || nm.state) && (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 flex-wrap">
          {nm.gender && <MorphPill label="Género"  value={nm.gender} />}
          {nm.number && <MorphPill label="Número"  value={nm.number} />}
          {nm.state  && <MorphPill label="Estado"  value={translateState(nm.state)}  />}
        </div>
      )}

      {/* ── Morphemes list (letter by letter context) ── */}
      {hasMorphemes && (
        <div className="px-3 py-2 bg-background border-t border-border/40">
          <span className="text-[9px] uppercase tracking-widest text-foreground/70 dark:text-gray-400 font-bold leading-none block mb-1.5">
            Análisis de morfemas
          </span>
          <div className="flex flex-col gap-1">
            {word.morphemes.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px]">
                <span dir="rtl" className="font-serif text-[14px] font-medium min-w-6 text-center shrink-0 text-foreground">
                  {m.text}
                </span>
                <span className="text-foreground/80 dark:text-gray-300 leading-tight">
                  {m.label || m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </TooltipContent>
  );
};
