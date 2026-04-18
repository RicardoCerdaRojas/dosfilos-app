/**
 * LexiconTableView.tsx
 *
 * Compact table view for managing the lexicon entries efficiently.
 * Optimal for scanning, sorting comparison, and bulk review.
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
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

export function LexiconTableView({ entries, onEdit, onDelete, onToggle }: Props) {
  const { t } = useTranslation('hebrewTutor');

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-12 text-center">
        {t('lexiconAdmin.empty')}
      </p>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/60 border-b">
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-[130px]">
              {t('lexiconAdmin.table.type')}
            </th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground w-[180px]">
              {t('lexiconAdmin.table.hebrew')}
            </th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
              {t('lexiconAdmin.table.meaning')}
            </th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-[130px]">
              {t('lexiconAdmin.table.chain')}
            </th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-[140px]">
              {t('lexiconAdmin.table.verses')}
            </th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-[80px]">
              {t('lexiconAdmin.table.status')}
            </th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-[80px]">
              {t('lexiconAdmin.table.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr
              key={entry.id}
              className={`
                border-b last:border-0 transition-colors hover:bg-muted/30
                ${!entry.enabled ? 'opacity-50' : ''}
                ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
              `}
            >
              {/* Type */}
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${TYPE_BADGE_STYLES[entry.type]}`}
                >
                  {t(`lexiconAdmin.types.${entry.type}`)}
                </span>
              </td>

              {/* Hebrew */}
              <td className="px-4 py-3 text-right">
                <span
                  className="font-hebrew text-lg leading-none text-foreground"
                  dir="rtl"
                  lang="he"
                >
                  {entry.hebrewPhrase || '—'}
                </span>
              </td>

              {/* Meaning */}
              <td className="px-4 py-3 max-w-[280px]">
                <span className="italic text-muted-foreground text-xs truncate block">
                  &ldquo;{entry.literalMeaning}&rdquo;
                </span>
                <span className="font-medium text-violet-700 dark:text-violet-300 text-xs truncate block">
                  → {entry.idiomaticMeaning}
                </span>
              </td>

              {/* Chain */}
              <td className="px-4 py-3">
                {entry.chainId ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    🔗 {entry.chainId}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground/40 text-xs">—</span>
                )}
              </td>

              {/* Verses */}
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {entry.verseRefs && entry.verseRefs.length > 0
                    ? (entry.verseRefs as string[]).map((ref) => (
                        <span
                          key={ref}
                          className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground"
                        >
                          {ref}
                        </span>
                      ))
                    : <span className="text-muted-foreground/40 text-xs">—</span>
                  }
                </div>
              </td>

              {/* Status toggle */}
              <td className="px-4 py-3 text-center">
                <Switch
                  checked={entry.enabled}
                  onCheckedChange={(c) => onToggle(entry.id, c)}
                  className="scale-90"
                />
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
