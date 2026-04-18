/**
 * LexiconCardView.tsx
 *
 * Visual card grid — 3 per row on desktop, 2 on tablet, 1 on mobile.
 * Emphasizes the Hebrew phrase and technique type.
 * Secondary data (explanation, source) is hidden; only most relevant info shown.
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LexicalEntry } from '@dosfilos/domain';
import { TYPE_BADGE_STYLES, TYPE_ACCENT_BORDER } from './LexiconFilters';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  entries: LexicalEntry[];
  onEdit: (entry: LexicalEntry) => void;
  onDelete: (entry: LexicalEntry) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LexiconCardView({ entries, onEdit, onDelete, onToggle }: Props) {
  const { t } = useTranslation('hebrewTutor');

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-12 text-center">
        {t('lexiconAdmin.empty')}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          t={t}
        />
      ))}
    </div>
  );
}

// ── Card sub-component ────────────────────────────────────────────────────────

interface CardProps {
  entry: LexicalEntry;
  onEdit: (entry: LexicalEntry) => void;
  onDelete: (entry: LexicalEntry) => void;
  onToggle: (id: string, enabled: boolean) => void;
  t: (key: string) => string;
}

function EntryCard({ entry, onEdit, onDelete, onToggle, t }: CardProps) {
  const accentBorder = TYPE_ACCENT_BORDER[entry.type];
  const typeBadge = TYPE_BADGE_STYLES[entry.type];

  return (
    <div
      className={`
        group relative flex flex-col rounded-xl border bg-card
        border-t-4 ${accentBorder}
        shadow-sm hover:shadow-md transition-all duration-200
        ${!entry.enabled ? 'opacity-55' : ''}
      `}
    >
      {/* ── Top row: type badge + chain badge ─────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${typeBadge}`}
        >
          {t(`lexiconAdmin.types.${entry.type}`)}
        </span>
        {entry.chainId && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
            🔗 {entry.chainId}
          </span>
        )}
      </div>

      {/* ── Hebrew phrase (prominent) ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-5">
        <p
          className="font-hebrew text-4xl leading-relaxed text-center text-foreground"
          dir="rtl"
          lang="he"
        >
          {entry.hebrewPhrase || '—'}
        </p>
      </div>

      {/* ── Meaning: literal → idiomatic ─────────────────────────────────── */}
      <div className="px-4 pb-3 text-center space-y-0.5">
        <p className="text-xs text-muted-foreground italic truncate">
          &ldquo;{entry.literalMeaning}&rdquo;
        </p>
        <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 truncate">
          → {entry.idiomaticMeaning}
        </p>
      </div>

      {/* ── Footer: verse refs + actions ─────────────────────────────────── */}
      <div className="flex items-center justify-between border-t px-4 py-2.5 mt-auto">
        {/* Verse refs */}
        <div className="flex flex-wrap gap-1">
          {entry.verseRefs && entry.verseRefs.length > 0
            ? (entry.verseRefs as string[]).map((ref) => (
                <span
                  key={ref}
                  className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono"
                >
                  {ref}
                </span>
              ))
            : <span className="text-[10px] text-muted-foreground/50">—</span>
          }
        </div>

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Switch
            checked={entry.enabled}
            onCheckedChange={(c) => onToggle(entry.id, c)}
            className="scale-75"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(entry)}
            title={t('lexiconAdmin.editEntry')}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600"
            onClick={() => onDelete(entry)}
            title={t('lexiconAdmin.deleteEntry')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
