/**
 * LexiconChainsView.tsx
 *
 * Groups lexical entries by their chainId (Leitwort threads).
 * Entries are ordered by their `order` field within each chain.
 * Entries without a chainId appear in a collapsible "Sin cadena" section.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LexicalEntry } from '@dosfilos/domain';
import { TYPE_BADGE_STYLES } from './LexiconFilters';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  entries: LexicalEntry[];
  onEdit: (entry: LexicalEntry) => void;
  onDelete: (entry: LexicalEntry) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LexiconChainsView({ entries, onEdit, onDelete, onToggle }: Props) {
  const { t } = useTranslation('hebrewTutor');
  const [unlinkedOpen, setUnlinkedOpen] = useState(false);

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-12 text-center">
        {t('lexiconAdmin.empty')}
      </p>
    );
  }

  // Group entries by chainId
  const chainMap = new Map<string, LexicalEntry[]>();
  const unlinked: LexicalEntry[] = [];

  for (const entry of entries) {
    if (entry.chainId) {
      const group = chainMap.get(entry.chainId) ?? [];
      group.push(entry);
      chainMap.set(entry.chainId, group);
    } else {
      unlinked.push(entry);
    }
  }

  // Sort each chain by order
  for (const [id, group] of chainMap.entries()) {
    chainMap.set(
      id,
      [...group].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    );
  }

  // Sort chains alphabetically
  const sortedChainIds = Array.from(chainMap.keys()).sort();

  return (
    <div className="space-y-4">
      {/* ── Named chains ──────────────────────────────────────────────────── */}
      {sortedChainIds.length === 0 && unlinked.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-6 text-center">
          <Link2 className="mx-auto h-8 w-8 text-amber-400 mb-2" />
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            {t('lexiconAdmin.chains.noChains')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('lexiconAdmin.chains.noChainsHint')}
          </p>
        </div>
      )}

      {sortedChainIds.map((chainId) => {
        const chainEntries = chainMap.get(chainId)!;
        return (
          <ChainGroup
            key={chainId}
            chainId={chainId}
            entries={chainEntries}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
            t={t}
          />
        );
      })}

      {/* ── Unlinked entries (collapsible) ────────────────────────────────── */}
      {unlinked.length > 0 && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30">
          {/* Header */}
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
            onClick={() => setUnlinkedOpen((v) => !v)}
          >
            <div className="flex items-center gap-3">
              {unlinkedOpen
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
              <span className="font-semibold text-muted-foreground">
                {t('lexiconAdmin.chains.noChain')}
              </span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                {unlinked.length} {t('lexiconAdmin.chains.entries')}
              </span>
            </div>
          </button>

          {/* Entries */}
          {unlinkedOpen && (
            <div className="px-4 pb-4 space-y-2">
              {unlinked.map((entry) => (
                <ChainEntryRow
                  key={entry.id}
                  entry={entry}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggle={onToggle}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ChainGroup ────────────────────────────────────────────────────────────────

interface ChainGroupProps {
  chainId: string;
  entries: LexicalEntry[];
  onEdit: (entry: LexicalEntry) => void;
  onDelete: (entry: LexicalEntry) => void;
  onToggle: (id: string, enabled: boolean) => void;
  t: (key: string) => string;
}

function ChainGroup({ chainId, entries, onEdit, onDelete, onToggle, t }: ChainGroupProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
      {/* Chain header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          {open
            ? <ChevronDown className="h-4 w-4 text-amber-600" />
            : <ChevronRight className="h-4 w-4 text-amber-600" />
          }
          <span className="text-amber-700 dark:text-amber-300 font-bold text-sm">
            🔗 {chainId}
          </span>
          <span className="text-xs bg-amber-100 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
            {entries.length} {t('lexiconAdmin.chains.entries')}
          </span>
        </div>

        {/* Chain narrative preview */}
        <p className="hidden md:block text-xs text-muted-foreground truncate max-w-[300px]">
          {entries.map((e) => e.hebrewPhrase).join(' → ')}
        </p>
      </button>

      {/* Chain entries */}
      {open && (
        <div className="divide-y">
          {entries.map((entry, idx) => (
            <div key={entry.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
              {/* Step number */}
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center justify-center">
                {idx + 1}
              </span>

              <ChainEntryRow
                entry={entry}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
                t={t}
                compact
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ChainEntryRow ─────────────────────────────────────────────────────────────

interface RowProps {
  entry: LexicalEntry;
  onEdit: (entry: LexicalEntry) => void;
  onDelete: (entry: LexicalEntry) => void;
  onToggle: (id: string, enabled: boolean) => void;
  t: (key: string) => string;
  compact?: boolean;
}

function ChainEntryRow({ entry, onEdit, onDelete, onToggle, t, compact }: RowProps) {
  return (
    <div
      className={`flex items-center gap-4 flex-1 min-w-0 ${!entry.enabled ? 'opacity-50' : ''}`}
    >
      {/* Type badge */}
      <span
        className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${TYPE_BADGE_STYLES[entry.type]}`}
      >
        {t(`lexiconAdmin.types.${entry.type}`)}
      </span>

      {/* Hebrew */}
      <span
        className={`font-hebrew text-foreground flex-shrink-0 ${compact ? 'text-xl' : 'text-2xl'}`}
        dir="rtl"
        lang="he"
      >
        {entry.hebrewPhrase}
      </span>

      {/* Meaning */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground italic truncate">
          &ldquo;{entry.literalMeaning}&rdquo;
        </p>
        <p className="text-xs font-medium text-violet-700 dark:text-violet-300 truncate">
          → {entry.idiomaticMeaning}
        </p>
      </div>

      {/* Verse refs */}
      <div className="hidden sm:flex flex-wrap gap-1 flex-shrink-0">
        {entry.verseRefs && (entry.verseRefs as string[]).map((ref) => (
          <span
            key={ref}
            className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground"
          >
            {ref}
          </span>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
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
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 hover:text-red-600"
          onClick={() => onDelete(entry)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
