/**
 * MorphemeSpan
 *
 * Renders a single Hebrew morpheme segment with the dual-layer color system
 * from docs/hebreo/2_sistema-colores-unificado.md
 *
 * Layer A (Morphological — primary): background or text color
 * Layer B (Phonetic — secondary): underline indicator
 *
 * Color palette:
 *   prefix    → blue  #2563EB
 *   root      → light #F9FAFB (or foreground in dark mode)
 *   vowelMark → amber #F59E0B
 *   dagesh    → coral #EF4444
 *   suffix    → violet #8B5CF6
 *   neutral   → gray  #6B7280
 */

import React from 'react';
import type { MorphemeSegment, MorphemeRole } from '@dosfilos/domain';
import { cn } from '@/lib/utils';

export type MorphemeCategory = 'prefix' | 'root' | 'suffix' | 'vowel_a' | 'vowel_ei' | 'vowel_ou' | 'sheva' | 'vowel_generic' | 'dagesh' | 'neutral';

export function getMorphemeCategory(role: string | MorphemeRole, text?: string): MorphemeCategory {
  if (!role) return 'neutral';
  
  if ([
    'PREFIX_STEM', 'PREFORMATIVE', 'DEFINITE_ARTICLE', 
    'WAW_CONJUNCTIVE', 'WAW_CONSECUTIVE', 'PREPOSITION_PREFIX', 'CONJUNCTION_PREFIX'
  ].includes(role)) return 'prefix';

  if (['ROOT_R1', 'ROOT_R2', 'ROOT_R3'].includes(role)) return 'root';
  
  if (['THEME_VOWEL'].includes(role)) {
    if (!text) return 'vowel_generic';
    if (text.includes('\u05B7') || text.includes('\u05B8')) return 'vowel_a';
    if (text.includes('\u05B6') || text.includes('\u05B5') || text.includes('\u05B4')) return 'vowel_ei';
    if (text.includes('\u05B9') || text.includes('\u05BB') || text.includes('\u05D5\u05BC')) return 'vowel_ou';
    if (text.includes('\u05B0') || text.includes('\u05B1') || text.includes('\u05B2') || text.includes('\u05B3')) return 'sheva';
    return 'vowel_generic';
  }

  if (['DAGESH_FORTE'].includes(role)) return 'dagesh';

  if ([
    'AFFORMATIVE', 'PRONOMINAL_SUFFIX', 'CONSTRUCT_ENDING', 
    'PLURAL_ENDING', 'DUAL_ENDING', 'FEMININE_ENDING'
  ].includes(role)) return 'suffix';

  return 'neutral';
}

export const MORPHEME_TEXT_STYLES: Record<MorphemeCategory, string> = {
  prefix:    'text-blue-500 dark:text-blue-400',
  root:      'text-foreground',
  suffix:    'text-violet-500 dark:text-violet-400',
  vowel_a:   'text-red-500 dark:text-red-400',
  vowel_ei:  'text-green-500 dark:text-green-400',
  vowel_ou:  'text-orange-500 dark:text-orange-400',
  sheva:     'text-purple-500 dark:text-purple-400',
  vowel_generic: 'text-amber-500 dark:text-amber-400',
  dagesh:    'text-[#928854]',
  neutral:   'text-muted-foreground',
};

export const MORPHEME_HIGHLIGHT_STYLES: Record<MorphemeCategory, string> = {
  prefix:    'bg-blue-500/15 text-foreground rounded-sm',
  root:      'text-foreground',
  suffix:    'bg-violet-500/15 text-foreground rounded-sm',
  vowel_a:   'bg-red-500/15 text-foreground rounded-sm',
  vowel_ei:  'bg-green-500/15 text-foreground rounded-sm',
  vowel_ou:  'bg-orange-500/15 text-foreground rounded-sm',
  sheva:     'bg-purple-500/15 text-foreground rounded-sm',
  vowel_generic: 'bg-amber-500/15 text-foreground rounded-sm',
  dagesh:    'bg-[#928854]/20 text-foreground rounded-sm',
  neutral:   'bg-muted/50 text-foreground rounded-sm',
};

export const MORPHEME_BADGE_STYLES: Record<MorphemeCategory, string> = {
  prefix:    'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300',
  root:      'bg-muted/40 border-border text-foreground',
  suffix:    'bg-violet-500/10 border-violet-500/30 text-violet-800 dark:text-violet-300',
  vowel_a:   'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300',
  vowel_ei:  'bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-300',
  vowel_ou:  'bg-orange-500/10 border-orange-500/30 text-orange-800 dark:text-orange-300',
  sheva:     'bg-purple-500/10 border-purple-500/30 text-purple-800 dark:text-purple-300',
  vowel_generic: 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300',
  dagesh:    'bg-[#928854]/10 border-[#928854]/30 text-[#928854]',
  neutral:   'bg-muted/40 border-border text-muted-foreground',
};

/**
 * Returns true if the given text consists *entirely* of Unicode combining marks
 * (Hebrew niqqud, cantillation, dagesh). These characters need a base consonant
 * to render correctly; showing them alone produces orphaned dots / marks.
 *
 * Ranges covered:
 *   U+0591–U+05BD  Cantillation + niqqud
 *   U+05BF         Rafe
 *   U+05C1–U+05C2  Shin/Sin dot
 *   U+05C4–U+05C5  Upper/Lower dot
 *   U+05C7         Qamats Qatan
 *   U+FB1E         Judeo-Spanish varika
 */
function isOnlyCombiningMarks(text: string): boolean {
  if (!text) return true;
  // eslint-disable-next-line no-control-regex
  return /^[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\uFB1E]+$/.test(text);
}

interface MorphemeSpanProps {
  segments: readonly MorphemeSegment[];
  className?: string;
  variant?: 'text' | 'highlight';
  disableColors?: boolean;
  /** When true, suppresses the native browser title tooltip on each morpheme span.
   *  Use this when a parent Tooltip component already provides richer information. */
  disableNativeTooltip?: boolean;
}

export const MorphemeSpan: React.FC<MorphemeSpanProps> = ({
  segments,
  className = '',
  variant = 'text',
  disableColors = false,
  disableNativeTooltip = false,
}) => {
  if (!segments?.length) return null;

  const styles = variant === 'highlight' ? MORPHEME_HIGHLIGHT_STYLES : MORPHEME_TEXT_STYLES;

  return (
    <span className={cn('font-hebrew inline', className)} dir="rtl" lang="he" style={{ fontFeatureSettings: '"mark" 1, "mkmk" 1' }}>
      {segments.map((seg, i) => {
        // Skip segments whose text consists entirely of Unicode combining marks.
        // Hebrew vowel points (niqqud U+0591–U+05C7), dagesh, and cantillation marks
        // are combining characters that require a preceding base consonant.
        // Rendering them alone in their own <span> breaks grapheme clusters and
        // produces orphaned floating dots/marks.
        if (isOnlyCombiningMarks(seg.text)) {
          return null;
        }
        
        return (
          <span
            key={i}
            title={disableNativeTooltip ? undefined : (seg.label || seg.role)}
            className={cn(!disableColors && styles[getMorphemeCategory(seg.role, seg.text)], "px-[1px]")}
          >
            {seg.text}
          </span>
        );
      })}
    </span>
  );
};
