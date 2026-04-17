/**
 * HintList
 *
 * Pure rendering component for a list of HintDefinition objects.
 * Has no business logic — receives already-resolved hints from the parent.
 *
 * Supports a limited markdown-like subset in the body:
 *   **bold text**   → <strong>
 *   _italic text_   → <em>
 *   `code`          → <code>
 */

import React from 'react';
import type { HintDefinition, HintSeverity } from '@dosfilos/domain';

// ── Markdown-lite renderer ────────────────────────────────────────────────

function renderBody(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch   = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/_(.+?)_/);
    const codeMatch   = remaining.match(/`(.+?)`/);

    const candidates = [boldMatch, italicMatch, codeMatch]
      .filter(Boolean)
      .sort((a, b) => (a!.index ?? 0) - (b!.index ?? 0));

    const first = candidates[0];
    if (!first || first.index === undefined) {
      parts.push(remaining);
      break;
    }

    if (first.index > 0) parts.push(remaining.slice(0, first.index));

    const inner = first[1];
    if (first === boldMatch)         parts.push(<strong key={key++}>{inner}</strong>);
    else if (first === italicMatch)  parts.push(<em key={key++}>{inner}</em>);
    else                             parts.push(<code key={key++} className="px-1 py-0.5 rounded text-[11px] font-mono bg-muted">{inner}</code>);

    remaining = remaining.slice(first.index + first[0].length);
  }

  return parts;
}

// ── Severity style maps ───────────────────────────────────────────────────

interface SeverityClasses {
  container: string;
  accent: string;
  titleColor: string;
}

const SEVERITY_CLASSES: Record<HintSeverity, SeverityClasses> = {
  info: {
    container: 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800',
    accent:    'bg-amber-400 dark:bg-amber-600',
    titleColor:'text-amber-800 dark:text-amber-300',
  },
  warning: {
    container: 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800',
    accent:    'bg-orange-400 dark:bg-orange-600',
    titleColor:'text-orange-800 dark:text-orange-300',
  },
  tip: {
    container: 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800',
    accent:    'bg-blue-400 dark:bg-blue-600',
    titleColor:'text-blue-800 dark:text-blue-300',
  },
};

// ── HintItem ──────────────────────────────────────────────────────────────

function HintItem({ hint }: { hint: HintDefinition }) {
  const cls = SEVERITY_CLASSES[hint.severity];
  const bodyColor =
    hint.severity === 'info'    ? 'text-amber-800 dark:text-amber-300' :
    hint.severity === 'warning' ? 'text-orange-800 dark:text-orange-300' :
                                  'text-blue-800 dark:text-blue-300';

  return (
    <div className={`${cls.container} rounded-xl p-3 flex gap-2`}>
      {/* Colored accent bar */}
      <div className={`${cls.accent} w-1 rounded-full shrink-0`} aria-hidden="true" />
      <p className={`text-xs leading-relaxed ${bodyColor}`}>
        {hint.title && (
          <strong className={`${cls.titleColor} font-semibold`}>
            {hint.title}:{' '}
          </strong>
        )}
        {renderBody(hint.body)}
      </p>
    </div>
  );
}

// ── HintList (public) ─────────────────────────────────────────────────────

interface HintListProps {
  hints: HintDefinition[];
  className?: string;
}

export function HintList({ hints, className = '' }: HintListProps) {
  if (hints.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {hints.map(hint => (
        <HintItem key={hint.id} hint={hint} />
      ))}
    </div>
  );
}
