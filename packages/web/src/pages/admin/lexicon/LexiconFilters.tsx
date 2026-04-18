/**
 * LexiconFilters.tsx
 *
 * Shared filter bar for the Lexicon Catalog admin page.
 * All views (Cards, Table, Chains) use the same filter state.
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import type { LexicalEntry, LexicalEntryType } from '@dosfilos/domain';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LexiconFilterState {
  types: LexicalEntryType[];
  chainId: string;         // '' means all
  searchText: string;
  onlyEnabled: boolean;
}

export const EMPTY_FILTERS: LexiconFilterState = {
  types: [],
  chainId: '',
  searchText: '',
  onlyEnabled: false,
};

interface Props {
  entries: LexicalEntry[];
  filters: LexiconFilterState;
  onChange: (filters: LexiconFilterState) => void;
}

// ── Type badge helpers (shared across views) ──────────────────────────────────

export const TYPE_BADGE_STYLES: Record<LexicalEntryType, string> = {
  idiom:
    'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  semantic_range:
    'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  cultural_note:
    'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  false_friend:
    'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  grammatical_note:
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
};

export const TYPE_ACCENT_BORDER: Record<LexicalEntryType, string> = {
  idiom:            'border-t-violet-400',
  semantic_range:   'border-t-sky-400',
  cultural_note:    'border-t-teal-400',
  false_friend:     'border-t-rose-400',
  grammatical_note: 'border-t-indigo-400',
};

const ALL_TYPES: LexicalEntryType[] = [
  'idiom',
  'semantic_range',
  'cultural_note',
  'false_friend',
  'grammatical_note',
];

// ── Search helpers ────────────────────────────────────────────────────────────

/**
 * Normalizes a verse-reference query so that user inputs like
 * "gen 3:12", "Gen.3.12", "gén 3,12", "genesis 3 12" all match
 * the canonical "Gen.3.12" format stored in Firestore verseRefs.
 *
 * Strategy: collapse all non-alphanumeric characters into a single
 * dot, then lowercase — identical transformation applied to both the
 * query and the stored refs before comparison.
 */
function normalizeRef(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9áéíóúüñ]+/gi, '.').toLowerCase();
}

// ── Filtering logic (exported so views can use it) ────────────────────────────

export function applyFilters(
  entries: LexicalEntry[],
  filters: LexiconFilterState,
): LexicalEntry[] {
  return entries.filter((e) => {
    if (filters.onlyEnabled && !e.enabled) return false;
    if (filters.types.length > 0 && !filters.types.includes(e.type)) return false;
    if (filters.chainId && e.chainId !== filters.chainId) return false;
    if (filters.searchText) {
      const q = filters.searchText.toLowerCase();
      const qNorm = normalizeRef(filters.searchText);

      // Search across all meaningful text fields
      const textHit =
        e.hebrewPhrase.toLowerCase().includes(q) ||
        e.literalMeaning.toLowerCase().includes(q) ||
        e.idiomaticMeaning.toLowerCase().includes(q) ||
        (e.explanation?.toLowerCase().includes(q) ?? false) ||
        (e.source?.toLowerCase().includes(q) ?? false);

      // Search across verse refs with format normalization
      // e.g. "gen 3:12" → "gen.3.12" matches stored "Gen.3.12" → "gen.3.12"
      const refHit = (e.verseRefs ?? []).some((ref) =>
        normalizeRef(ref).includes(qNorm),
      );

      if (!textHit && !refHit) return false;
    }
    return true;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LexiconFilters({ entries, filters, onChange }: Props) {
  const { t } = useTranslation('hebrewTutor');

  // Derive unique chain IDs from entries
  const chainIds = Array.from(
    new Set(entries.map((e) => e.chainId).filter(Boolean) as string[]),
  ).sort();

  const set = (partial: Partial<LexiconFilterState>) =>
    onChange({ ...filters, ...partial });

  const toggleType = (type: LexicalEntryType) => {
    const types = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    set({ types });
  };

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.chainId !== '' ||
    filters.searchText !== '' ||
    filters.onlyEnabled;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/40 rounded-xl border mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('lexiconAdmin.filters.search')}
          value={filters.searchText}
          onChange={(e) => set({ searchText: e.target.value })}
        />
      </div>

      {/* Type pills */}
      <div className="flex items-center gap-1.5">
        {ALL_TYPES.map((type) => {
          const active = filters.types.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide transition-all ${
                active
                  ? TYPE_BADGE_STYLES[type] + ' ring-2 ring-offset-1 ring-current'
                  : 'bg-background border text-muted-foreground hover:bg-muted'
              }`}
            >
              {t(`lexiconAdmin.types.${type}`)}
            </button>
          );
        })}
      </div>

      {/* Chain filter */}
      {chainIds.length > 0 && (
        <Select
          value={filters.chainId || '__all__'}
          onValueChange={(v) => set({ chainId: v === '__all__' ? '' : v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('lexiconAdmin.filters.allChains')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">
              {t('lexiconAdmin.filters.allChains')}
            </SelectItem>
            {chainIds.map((id) => (
              <SelectItem key={id} value={id}>
                🔗 {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Only enabled toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={filters.onlyEnabled}
          onCheckedChange={(v) => set({ onlyEnabled: v })}
          id="only-enabled"
        />
        <label htmlFor="only-enabled" className="text-sm cursor-pointer select-none">
          {t('lexiconAdmin.filters.onlyEnabled')}
        </label>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-muted-foreground"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
