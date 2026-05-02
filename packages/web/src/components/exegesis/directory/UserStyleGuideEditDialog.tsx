import { useEffect, useState } from 'react';
import { Loader2, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { UserStyleGuide } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/i18n';
import { useUserStyleGuides } from '@/hooks/exegesis/useUserStyleGuides';

/**
 * Modal editor for a `UserStyleGuide`.
 *
 * v1.6 scope (intentional): rename `displayName` + `version`, plus a
 * read-only inspection of the extracted manifest so the user can SEE
 * what got picked up from their PDF. Editing the manifest itself is
 * scheduled for v1.7 — see memory note
 * `feature_exegesis_v17_rich_style_guide.md` for the roadmap.
 *
 * Why the asymmetry vs `UserRubricEditDialog`: the rubric body is a
 * small, hand-authored object and editing it is the primary use case.
 * The style manifest is a much larger, deeply nested LLM extraction
 * (footnote templates, ibid rules, transliteration, etc.) — building
 * a real editor for it is its own sprint, and shipping a half-baked
 * one would be worse than the current "delete + re-upload" workaround.
 */
export interface UserStyleGuideEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    guide: UserStyleGuide;
}

export function UserStyleGuideEditDialog({ open, onOpenChange, guide }: UserStyleGuideEditDialogProps) {
    const { t } = useTranslation('exegesis');
    const { updateGuide } = useUserStyleGuides();
    const saving = updateGuide.isPending;

    const [displayName, setDisplayName] = useState(guide.displayName);
    const [version, setVersion] = useState(guide.version ?? '');

    useEffect(() => {
        if (!open) return;
        setDisplayName(guide.displayName);
        setVersion(guide.version ?? '');
    }, [open, guide]);

    const trimmedName = displayName.trim();
    const canSubmit = trimmedName.length >= 3 && !saving;

    const handleSave = async () => {
        if (!canSubmit) return;
        try {
            await updateGuide.mutateAsync({
                guideId: guide.id,
                displayName: trimmedName,
                version: version.trim() || undefined,
            });
            toast.success(t('directory.styleGuides.toast.updated'));
            onOpenChange(false);
        } catch (err) {
            console.error('[exegesis] update style guide failed:', err);
            toast.error(t('directory.styleGuides.toast.updateFailed'));
        }
    };

    const manifest = guide.manifest;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('directory.styleGuides.edit.title')}</DialogTitle>
                    <DialogDescription>
                        {t('directory.styleGuides.edit.subtitle')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* ── Editable name + version ── */}
                    <section className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
                        <div>
                            <label className="block text-xs font-medium text-foreground mb-1">
                                {t('directory.styleGuides.edit.nameLabel')}
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                disabled={saving}
                                className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-foreground mb-1">
                                {t('directory.styleGuides.edit.versionLabel')}
                            </label>
                            <input
                                type="text"
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                                placeholder={t('directory.styleGuides.versionPlaceholder')}
                                disabled={saving}
                                className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50"
                            />
                        </div>
                    </section>

                    {/* ── Read-only manifest inspection ── */}
                    <section className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                        <header className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                    {t('directory.styleGuides.edit.manifestSection')}
                                </h3>
                                <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                                    {t('directory.styleGuides.edit.manifestReadOnlyNotice')}
                                </p>
                            </div>
                        </header>

                        {!manifest ? (
                            <p className="text-xs text-muted-foreground italic">
                                {t('directory.styleGuides.edit.manifestEmpty')}
                            </p>
                        ) : (
                            <dl className="space-y-3 text-xs">
                                <ManifestField
                                    label={t('directory.styleGuides.edit.manifest.citationLabel')}
                                    value={manifest.citationStyleLabel || '—'}
                                />
                                <ManifestField
                                    label={t('directory.styleGuides.edit.manifest.footnotesFirst')}
                                    value={<code className="text-[11px] break-all">{manifest.footnotes.firstMentionTemplate}</code>}
                                />
                                <ManifestField
                                    label={t('directory.styleGuides.edit.manifest.footnotesSubsequent')}
                                    value={<code className="text-[11px] break-all">{manifest.footnotes.subsequentMentionTemplate}</code>}
                                />
                                <ManifestField
                                    label={t('directory.styleGuides.edit.manifest.ibid')}
                                    value={manifest.footnotes.ibid.enabled
                                        ? `"${manifest.footnotes.ibid.label}"${manifest.footnotes.ibid.allowPageOverride ? ' (+ páginas)' : ''}`
                                        : t('directory.styleGuides.edit.manifest.ibidDisabled')}
                                />
                                <ManifestField
                                    label={t('directory.styleGuides.edit.manifest.bibliographyEntry')}
                                    value={<code className="text-[11px] break-all">{manifest.bibliography.entryTemplate}</code>}
                                />
                                <ManifestField
                                    label={t('directory.styleGuides.edit.manifest.blockQuote')}
                                    value={t('directory.styleGuides.edit.manifest.blockQuoteValue', { count: manifest.quotations.blockQuoteThresholdWords })}
                                />
                                <ManifestField
                                    label={t('directory.styleGuides.edit.manifest.quoteMarks')}
                                    value={`${manifest.quotations.primaryQuoteMark}…${manifest.quotations.primaryQuoteMark} / ${manifest.quotations.secondaryQuoteMark}…${manifest.quotations.secondaryQuoteMark}`}
                                />
                                {manifest.transliteration && (
                                    <ManifestField
                                        label={t('directory.styleGuides.edit.manifest.transliteration')}
                                        value={`${manifest.transliteration.scheme}${manifest.transliteration.useDiacritics ? ' (diacríticos)' : ''}`}
                                    />
                                )}
                                {manifest.additionalRules.length > 0 && (
                                    <div>
                                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                                            {t('directory.styleGuides.edit.manifest.additional')}
                                        </dt>
                                        <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                                            {manifest.additionalRules.map((rule, i) => (
                                                <li key={i}>{rule}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </dl>
                        )}
                    </section>
                </div>

                <footer className="flex items-center justify-between pt-4 border-t border-border">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                        className="text-xs"
                    >
                        {t('setup.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSubmit}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                    >
                        {saving ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                            <Save className="h-3 w-3 mr-1" />
                        )}
                        {t('directory.styleGuides.edit.save')}
                    </Button>
                </footer>
            </DialogContent>
        </Dialog>
    );
}

function ManifestField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</dt>
            <dd className="text-foreground">{value}</dd>
        </div>
    );
}
