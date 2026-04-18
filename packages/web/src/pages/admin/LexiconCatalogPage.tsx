import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, BookOpenText } from 'lucide-react';
import { useAdminLexicon } from '@/hooks/admin/useAdminLexicon';
import { useTranslation } from 'react-i18next';
import type { LexicalEntry, LexicalEntryType } from '@dosfilos/domain';

// ── Type display config ───────────────────────────────────────────────────────

const TYPE_BADGE_STYLES: Record<LexicalEntryType, string> = {
  idiom:          'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  semantic_range: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  cultural_note:  'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  false_friend:   'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

const ENTRY_TYPES: LexicalEntryType[] = ['idiom', 'semantic_range', 'cultural_note', 'false_friend'];

// ── Blank form factory ────────────────────────────────────────────────────────

function blankEntry(): Partial<LexicalEntry> {
  return {
    hebrewPhrase: '',
    matchLemmas: [],
    type: 'idiom',
    literalMeaning: '',
    idiomaticMeaning: '',
    explanation: '',
    source: '',
    enabled: true,
    order: 10,
  };
}

// ── Page component ────────────────────────────────────────────────────────────

export default function LexiconCatalogPage() {
  const { t } = useTranslation('hebrewTutor');
  const { entries, isLoading, createEntry, updateEntry, deleteEntry, toggleEntry } = useAdminLexicon();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LexicalEntry> | null>(null);
  /** Temporary comma-joined string for the lemmas tag-input */
  const [lemmasInput, setLemmasInput] = useState('');

  const openEditor = (entry?: LexicalEntry) => {
    const base = entry ? { ...entry } : blankEntry();
    setEditing(base);
    setLemmasInput(
      entry ? (entry.matchLemmas as string[]).join(', ') : '',
    );
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;

    const lemmas = lemmasInput
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    const payload: Omit<LexicalEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      hebrewPhrase: editing.hebrewPhrase ?? '',
      matchLemmas: lemmas,
      type: (editing.type as LexicalEntryType) ?? 'idiom',
      literalMeaning: editing.literalMeaning ?? '',
      idiomaticMeaning: editing.idiomaticMeaning ?? '',
      explanation: editing.explanation ?? '',
      source: editing.source || undefined,
      enabled: editing.enabled ?? true,
      order: editing.order ?? 10,
    };

    try {
      if (editing.id) {
        await updateEntry(editing.id, payload);
      } else {
        await createEntry(payload);
      }
      setEditorOpen(false);
    } catch (e) {
      console.error(e);
      alert('Error guardando entrada del glosario');
    }
  };

  const handleDelete = async (entry: LexicalEntry) => {
    if (confirm(t('lexiconAdmin.deleteConfirm'))) {
      await deleteEntry(entry.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpenText className="w-7 h-7 text-violet-600" />
            {t('lexiconAdmin.title')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('lexiconAdmin.subtitle')}</p>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="mr-2 h-4 w-4" />
          {t('lexiconAdmin.newEntry')}
        </Button>
      </div>

      {/* ── Entry list ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4">
        {isLoading && <p className="text-muted-foreground">{t('lexiconAdmin.loading')}</p>}
        {!isLoading && entries.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">{t('lexiconAdmin.empty')}</p>
        )}
        {!isLoading && entries.map((entry) => (
          <Card key={entry.id} className={!entry.enabled ? 'opacity-60' : ''}>
            <CardHeader className="py-4 flex flex-row items-start justify-between">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${TYPE_BADGE_STYLES[entry.type]}`}
                  >
                    {t(`lexiconAdmin.types.${entry.type}`)}
                  </span>
                  {entry.source && (
                    <Badge variant="outline" className="text-[10px]">{entry.source}</Badge>
                  )}
                </div>
                {/* Hebrew phrase */}
                <span
                  className="font-hebrew text-2xl leading-none text-foreground"
                  dir="rtl"
                >
                  {entry.hebrewPhrase || '—'}
                </span>
                {/* Meaning summary */}
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="italic">"{entry.literalMeaning}"</span>
                  <span className="mx-2 text-muted-foreground/40">→</span>
                  <span className="font-medium text-violet-700 dark:text-violet-300">"{entry.idiomaticMeaning}"</span>
                </p>
              </div>
              {/* Controls */}
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t('lexiconAdmin.fields.enabled')}</span>
                  <Switch
                    checked={entry.enabled}
                    onCheckedChange={(c) => toggleEntry(entry.id, c)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEditor(entry)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => handleDelete(entry)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-2 text-sm text-muted-foreground">
              <p className="line-clamp-2 text-xs">{entry.explanation}</p>
              <div className="flex gap-4 border-t pt-2 mt-2 text-xs">
                <span><strong>Lemas:</strong> {(entry.matchLemmas as string[]).join(', ') || '—'}</span>
                <span><strong>Orden:</strong> {entry.order}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Editor dialog ────────────────────────────────────────────────────── */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? t('lexiconAdmin.editEntry') : t('lexiconAdmin.newEntry')}
            </DialogTitle>
            <DialogDescription>
              {t('lexiconAdmin.subtitle')}
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="grid gap-5 py-4">
              {/* Hebrew phrase + type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('lexiconAdmin.fields.hebrewPhrase')}</label>
                  <Input
                    dir="rtl"
                    className="font-hebrew text-xl"
                    placeholder="e.g. חַיַּת הַשָּׂדֶה"
                    value={editing.hebrewPhrase ?? ''}
                    onChange={(e) => setEditing({ ...editing, hebrewPhrase: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('lexiconAdmin.fields.type')}</label>
                  <Select
                    value={editing.type ?? 'idiom'}
                    onValueChange={(v) => setEditing({ ...editing, type: v as LexicalEntryType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTRY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`lexiconAdmin.types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lemmas */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('lexiconAdmin.fields.matchLemmas')}</label>
                <Input
                  placeholder="e.g. חַי, שָׂדֶה"
                  value={lemmasInput}
                  onChange={(e) => setLemmasInput(e.target.value)}
                />
              </div>

              {/* Literal + Idiomatic */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('lexiconAdmin.fields.literalMeaning')}</label>
                  <Input
                    placeholder="e.g. criatura viviente del campo"
                    value={editing.literalMeaning ?? ''}
                    onChange={(e) => setEditing({ ...editing, literalMeaning: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('lexiconAdmin.fields.idiomaticMeaning')}</label>
                  <Input
                    placeholder="e.g. animales salvajes"
                    value={editing.idiomaticMeaning ?? ''}
                    onChange={(e) => setEditing({ ...editing, idiomaticMeaning: e.target.value })}
                  />
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('lexiconAdmin.fields.explanation')}</label>
                <Textarea
                  className="min-h-[100px]"
                  placeholder="Explicación académica de la diferencia semántica..."
                  value={editing.explanation ?? ''}
                  onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
                />
              </div>

              {/* Source + Order */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">{t('lexiconAdmin.fields.source')}</label>
                  <Input
                    placeholder="e.g. HALOT 310"
                    value={editing.source ?? ''}
                    onChange={(e) => setEditing({ ...editing, source: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('lexiconAdmin.fields.order')}</label>
                  <Input
                    type="number"
                    value={editing.order ?? 10}
                    onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              {t('lexiconAdmin.cancel')}
            </Button>
            <Button onClick={handleSave}>{t('lexiconAdmin.saveEntry')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
