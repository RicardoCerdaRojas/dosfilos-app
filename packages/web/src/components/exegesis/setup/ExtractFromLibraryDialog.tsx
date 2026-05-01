import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, AlertTriangle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { libraryService } from '@dosfilos/application';
import {
    ResourcesNotIndexedError,
    SOURCE_TYPE_GROUPS,
    type ExegeticalPaper,
    type LibraryResource,
    type SourceType,
} from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/i18n';
import { useExtractExcerpts } from '@/hooks/exegesis/useExtractExcerpts';

/**
 * Multi-select wizard for the v1.5 "extract from library" flow.
 *
 * Flow:
 *   1. User toggles checkboxes against their library resources (only
 *      `'indexed'` ones are selectable; the rest are dimmed with a
 *      tooltip explaining why).
 *   2. For each selected resource, the user picks an exegetical
 *      `sourceType` (the rubric uses these to detect coverage gaps)
 *      and may override the default display label.
 *   3. Click "Extract" — the use case retrieves top-K chunks per
 *      resource against the paper's passage + brief, attaches them
 *      to `paper.sources` as `mode: 'extracted-excerpts'`, and the
 *      dialog closes on success.
 *
 * Re-extraction semantics live at the use case level — picking a
 * resource that already has an extracted source attached REPLACES
 * its excerpts with fresh ones (matching by `sourceLibraryResourceId`).
 * The dialog warns about this in the footer when applicable so the
 * user isn't surprised.
 */
