/**
 * LexiconEntryEditor.tsx
 *
 * Extracted and self-contained dialog for creating / editing a LexicalEntry.
 * Receives all data and handlers via props — no direct store access.
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import type { LexicalEntry, LexicalEntryType } from '@dosfilos/domain';

// ── Constants ─────────────────────────────────────────────────────────────────

const ENTRY_TYPES: LexicalEntryType[] = [
  'idiom',
  'semantic_range',
  'cultural_note',
  'false_friend',
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type LexiconEntryPayload = Omit<LexicalEntry, 'id' | 'createdAt' | 'updatedAt'>;

interface Props {
  open: boolean;
  editing: Partial<LexicalEntry> | null;
  onSave: (payload: LexiconEntryPayload) => Promise<void>;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LexiconEntryEditor({ open, editing, onSave, onClose }: Props) {
  const { t } = useTranslation('hebrewTutor');

  const [draft, setDraft] = useState<Partial<LexicalEntry>>({});
  const [lemmasInput, setLemmasInput] = useState('');
  const [verseRefsInput, setVerseRefsInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync local draft whenever the editing prop changes (open a different entry)
  useEffect(() => {
    if (editing) {
      setDraft({ ...editing });
      setLemmasInput(
        editing.matchLemmas ? (editing.matchLemmas as string[]).join(', ') : '',
      );
      setVerseRefsInput(
        editing.verseRefs ? (editing.verseRefs as string[]).join(', ') : '',
      );
    }
  }, [editing]);

  const handleSave = async () => {
    if (!draft) return;

    const lemmas = lemmasInput
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    const refs = verseRefsInput
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    const chainId = (draft.chainId ?? '').trim() || undefined;

    const payload: LexiconEntryPayload = {
      hebrewPhrase: draft.hebrewPhrase ?? '',
      matchLemmas: lemmas,
      verseRefs: refs.length > 0 ? refs : undefined,
      chainId,
      type: (draft.type as LexicalEntryType) ?? 'idiom',
      literalMeaning: draft.literalMeaning ?? '',
      idiomaticMeaning: draft.idiomaticMeaning ?? '',
      explanation: draft.explanation ?? '',
      source: draft.source || undefined,
      enabled: draft.enabled ?? true,
      order: draft.order ?? 10,
    };

    try {
      setSaving(true);
      await onSave(payload);
      onClose();
    } catch (e) {
      console.error('[LexiconEntryEditor] save failed:', e);
      alert('Error guardando entrada del glosario');
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof LexicalEntry, value: unknown) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {draft?.id ? t('lexiconAdmin.editEntry') : t('lexiconAdmin.newEntry')}
          </DialogTitle>
          <DialogDescription>{t('lexiconAdmin.subtitle')}</DialogDescription>
        </DialogHeader>

        {draft && (
          <div className="grid gap-5 py-4">
            {/* Hebrew phrase + type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('lexiconAdmin.fields.hebrewPhrase')}
                </label>
                <Input
                  dir="rtl"
                  className="font-hebrew text-xl"
                  placeholder="e.g. חַיַּת הַשָּׂדֶה"
                  value={draft.hebrewPhrase ?? ''}
                  onChange={(e) => set('hebrewPhrase', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('lexiconAdmin.fields.type')}
                </label>
                <Select
                  value={draft.type ?? 'idiom'}
                  onValueChange={(v) => set('type', v as LexicalEntryType)}
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
              <label className="text-sm font-medium">
                {t('lexiconAdmin.fields.matchLemmas')}
              </label>
              <Input
                placeholder="e.g. 6963 a, 6963 (Strong's numbers)"
                value={lemmasInput}
                onChange={(e) => setLemmasInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('lexiconAdmin.fields.matchLemmasHint')}
              </p>
            </div>

            {/* Verse Refs */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('lexiconAdmin.fields.verseRefs')}
              </label>
              <Input
                placeholder="e.g. Gen.3.8, Ps.23.1"
                value={verseRefsInput}
                onChange={(e) => setVerseRefsInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('lexiconAdmin.fields.verseRefsHint')}
              </p>
            </div>

            {/* Chain ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('lexiconAdmin.fields.chainId')}
              </label>
              <Input
                placeholder="e.g. qol-gen3"
                value={draft.chainId ?? ''}
                onChange={(e) => set('chainId', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('lexiconAdmin.fields.chainIdHint')}
              </p>
            </div>

            {/* Literal + Idiomatic */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('lexiconAdmin.fields.literalMeaning')}
                </label>
                <Input
                  placeholder="e.g. criatura viviente del campo"
                  value={draft.literalMeaning ?? ''}
                  onChange={(e) => set('literalMeaning', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('lexiconAdmin.fields.idiomaticMeaning')}
                </label>
                <Input
                  placeholder="e.g. animales salvajes"
                  value={draft.idiomaticMeaning ?? ''}
                  onChange={(e) => set('idiomaticMeaning', e.target.value)}
                />
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('lexiconAdmin.fields.explanation')}
              </label>
              <Textarea
                className="min-h-[100px]"
                placeholder="Explicación académica de la diferencia semántica..."
                value={draft.explanation ?? ''}
                onChange={(e) => set('explanation', e.target.value)}
              />
            </div>

            {/* Source + Order */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">
                  {t('lexiconAdmin.fields.source')}
                </label>
                <Input
                  placeholder="e.g. HALOT 310"
                  value={draft.source ?? ''}
                  onChange={(e) => set('source', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('lexiconAdmin.fields.order')}
                </label>
                <Input
                  type="number"
                  value={draft.order ?? 10}
                  onChange={(e) => set('order', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('lexiconAdmin.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : t('lexiconAdmin.saveEntry')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
