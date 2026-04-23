/**
 * HebrewToolbar
 *
 * Professional tool-bar container for the Hebrew Tutor module.
 * Renders as a full-width strip with a distinct background and bottom border,
 * visually separating the tool zone from the work canvas below.
 *
 * Supports two states:
 *  - Expanded: full toolbar content (mode selector + navbar + actions)
 *  - Collapsed: thin strip showing current reference + toggle button
 */

import React from 'react';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react';

interface HebrewToolbarProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Rendered when toolbar is expanded */
  children: React.ReactNode;
  /** Compact summary shown in the collapsed strip */
  collapsedSummary: React.ReactNode;
}

export const HebrewToolbar: React.FC<HebrewToolbarProps> = ({
  collapsed,
  onToggle,
  children,
  collapsedSummary,
}) => {
  return (
    <div
      className={`
        w-full shrink-0
        bg-muted/30 dark:bg-muted/20
        border-b border-border/70
        shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]
        transition-all duration-200 ease-in-out
        print:hidden
      `}
    >
      {collapsed ? (
        /* ── Collapsed strip ── */
        <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-1.5">
          <div className="flex-1 min-w-0 flex items-center gap-2 text-xs text-muted-foreground">
            {collapsedSummary}
          </div>
          <button
            type="button"
            onClick={onToggle}
            title="Expandir barra de herramientas"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ChevronDownIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mostrar</span>
          </button>
        </div>
      ) : (
        /* ── Expanded toolbar ── */
        <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {children}
          </div>
          <button
            type="button"
            onClick={onToggle}
            title="Ocultar barra de herramientas"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 ml-2"
          >
            <ChevronUpIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ocultar</span>
          </button>
        </div>
      )}
    </div>
  );
};