export function ExtractFromLibraryDialog({
    paper,
    open,
    onOpenChange,
}: {
    paper: ExegeticalPaper;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { t } = useTranslation('exegesis');
    const { user } = useFirebase();
    const extractExcerpts = useExtractExcerpts();

    // Suspended-error state: when the use case throws
    // ResourcesNotIndexedError, we DON'T close the dialog — instead
    // we show which resources need preparation. Cleared when the user
    // adjusts the selection or retries.
    const [notIndexedIds, setNotIndexedIds] = useState<ReadonlyArray<string>>([]);

    // Per-resource selection state. Map keyed by libraryResourceId so
    // toggling preserves any per-resource overrides the user typed.
    const [selections, setSelections] = useState<Map<string, SelectionEntry>>(new Map());
    const [searchTerm, setSearchTerm] = useState('');
    // Group filter chip — narrows the list to resources whose cached
    // `exegeticalType` falls in a specific SOURCE_TYPE_GROUPS family
    // (lexical / commentaries / background / etc.). Resources WITHOUT
    // a cached type are hidden by an active group filter — that's
    // the right behavior because the filter's purpose is "show me
    // resources I've already classified as X". `'all'` shows
    // everything regardless.
    const [groupFilter, setGroupFilter] = useState<string>('all');

    // Fetch the user's library each time the dialog opens. The hook
    // re-runs on open via the `enabled` flag so a stale list from a
    // previous open doesn't show up.
    const { data: resources = [], isLoading } = useQuery({
        queryKey: ['library', 'userResources', user?.uid, 'forExtraction'],
        queryFn: async () => {
            if (!user?.uid) return [];
            return libraryService.getUserResources(user.uid);
        },
        enabled: !!user?.uid && open,
    });

    // Reset state on close so the next open starts fresh. Avoids
    // showing the previous error or selection when the user reopens
    // for a different paper.
    useEffect(() => {
        if (!open) {
            setSelections(new Map());
            setNotIndexedIds([]);
            setSearchTerm('');
            setGroupFilter('all');
        }
    }, [open]);

    // Resources already excerpted on this paper, by sourceLibraryResourceId.
    // Used to warn the user that selecting these will REPLACE their existing
    // excerpts (consistent with the use case's idempotency model).
    const alreadyExcerptedIds = useMemo(() => {
        const set = new Set<string>();
        for (const source of paper.sources) {
            if (source.mode === 'extracted-excerpts' && source.sourceLibraryResourceId) {
                set.add(source.sourceLibraryResourceId);
            }
        }
        return set;
    }, [paper.sources]);

    // Filter + sort: indexed resources first (so they're easiest to
    // select), then by title. Search filters against title + author.
    // Group filter narrows by cached exegeticalType family.
    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const groupTypes = groupFilter === 'all'
            ? null
            : new Set<string>(SOURCE_TYPE_GROUPS.find(g => g.groupKey === groupFilter)?.types ?? []);
        const matches = resources.filter(r => {
            if (q.length > 0) {
                const titleMatch = r.title.toLowerCase().includes(q);
                const authorMatch = r.author?.toLowerCase().includes(q);
                if (!titleMatch && !authorMatch) return false;
            }
            if (groupTypes) {
                if (!r.exegeticalType || !groupTypes.has(r.exegeticalType)) return false;
            }
            return true;
        });
        return matches.sort((a, b) => {
            const aReady = libraryService.getResourceIndexStatus(a) === 'indexed' ? 0 : 1;
            const bReady = libraryService.getResourceIndexStatus(b) === 'indexed' ? 0 : 1;
            if (aReady !== bReady) return aReady - bReady;
            return a.title.localeCompare(b.title);
        });
    }, [resources, searchTerm, groupFilter]);

    // Count cached vs uncached for the "All" chip caption — gives the
    // user a sense of how much classification investment exists.
    const cachedCount = useMemo(
        () => resources.filter(r => !!r.exegeticalType).length,
        [resources],
    );

    const selectedCount = selections.size;
    const willReplaceCount = useMemo(() => {
        let n = 0;
        selections.forEach((_, id) => { if (alreadyExcerptedIds.has(id)) n++; });
        return n;
    }, [selections, alreadyExcerptedIds]);

    const toggleResource = (resource: LibraryResource) => {
        const next = new Map(selections);
        if (next.has(resource.id)) {
            next.delete(resource.id);
        } else {
            next.set(resource.id, {
                // Pre-fill priority: cached `exegeticalType` from a
                // previous extraction wins over the coarse-type
                // mapping. This is the v1.5 commit 6 payoff — the
                // user classifies BDAG once and it sticks.
                sourceType: resource.exegeticalType ?? defaultSourceTypeFor(resource),
                displayLabel: resource.title,
                citationKey: '',
            });
            // Clear the not-indexed error when the user changes the
            // selection — gives them a chance to retry without the
            // stale error blocking the footer.
            setNotIndexedIds([]);
        }
        setSelections(next);
    };

    const updateSelection = (resourceId: string, patch: Partial<SelectionEntry>) => {
        const next = new Map(selections);
        const current = next.get(resourceId);
        if (!current) return;
        next.set(resourceId, { ...current, ...patch });
        setSelections(next);
        // Auto-cache `exegeticalType` whenever the user picks one.
        // Fire-and-forget — failure doesn't block the extraction
        // (the cache miss just means next time the user re-classifies
        // manually). Only fires when the type ACTUALLY changes to
        // avoid spurious writes on every render.
        if (patch.sourceType !== undefined && patch.sourceType !== current.sourceType) {
            void libraryService.updateResource(resourceId, { exegeticalType: patch.sourceType })
                .catch(err => console.warn('[exegesis] failed to cache exegeticalType:', err));
        }
    };

    const handleExtract = async () => {
        if (selectedCount === 0) return;
        const payload = Array.from(selections.entries()).map(([libraryResourceId, entry]) => ({
            libraryResourceId,
            sourceType: entry.sourceType,
            displayLabel: entry.displayLabel.trim() || libraryResourceId,
            citationKey: entry.citationKey.trim() || undefined,
        }));
        try {
            const result = await extractExcerpts.mutateAsync({
                paperId: paper.id,
                selections: payload,
            });
            const total = Object.values(result.sourceIdsByLibraryResource).length;
            toast.success(t('paperSetup.subSteps.corpus.extract.toast.success', { count: total }));
            onOpenChange(false);
        } catch (err) {
            // Typed handling for the readiness error — show the offending
            // ids in-place instead of dismissing with a generic toast.
            if (err instanceof ResourcesNotIndexedError) {
                setNotIndexedIds(err.resourceIds);
                return;
            }
            console.error('[exegesis] extract excerpts failed:', err);
            toast.error(t('paperSetup.subSteps.corpus.extract.toast.failed'));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="inline-flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-success" />
                        {t('paperSetup.subSteps.corpus.extract.dialogTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('paperSetup.subSteps.corpus.extract.dialogSubtitle')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-3 -mx-1 px-1">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('paperSetup.subSteps.corpus.upload.librarySearchPlaceholder')}
                            className="w-full rounded-md border border-border bg-card pl-8 pr-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        />
                    </div>

                    {/* Group filter chips — only render once enough
                        resources are cached to make filtering useful.
                        Threshold is intentionally low (3) so the
                        feature appears as soon as the user has done
                        any meaningful classification. */}
                    {cachedCount >= 3 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <GroupChip
                                active={groupFilter === 'all'}
                                onClick={() => setGroupFilter('all')}
                                label={t('paperSetup.subSteps.corpus.extract.filterAll', { count: resources.length })}
                            />
                            {SOURCE_TYPE_GROUPS.map(g => (
                                <GroupChip
                                    key={g.groupKey}
                                    active={groupFilter === g.groupKey}
                                    onClick={() => setGroupFilter(g.groupKey)}
                                    label={t(`sourceTypeGroups.${g.groupKey}`)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Not-indexed surface (shows after a failed extract) */}
                    {notIndexedIds.length > 0 && (
                        <div className="rounded-lg border border-warning/40 bg-warning-subtle px-3 py-2.5 text-xs text-warning-subtle-foreground">
                            <p className="font-semibold inline-flex items-center gap-1.5 mb-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {t('paperSetup.subSteps.corpus.extract.notIndexedTitle')}
                            </p>
                            <p className="leading-snug">
                                {t('paperSetup.subSteps.corpus.extract.notIndexedBody', { count: notIndexedIds.length })}
                            </p>
                        </div>
                    )}

                    {/* Resource list */}
                    {isLoading ? (
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-2 py-4">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t('paperSetup.subSteps.corpus.upload.libraryLoading')}
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-4">
                            {resources.length === 0
                                ? t('paperSetup.subSteps.corpus.upload.libraryEmpty')
                                : t('paperSetup.subSteps.corpus.upload.librarySearchEmpty')}
                        </p>
                    ) : (
                        <ul className="space-y-1.5">
                            {filtered.map(r => {
                                const status = libraryService.getResourceIndexStatus(r);
                                const isSelectable = status === 'indexed';
                                const isSelected = selections.has(r.id);
                                const willReplace = isSelected && alreadyExcerptedIds.has(r.id);
                                return (
                                    <li key={r.id}>
                                        <ResourceRow
                                            resource={r}
                                            status={status}
                                            isSelectable={isSelectable}
                                            isSelected={isSelected}
                                            willReplace={willReplace}
                                            entry={selections.get(r.id) ?? null}
                                            onToggle={() => toggleResource(r)}
                                            onUpdate={(patch) => updateSelection(r.id, patch)}
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                        {selectedCount === 0
                            ? t('paperSetup.subSteps.corpus.extract.footerEmpty')
                            : willReplaceCount > 0
                                ? t('paperSetup.subSteps.corpus.extract.footerWithReplace', {
                                    count: selectedCount,
                                    replaces: willReplaceCount,
                                })
                                : t('paperSetup.subSteps.corpus.extract.footerCount', { count: selectedCount })
                        }
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={extractExcerpts.isPending}
                            className="text-xs"
                        >
                            {t('setup.cancel')}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleExtract}
                            disabled={selectedCount === 0 || extractExcerpts.isPending}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                        >
                            {extractExcerpts.isPending ? (
                                <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    {t('paperSetup.subSteps.corpus.extract.submitting')}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    {t('paperSetup.subSteps.corpus.extract.submit')}
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Per-resource row ────────────────────────────────────────────────────

interface SelectionEntry {
    sourceType: SourceType;
    displayLabel: string;
    citationKey: string;
}

function ResourceRow({
    resource,
    status,
    isSelectable,
    isSelected,
    willReplace,
    entry,
    onToggle,
    onUpdate,
}: {
    resource: LibraryResource;
    status: ReturnType<typeof libraryService.getResourceIndexStatus>;
    isSelectable: boolean;
    isSelected: boolean;
    willReplace: boolean;
    entry: SelectionEntry | null;
    onToggle: () => void;
    onUpdate: (patch: Partial<SelectionEntry>) => void;
}) {
    const { t } = useTranslation('exegesis');

    return (
        <div className={[
            'rounded-lg border px-3 py-2 transition-colors',
            isSelected
                ? 'border-success bg-success-subtle/30'
                : isSelectable
                    ? 'border-border bg-card hover:bg-accent'
                    : 'border-border bg-muted/30 opacity-70',
        ].join(' ')}>
            <button
                type="button"
                onClick={isSelectable ? onToggle : undefined}
                disabled={!isSelectable}
                className="w-full text-left flex items-start gap-2.5 disabled:cursor-not-allowed"
                title={isSelectable ? undefined : t(`paperSetup.subSteps.corpus.readiness.${toReadinessKey(status)}`)}
            >
                <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    disabled={!isSelectable}
                    className="mt-0.5 shrink-0 h-3.5 w-3.5 rounded border-border text-success focus:ring-success/40 disabled:opacity-50"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                        {resource.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {resource.author && (
                            <p className="text-[11px] text-muted-foreground truncate">
                                {resource.author}
                            </p>
                        )}
                        {/* Cached classification hint — only when not
                            currently selected, to avoid duplicating
                            info already visible in the picker below. */}
                        {!isSelected && resource.exegeticalType && (
                            <span className="text-[10px] text-muted-foreground italic truncate">
                                · {t(`sourceTypes.${resource.exegeticalType}.label`)}
                            </span>
                        )}
                        {!isSelectable && (
                            <span className="text-[10px] text-muted-foreground italic">
                                · {t(`paperSetup.subSteps.corpus.readiness.${toReadinessKey(status)}`)}
                            </span>
                        )}
                        {willReplace && (
                            <span className="text-[10px] text-warning-subtle-foreground inline-flex items-center gap-0.5">
                                · {t('paperSetup.subSteps.corpus.extract.willReplace')}
                            </span>
                        )}
                    </div>
                </div>
            </button>

            {/* Per-resource type + label form (only when selected) */}
            {isSelected && entry && (
                <div className="mt-2 pl-6 grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
                    <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">
                            {t('paperSetup.subSteps.corpus.upload.typeLabel')}
                        </label>
                        <select
                            value={entry.sourceType}
                            onChange={(e) => onUpdate({ sourceType: e.target.value as SourceType })}
                            className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        >
                            {SOURCE_TYPE_GROUPS.map(group => (
                                <optgroup key={group.groupKey} label={t(`sourceTypeGroups.${group.groupKey}`)}>
                                    {group.types.map(typ => (
                                        <option key={typ} value={typ}>
                                            {t(`sourceTypes.${typ}.label`)}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">
                            {t('paperSetup.subSteps.corpus.upload.citationKeyLabel')}
                        </label>
                        <input
                            type="text"
                            value={entry.citationKey}
                            onChange={(e) => onUpdate({ citationKey: e.target.value })}
                            placeholder={t('paperSetup.subSteps.corpus.upload.citationKeyPlaceholder')}
                            className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Picks a sensible default `SourceType` for the picker based on the
 * library resource's coarse `type`. The mapping is intentionally
 * conservative — we'd rather force the user to confirm than silently
 * mis-classify (the v1.5 spec accepted this manual step explicitly).
 */
function GroupChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent',
            ].join(' ')}
            aria-pressed={active}
        >
            {label}
        </button>
    );
}

function defaultSourceTypeFor(resource: LibraryResource): SourceType {
    switch (resource.type) {
        case 'commentary': return 'commentary-critical';
        case 'grammar': return 'grammar-syntax';
        case 'theology': return 'theological-monograph';
        case 'article': return 'journal-article';
        default: return 'other';
    }
}

/**
 * Maps the readiness status enum to the i18n key fragment used in
 * `paperSetup.subSteps.corpus.readiness.*`. The keys use camelCase
 * for legacy reasons (commit 2 introduced them); the enum uses
 * kebab-case. This adapter keeps both happy.
 */
function toReadinessKey(status: ReturnType<typeof libraryService.getResourceIndexStatus>): string {
    switch (status) {
        case 'indexed': return 'indexed';
        case 'extracting': return 'extracting';
        case 'indexing': return 'indexing';
        case 'needs-extraction': return 'needsExtraction';
        case 'needs-indexing': return 'needsIndexing';
        case 'failed': return 'failed';
    }
}

