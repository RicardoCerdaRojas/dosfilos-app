/**
 * StickyVerseHeader
 *
 * Compact floating bar that appears when the main verse header scrolls out of
 * view. Uses IntersectionObserver on a sentinel element.
 *
 * Features:
 *  - Per-word transliteration below each Hebrew token
 *  - Bidirectional highlighting (activeWordIndex ↔ WordCard grid)
 *  - Rich tooltip on hover: gloss + grammatical category
 *  - Proportional text scale (shared with main header via textScale prop)
 */

import React, { useEffect, useState } from 'react';
import { MorphemeSpan } from './MorphemeSpan';
import { WordTooltipContent } from './WordTooltipContent';
import {
  Tooltip,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { VerseAnalysis } from '@dosfilos/domain';

interface StickyVerseHeaderProps {
  analysis: VerseAnalysis;
  showColors: boolean;
  showVerbMarkers: boolean;
  sentinelRef: React.RefObject<HTMLDivElement>;
  activeWordIndex: number | null;
  onWordHover: (index: number | null) => void;
  onWordClick: (index: number) => void;
  /** Proportional scale factor shared with the main header. Default 1.0 */
  textScale?: number;
}


export const StickyVerseHeader: React.FC<StickyVerseHeaderProps> = ({
  analysis,
  showColors,
  showVerbMarkers,
  sentinelRef,
  activeWordIndex,
  onWordHover,
  onWordClick,
  textScale = 1.0,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: '0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelRef]);

  return (
    <div
      aria-hidden={!visible}
      className={`
        fixed top-0 left-0 right-0 z-50
        bg-background/95 backdrop-blur-md
        border-b border-border/60 shadow-md
        transition-all duration-300 ease-in-out
        print:hidden
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-5">
        {/* Reference */}
        <span className="text-sm font-bold text-primary whitespace-nowrap shrink-0">
          {analysis.reference}
        </span>

        {/* Divider */}
        <span className="w-px h-16 bg-border shrink-0" />

        {/* Hebrew word strip */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div
            dir="rtl"
            lang="he"
            className="font-serif text-foreground flex flex-nowrap gap-x-5 items-start pb-1"
            style={{ fontSize: `${1.75 * textScale}rem`, lineHeight: 1.2 }}
          >
            {analysis.words.map((w, i) => {
              const isVerb = !!w.verbMorphology && showVerbMarkers;
              const isActive = activeWordIndex === i;


              return (
                <Tooltip key={i} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span
                      onClick={() => onWordClick(i)}
                      onMouseEnter={() => onWordHover(i)}
                      onMouseLeave={() => onWordHover(null)}
                      className={`
                        inline-flex flex-col items-center shrink-0
                        cursor-pointer rounded-md px-1 pt-0.5
                        transition-all duration-150
                        ${isActive
                          ? 'bg-primary/15 ring-1 ring-primary/40 border-b-2 border-primary scale-105 shadow-sm'
                          : isVerb
                            ? 'border-b-2 border-emerald-500/60 hover:bg-primary/8 hover:border-primary/60 hover:shadow-sm'
                            : 'border-b-2 border-transparent hover:bg-muted hover:border-primary/30 hover:shadow-sm'
                        }
                      `}
                    >
                      {/* Hebrew text */}
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
                          style={{ fontSize: `${9 * textScale}px` }}
                          className="font-normal italic text-muted-foreground leading-none mt-2.5 pb-2.5 tracking-tight block"
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
        </div>
      </div>
    </div>
  );
};
