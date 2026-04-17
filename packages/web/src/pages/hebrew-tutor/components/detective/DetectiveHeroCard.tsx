/**
 * DetectiveHeroCard
 *
 * Unified "hero" block shown at the top of every investigation phase.
 * It merges three previously separate elements into a single coherent card:
 *
 *  ① The analysed verb — large, morpheme-coloured, center-stage
 *  ② The lexical anchor — root (Hebrew) + meaning, inline below the verb
 *  ③ Phase metadata — step badge · phase name · investigative question
 *
 * The visual hierarchy is:
 *   [verb hero] → [root · meaning] → [divider] → [phase badge + question]
 *
 * This replaces both `LexicalAnchor` (from VerbDetectivePanel) and
 * `DetectivePhaseHeader` (the flat row used in each phase component).
 */

import React from 'react';
import type { WordAnalysis } from '@dosfilos/domain';
import { MorphemeSpan } from '../MorphemeSpan';

interface DetectiveHeroCardProps {
  /** Full word analysis, used for verb display and root information */
  word: WordAnalysis;
  /** Visual step number shown in the badge (1-based) */
  step: number;
  /** Short display name of the phase, e.g. "Observación Inicial" */
  name: string;
  /** The primary question the student must answer in this phase */
  question: string;
}

export const DetectiveHeroCard: React.FC<DetectiveHeroCardProps> = ({
  word,
  step,
  name,
  question,
}) => (
  <div className="mb-5 rounded-2xl overflow-hidden border border-border bg-gradient-to-b from-indigo-50/60 via-slate-50/40 to-background dark:from-indigo-950/25 dark:via-slate-900/20 dark:to-background">

    {/* ── ① Verb hero ───────────────────────────────────────────────────────── */}
    <div className="px-6 pt-6 pb-3 text-center">
      {/* The verb itself — large, morpheme-coloured, RTL */}
      <div
        dir="rtl"
        lang="he"
        className="text-5xl font-serif leading-relaxed text-foreground mb-1"
      >
        {word.morphemes && word.morphemes.length > 0 ? (
          <MorphemeSpan segments={word.morphemes} variant="text" />
        ) : (
          word.hebrewText
        )}
      </div>
      {/* Transliteration */}
      {word.transliteration && (
        <p className="text-xs italic text-muted-foreground tracking-wide">
          {word.transliteration}
        </p>
      )}
    </div>

    {/* ── ② Lexical anchor: root + meaning ─────────────────────────────────── */}
    {(word.root || word.rootMeaning) && (
      <div className="flex items-center justify-center gap-2.5 pb-4">
        {/* Root badge */}
        <div className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 dark:bg-indigo-400/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-bold tracking-widest uppercase text-indigo-600 dark:text-indigo-400">
            Raíz
          </span>
        </div>
        {/* Root letters */}
        {word.root && (
          <span
            dir="rtl"
            lang="he"
            className="text-base font-serif font-semibold text-foreground leading-none"
          >
            {word.root}
          </span>
        )}
        {/* Separator */}
        {word.root && word.rootMeaning && (
          <span className="text-muted-foreground/40 text-xs select-none">—</span>
        )}
        {/* Meaning */}
        {word.rootMeaning && (
          <span className="text-xs text-slate-500 dark:text-slate-400 italic">
            {word.rootMeaning}
          </span>
        )}
      </div>
    )}

    {/* ── ③ Phase metadata ──────────────────────────────────────────────────── */}
    <div className="border-t border-border/60 bg-background/60 dark:bg-background/40 px-4 py-3 flex items-start gap-3">
      {/* Step badge */}
      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center leading-none mt-0.5">
        {step}
      </div>
      {/* Phase name + question */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-none mb-1">
          {name}
        </p>
        <h3 className="text-sm font-semibold text-foreground leading-snug">
          {question}
        </h3>
      </div>
    </div>

  </div>
);
