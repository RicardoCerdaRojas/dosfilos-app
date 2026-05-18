import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, FileText, Library, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import { toast } from 'sonner';
import { exegesisService, seriesService } from '@dosfilos/application';
import type {
    SeriesExegesisDefaults,
    SeriesExegesisSourceRef,
    UserRubric,
    UserStyleGuide,
} from '@dosfilos/domain';

interface ExegesisDefaultsCardProps {
    seriesId: string;
    ownerId: string;
    defaults: SeriesExegesisDefaults | undefined;
    onChanged: () => void;
}

/**
 * Card that surfaces the series-level exegesis defaults (rubric
 * template, style guide, initial corpus) and lets the pastor edit
 * them in a single modal. Defaults flow into every auto-created
 * paper as a snapshot at creation time (see
 * `SeriesService.autoCreatePapersForPericopes`). Editing here does
 * NOT mutate existing papers — those keep their own copy. A
 * follow-up affordance ("apply to existing pericopes") is planned
 * for Fase 2a.
 *
 * Recommendations widget (Fase 2a) will live inside the source
 * section of the edit modal, surfacing the existing PR #93 catalog
 * keyed to the series' primary book.
 */
export function ExegesisDefaultsCard({ seriesId, ownerId, defaults, onChanged }: ExegesisDefaultsCardProps) {
    const { t } = useTranslation('series');
    const [editing, setEditing] = useState(false);
    const [rubrics, setRubrics] = useState<UserRubric[] | null>(null);
    const [styleGuides, setStyleGuides] = useState<UserStyleGuide[] | null>(null);

    useEffect(() => {
        if (!editing || !ownerId) return;
        let cancelled = false;
        Promise.all([
            exegesisService.listUserRubrics.execute(ownerId),
            exegesisService.listStyleGuides.execute(ownerId),
        ])
            .then(([r, g]) => {
                if (cancelled) return;
                setRubrics(r);
                setStyleGuides(g);
            })
            .catch((err) => {
                console.error('[ExegesisDefaultsCard] load failed', err);
                toast.error(t('detail.exegesisDefaults.loadFailed') as string);
            });
        return () => {
            cancelled = true;
        };
    }, [editing, ownerId, t]);

    const rubricName = useMemo(() => {
        if (defaults?.rubricTemplateId === null) return t('detail.exegesisDefaults.systemRubric') as string;
        if (!defaults?.rubricTemplateId) return t('detail.exegesisDefaults.autoRubric') as string;
        return rubrics?.find((r) => r.id === defaults.rubricTemplateId)?.displayName
            ?? t('detail.exegesisDefaults.unknownRubric') as string;
    }, [defaults, rubrics, t]);

    const styleName = useMemo(() => {
        if (!defaults?.styleGuideId) return t('detail.exegesisDefaults.noStyle') as string;
        return styleGuides?.find((g) => g.id === defaults.styleGuideId)?.displayName
            ?? t('detail.exegesisDefaults.unknownStyle') as string;
    }, [defaults, styleGuides, t]);

    const sourceCount = defaults?.sourceRefs?.length ?? 0;

    return (
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
            <header className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                    <BookOpenCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <h3 className="text-[14px] font-semibold text-foreground">
                            {t('detail.exegesisDefaults.title')}
                        </h3>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                            {t('detail.exegesisDefaults.subtitle')}
                        </p>
                    </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="shrink-0">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    {t('detail.exegesisDefaults.edit')}
                </Button>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
                <SummaryItem
                    icon={<FileText className="h-3.5 w-3.5" />}
                    label={t('detail.exegesisDefaults.rubricLabel') as string}
                    value={rubricName}
                />
                <SummaryItem
                    icon={<BookOpenCheck className="h-3.5 w-3.5" />}
                    label={t('detail.exegesisDefaults.styleLabel') as string}
                    value={styleName}
                />
                <SummaryItem
                    icon={<Library className="h-3.5 w-3.5" />}
                    label={t('detail.exegesisDefaults.sourcesLabel') as string}
                    value={t('detail.exegesisDefaults.sourcesCount', { count: sourceCount }) as string}
                />
            </div>
            <ExegesisDefaultsModal
                open={editing}
                onOpenChange={setEditing}
                seriesId={seriesId}
                initial={defaults}
                rubrics={rubrics ?? []}
                styleGuides={styleGuides ?? []}
                isLoadingOptions={rubrics === null || styleGuides === null}
                onSaved={() => {
                    setEditing(false);
                    onChanged();
                }}
            />
        </section>
    );
}

function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-md border border-border/70 bg-muted/30 px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold text-muted-foreground">
                {icon}
                <span>{label}</span>
            </div>
            <p className="mt-0.5 text-foreground line-clamp-2">{value}</p>
        </div>
    );
}

interface ExegesisDefaultsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    seriesId: string;
    initial: SeriesExegesisDefaults | undefined;
    rubrics: ReadonlyArray<UserRubric>;
    styleGuides: ReadonlyArray<UserStyleGuide>;
    isLoadingOptions: boolean;
    onSaved: () => void;
}

