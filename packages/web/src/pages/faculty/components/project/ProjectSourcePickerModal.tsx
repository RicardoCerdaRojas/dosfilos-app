import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { BookOpen, Check, Loader2, Search } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { useLibrary } from '@/hooks/library';

interface PickerResource {
    id: string;
    title: string;
    author: string;
    indexingStatus?: string;
}

interface ProjectSourcePickerModalProps {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    /** Currently attached source IDs — pre-checks them in the picker. */
    currentSourceIds: string[];
    /** Triggered with the new selection when the user clicks Save. */
    onSave: (ids: string[]) => void;
    /** True while the parent's save mutation is in flight. */
    saving: boolean;
}

export function ProjectSourcePickerModal({
    open,
    onOpenChange,
    currentSourceIds,
    onSave,
    saving,
}: ProjectSourcePickerModalProps) {
    const { t } = useTranslation('projects');
    const { resources, isLoading: loading } = useLibrary();
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set(currentSourceIds));

    // Re-sync selection when the parent's currentSourceIds change (e.g. another
    // session updates the project while this modal is closed).
    useEffect(() => {
        setSelected(new Set(currentSourceIds));
    }, [currentSourceIds]);

    const docs: PickerResource[] = useMemo(
        () => resources.map(r => ({
            id: r.id,
            title: r.title,
            author: r.author,
            indexingStatus: r.indexingStatus,
        })),
        [resources],
    );

    const filtered = useMemo(() => {
        if (!search.trim()) return docs;
        const s = search.toLowerCase();
        return docs.filter(d =>
            d.title.toLowerCase().includes(s) || d.author.toLowerCase().includes(s)
        );
    }, [docs, search]);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('sourcePicker.title')}</DialogTitle>
                    <DialogDescription>{t('sourcePicker.description')}</DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder={t('sourcePicker.searchPlaceholder')}
                        className="pl-9"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto border rounded-md min-h-0">
                    {loading ? (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                            {t('sourcePicker.loading')}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                            {docs.length === 0
                                ? t('sourcePicker.emptyLibrary')
                                : t('sourcePicker.noResults')}
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {filtered.map(d => {
                                const isSelected = selected.has(d.id);
                                const isIndexed = d.indexingStatus === 'ready';
                                return (
                                    <li
                                        key={d.id}
                                        onClick={() => toggle(d.id)}
                                        className={cn(
                                            'flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors',
                                            isSelected && 'bg-primary/5'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'h-4 w-4 rounded-sm border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors',
                                                isSelected
                                                    ? 'bg-primary border-primary'
                                                    : 'border-border'
                                            )}
                                        >
                                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium truncate">{d.title}</div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {d.author}
                                                {!isIndexed && (
                                                    <span className="ml-2 text-warning-subtle-foreground">
                                                        {t('sourcePicker.byProcess')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-1" />
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="text-xs text-muted-foreground">
                    {selected.size === 0
                        ? t('sourcePicker.summaryNoneSelected')
                        : t('sourcePicker.summarySelected', { count: selected.size })}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        {t('sourcePicker.cancel')}
                    </Button>
                    <Button onClick={() => onSave(Array.from(selected))} disabled={saving}>
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                        {saving ? t('sourcePicker.saving') : t('sourcePicker.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
