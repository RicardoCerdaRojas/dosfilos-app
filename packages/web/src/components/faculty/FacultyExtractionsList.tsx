import { useMemo } from 'react';
import { BookOpen, Briefcase, MessageSquareQuote, Newspaper, FileText, PenLine, Sunrise, MoreHorizontal, Trash2, ExternalLink, Pencil, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { Extraction, ExtractionType } from '@dosfilos/domain';

/** Icon + tint per artifact type — matches the tools tab for visual continuity. */
const TYPE_VISUAL: Record<ExtractionType, { icon: typeof BookOpen; color: string }> = {
    SERMON: { icon: BookOpen, color: 'text-emerald-600' },
    SERMON_OUTLINE: { icon: BookOpen, color: 'text-emerald-600' },
    BIBLE_STUDY: { icon: Briefcase, color: 'text-blue-600' },
    COUNSELING_TASK: { icon: MessageSquareQuote, color: 'text-amber-600' },
    NEWSLETTER: { icon: Newspaper, color: 'text-rose-600' },
    BLOG_POST: { icon: PenLine, color: 'text-indigo-600' },
    DEVOTIONAL: { icon: Sunrise, color: 'text-orange-600' },
    SYSTEMATIC_THEOLOGY_PAPER: { icon: FileText, color: 'text-purple-600' },
};

const TYPE_LABEL_KEY: Record<ExtractionType, string> = {
    SERMON: 'extraction.sermonOutline',
    SERMON_OUTLINE: 'extraction.sermonOutline',
    BIBLE_STUDY: 'extraction.bibleStudy',
    COUNSELING_TASK: 'extraction.counselingTask',
    NEWSLETTER: 'extraction.newsletter',
    BLOG_POST: 'extraction.blogPost',
    DEVOTIONAL: 'extraction.devotional',
    SYSTEMATIC_THEOLOGY_PAPER: 'extraction.theologyPaper',
};

/** Friendly relative time labels. Falls back to a date for older items. */
function formatRelative(date: Date, locale: string): string {
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return locale.startsWith('es') ? 'ahora' : 'just now';
    if (diffMin < 60) return locale.startsWith('es') ? `hace ${diffMin} min` : `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return locale.startsWith('es') ? `hace ${diffHr} h` : `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return locale.startsWith('es') ? `hace ${diffDays} d` : `${diffDays}d ago`;
    return date.toLocaleDateString(locale);
}

interface FacultyExtractionsListProps {
    extractions: Extraction[];
    selectedId: string | null;
    onSelect: (extraction: Extraction) => void;
    onDelete: (extraction: Extraction) => void;
    onRename: (extraction: Extraction) => void;
    onPin: (extraction: Extraction) => void;
    onJumpToOrigin?: (extraction: Extraction) => void;
    error?: unknown;
    onRetry?: () => void;
}

/**
 * Vertical list of persisted extractions for a session or project. Each
 * card shows the type icon, title, relative timestamp, and an actions
 * menu. The currently selected artifact is highlighted so the user
 * knows which one the document editor is showing.
 */
export function FacultyExtractionsList({
    extractions,
    selectedId,
    onSelect,
    onDelete,
    onRename,
    onPin,
    onJumpToOrigin,
    error,
    onRetry,
}: FacultyExtractionsListProps) {
    const { t, i18n } = useTranslation('faculty');
    const locale = i18n.language || 'es';

    const items = useMemo(() => extractions, [extractions]);

    if (error) {
        const message = (error as Error)?.message ?? String(error);
        const isIndexBuilding = /requires an index|failed-precondition/i.test(message);
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
                <p className="text-xs text-destructive">
                    {isIndexBuilding ? t('extractionsList.errorIndexBuilding') : t('extractionsList.errorLoading')}
                </p>
                <p className="text-[10px] text-muted-foreground break-all max-w-full">{message}</p>
                {onRetry && (
                    <Button size="sm" variant="outline" onClick={onRetry}>
                        {t('extractionsList.retry')}
                    </Button>
                )}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3 text-xs text-muted-foreground">
                <span>{t('extractionsList.empty')}</span>
                {onRetry && (
                    <Button size="sm" variant="ghost" onClick={onRetry}>
                        {t('extractionsList.refresh')}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto sidebar-scrollbar p-3 flex flex-col gap-1.5">
            {items.map(item => {
                const visual = TYPE_VISUAL[item.type];
                const Icon = visual.icon;
                const isSelected = item.id === selectedId;
                return (
                    <div
                        key={item.id}
                        className={cn(
                            "group rounded-lg border bg-card hover:bg-accent/40 transition-colors cursor-pointer flex items-start gap-2.5 p-2.5",
                            isSelected ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30" : "border-slate-200 dark:border-zinc-800",
                        )}
                        onClick={() => onSelect(item)}
                    >
                        <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", visual.color)} />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{item.title}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <span>{t(TYPE_LABEL_KEY[item.type])}</span>
                                <span aria-hidden>·</span>
                                <span>{formatRelative(item.updatedAt, locale)}</span>
                                {item.projectId && (
                                    <>
                                        <span aria-hidden>·</span>
                                        <Pin className="w-3 h-3" />
                                    </>
                                )}
                                {item.sourceSessionDeleted && (
                                    <>
                                        <span aria-hidden>·</span>
                                        <span className="text-amber-600">{t('extractionsList.orphan')}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    onClick={e => e.stopPropagation()}
                                    aria-label={t('extractionsList.actions.menu')}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => onRename(item)}>
                                    <Pencil className="w-3.5 h-3.5 mr-2" />
                                    {t('extractionsList.actions.rename')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onPin(item)}>
                                    <Pin className="w-3.5 h-3.5 mr-2" />
                                    {item.projectId ? t('extractionsList.actions.unpin') : t('extractionsList.actions.pin')}
                                </DropdownMenuItem>
                                {onJumpToOrigin && !item.sourceSessionDeleted && item.sessionId && (
                                    <DropdownMenuItem onClick={() => onJumpToOrigin(item)}>
                                        <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                        {t('extractionsList.actions.jumpToOrigin')}
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => onDelete(item)}
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    {t('extractionsList.actions.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            })}
        </div>
    );
}