function ExegesisDefaultsModal({
    open,
    onOpenChange,
    seriesId,
    initial,
    rubrics,
    styleGuides,
    isLoadingOptions,
    onSaved,
}: ExegesisDefaultsModalProps) {
    const { t } = useTranslation('series');
    const [rubricId, setRubricId] = useState<string | null | undefined>(initial?.rubricTemplateId);
    const [styleGuideId, setStyleGuideId] = useState<string | null | undefined>(initial?.styleGuideId);
    const [sourceRefs, setSourceRefs] = useState<SeriesExegesisSourceRef[]>(initial?.sourceRefs ?? []);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setRubricId(initial?.rubricTemplateId);
        setStyleGuideId(initial?.styleGuideId);
        setSourceRefs(initial?.sourceRefs ?? []);
    }, [open, initial]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const next: SeriesExegesisDefaults = {
                ...(rubricId !== undefined ? { rubricTemplateId: rubricId } : {}),
                ...(styleGuideId !== undefined ? { styleGuideId } : {}),
                sourceRefs,
            };
            await seriesService.updateExegesisDefaults(seriesId, next);
            toast.success(t('detail.exegesisDefaults.savedToast') as string);
            onSaved();
        } catch (err: any) {
            console.error('[ExegesisDefaultsModal] save failed', err);
            toast.error(err?.message ?? (t('detail.exegesisDefaults.saveFailed') as string));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpenCheck className="h-4 w-4" />
                        {t('detail.exegesisDefaults.modalTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('detail.exegesisDefaults.modalDescription')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 pt-2">
                    {/* Rubric */}
                    <div className="space-y-2">
                        <Label className="text-[13px] font-semibold">
                            {t('detail.exegesisDefaults.rubricLabel')}
                        </Label>
                        <p className="text-[12px] text-muted-foreground">
                            {t('detail.exegesisDefaults.rubricHelp')}
                        </p>
                        <select
                            value={rubricId === null ? '__none' : rubricId ?? '__auto'}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === '__none') setRubricId(null);
                                else if (v === '__auto') setRubricId(undefined);
                                else setRubricId(v);
                            }}
                            disabled={isLoadingOptions || saving}
                            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
                        >
                            <option value="__auto">{t('detail.exegesisDefaults.autoRubricOption')}</option>
                            <option value="__none">{t('detail.exegesisDefaults.systemRubricOption')}</option>
                            {rubrics.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.displayName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Style guide */}
                    <div className="space-y-2">
                        <Label className="text-[13px] font-semibold">
                            {t('detail.exegesisDefaults.styleLabel')}
                        </Label>
                        <p className="text-[12px] text-muted-foreground">
                            {t('detail.exegesisDefaults.styleHelp')}
                        </p>
                        <select
                            value={styleGuideId ?? '__none'}
                            onChange={(e) => {
                                const v = e.target.value;
                                setStyleGuideId(v === '__none' ? null : v);
                            }}
                            disabled={isLoadingOptions || saving}
                            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
                        >
                            <option value="__none">{t('detail.exegesisDefaults.noStyleOption')}</option>
                            {styleGuides.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.displayName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sources */}
                    <div className="space-y-2">
                        <Label className="text-[13px] font-semibold">
                            {t('detail.exegesisDefaults.sourcesLabel')}
                        </Label>
                        <p className="text-[12px] text-muted-foreground">
                            {t('detail.exegesisDefaults.sourcesHelp')}
                        </p>
                        {sourceRefs.length === 0 ? (
                            <p className="text-[12px] text-muted-foreground italic py-3 text-center border border-dashed border-border rounded-md">
                                {t('detail.exegesisDefaults.sourcesEmpty')}
                            </p>
                        ) : (
                            <ul className="space-y-1.5">
                                {sourceRefs.map((s, i) => (
                                    <li
                                        key={`${s.libraryResourceId}-${i}`}
                                        className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5"
                                    >
                                        <Library className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12.5px] font-medium text-foreground truncate">
                                                {s.displayLabel}
                                            </p>
                                            <p className="text-[10.5px] text-muted-foreground">
                                                {s.sourceType} · {s.mode === 'full-document' ? t('detail.exegesisDefaults.modeFull') : t('detail.exegesisDefaults.modeExcerpts')}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setSourceRefs(sourceRefs.filter((_, idx) => idx !== i))}
                                            className="h-6 w-6 p-0 shrink-0"
                                            aria-label={t('detail.exegesisDefaults.removeSource') as string}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {/* Source-add UX deferred to Fase 2a (library picker
                            + recommendations widget). The MVP card lets the
                            pastor REMOVE seeded sources but doesn't yet
                            offer the picker — Fase 2a wires it. */}
                        <Badge variant="outline" className="text-[10.5px] gap-1 inline-flex items-center">
                            <Plus className="h-3 w-3" />
                            {t('detail.exegesisDefaults.addSourceSoon')}
                        </Badge>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
                        {t('detail.exegesisDefaults.cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={saving || isLoadingOptions}>
                        {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        {t('detail.exegesisDefaults.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
