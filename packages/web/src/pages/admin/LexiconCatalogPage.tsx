/**
 * LexiconCatalogPage.tsx
 *
 * Admin page for managing the Hebrew lexical entry catalog.
 * Orchestrates 3 views (Cards, Table, Chains) with shared filters.
 * All business logic lives in useAdminLexicon(); this component handles UI state only.
 */

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  BookOpenText,
  DatabaseZap,
  LayoutGrid,
  Table2,
  Link2,
} from 'lucide-react';
import { useAdminLexicon } from '@/hooks/admin/useAdminLexicon';
import { useTranslation } from 'react-i18next';
import type { LexicalEntry } from '@dosfilos/domain';
import { seedLexicon } from '@/pages/hebrew-tutor/lexicon/seed-lexicon';

import {
  LexiconFilters,
  applyFilters,
  EMPTY_FILTERS,
  type LexiconFilterState,
} from './lexicon/LexiconFilters';
import { LexiconCardView } from './lexicon/LexiconCardView';
import { LexiconTableView } from './lexicon/LexiconTableView';
import { LexiconChainsView } from './lexicon/LexiconChainsView';
import { LexiconEntryEditor, type LexiconEntryPayload } from './lexicon/LexiconEntryEditor';
import { useConfirm } from '@/hooks/useConfirm';

// ── View mode type ─────────────────────────────────────────────────────────────

type ViewMode = 'cards' | 'table' | 'chains';

// ── Blank entry factory ────────────────────────────────────────────────────────

function blankEntry(): Partial<LexicalEntry> {
  return {
    hebrewPhrase: '',
    matchLemmas: [],
    verseRefs: [],
    type: 'idiom',
    literalMeaning: '',
    idiomaticMeaning: '',
    explanation: '',
    source: '',
    enabled: true,
    order: 10,
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LexiconCatalogPage() {
  const { t } = useTranslation('hebrewTutor');
  const { confirm, confirmDialog } = useConfirm();
  const { entries, isLoading, createEntry, updateEntry, deleteEntry, toggleEntry } =
    useAdminLexicon();

  // ── View & filter state ────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [filters, setFilters] = useState<LexiconFilterState>(EMPTY_FILTERS);

  // ── Editor state ───────────────────────────────────────────────────────────
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LexicalEntry> | null>(null);

  // ── Seed state ─────────────────────────────────────────────────────────────
  const [seedStatus, setSeedStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [seedResult, setSeedResult] = useState<{ created: number; skipped: number } | null>(null);

  // ── Derived: filtered entries ──────────────────────────────────────────────
  const filteredEntries = useMemo(
    () => applyFilters(entries, filters),
    [entries, filters],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openEditor = (entry?: LexicalEntry) => {
    setEditing(entry ? { ...entry } : blankEntry());
    setEditorOpen(true);
  };

  const handleSave = async (payload: LexiconEntryPayload) => {
    if (editing?.id) {
      await updateEntry(editing.id, payload);
    } else {
      await createEntry(payload);
    }
  };

  const handleDelete = async (entry: LexicalEntry) => {
    if (await confirm({ body: t('lexiconAdmin.deleteConfirm') })) {
      await deleteEntry(entry.id);
    }
  };

  const handleSeed = async () => {
    setSeedStatus('running');
    setSeedResult(null);
    try {
      const result = await seedLexicon();
      setSeedResult(result);
      setSeedStatus('done');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('[LexiconCatalogPage] Seed failed:', err);
      setSeedStatus('error');
    }
  };

  // ── View switcher config ───────────────────────────────────────────────────

  const viewButtons: { mode: ViewMode; icon: React.ReactNode; labelKey: string }[] = [
    {
      mode: 'cards',
      icon: <LayoutGrid className="h-4 w-4" />,
      labelKey: 'lexiconAdmin.views.cards',
    },
    {
      mode: 'table',
      icon: <Table2 className="h-4 w-4" />,
      labelKey: 'lexiconAdmin.views.table',
    },
    {
      mode: 'chains',
      icon: <Link2 className="h-4 w-4" />,
      labelKey: 'lexiconAdmin.views.chains',
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpenText className="w-7 h-7 text-violet-600" />
            {t('lexiconAdmin.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('lexiconAdmin.subtitle')}</p>
          {seedResult && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              ✅ Seed completo: {seedResult.created} creadas, {seedResult.skipped} omitidas.
            </p>
          )}
          {seedStatus === 'error' && (
            <p className="text-xs text-red-500 mt-1">❌ Error ejecutando el seed. Ver consola.</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={seedStatus === 'running'}
            onClick={handleSeed}
          >
            <DatabaseZap className="mr-2 h-4 w-4" />
            {seedStatus === 'running' ? 'Ejecutando...' : 'Seed Génesis 1–11'}
          </Button>
          <Button onClick={() => openEditor()}>
            <Plus className="mr-2 h-4 w-4" />
            {t('lexiconAdmin.newEntry')}
          </Button>
        </div>
      </div>

      {/* ── View switcher ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {viewButtons.map(({ mode, icon, labelKey }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === mode
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {icon}
            {t(labelKey)}
          </button>
        ))}

        {/* Live count */}
        <span className="ml-2 text-xs text-muted-foreground px-2 border-l">
          {isLoading ? '…' : `${filteredEntries.length} / ${entries.length}`}
        </span>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <LexiconFilters entries={entries} filters={filters} onChange={setFilters} />

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm py-12 text-center">
          {t('lexiconAdmin.loading')}
        </p>
      ) : (
        <>
          {viewMode === 'cards' && (
            <LexiconCardView
              entries={filteredEntries}
              onEdit={openEditor}
              onDelete={handleDelete}
              onToggle={toggleEntry}
            />
          )}
          {viewMode === 'table' && (
            <LexiconTableView
              entries={filteredEntries}
              onEdit={openEditor}
              onDelete={handleDelete}
              onToggle={toggleEntry}
            />
          )}
          {viewMode === 'chains' && (
            <LexiconChainsView
              entries={filteredEntries}
              onEdit={openEditor}
              onDelete={handleDelete}
              onToggle={toggleEntry}
            />
          )}
        </>
      )}

      {/* ── Editor dialog ────────────────────────────────────────────────────── */}
      <LexiconEntryEditor
        open={editorOpen}
        editing={editing}
        onSave={handleSave}
        onClose={() => setEditorOpen(false)}
      />

      {confirmDialog}
    </div>
  );
}
