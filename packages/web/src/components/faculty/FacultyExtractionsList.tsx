import { useMemo, useState, useRef } from 'react';
import { BookOpen, Briefcase, MessageSquareQuote, Newspaper, FileText, PenLine, Sunrise, MoreHorizontal, Trash2, ExternalLink, Pencil, Pin, Mail, Globe } from 'lucide-react';
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
import type { Extraction, ExtractionType, AIProject } from '@dosfilos/domain';
import { ExtractionProjectsPicker } from './ExtractionProjectsPicker';

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
    /** Called with the new title once the inline editor commits (Enter or blur). */
    onRename: (extraction: Extraction, newTitle: string) => void;
    onAddToProject: (extraction: Extraction, projectId: string) => void;
    onRemoveFromProject: (extraction: Extraction, projectId: string) => void;
    projects: AIProject[];
    onJumpToOrigin?: (extraction: Extraction) => void;
    /**
     * Called when the user opens an artifact whose externalRef points
     * at a record in another module (e.g. SERMON → sermons/{id}).
     * If the row has an externalRef AND this handler is provided, the
     * row click navigates externally instead of opening inline preview.
     */
    onOpenExternal?: (extraction: Extraction) => void;
    /** Open the email-share dialog for this artifact. */
    onShareByEmail?: (extraction: Extraction) => void;
    /** Open the WordPress publish dialog for this artifact. */
    onPublishToWordpress?: (extraction: Extraction) => void;
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
    onAddToProject,
    onRemoveFromProject,
    projects,
    onJumpToOrigin,
    onOpenExternal,
    onShareByEmail,
    onPublishToWordpress,
    error,
    onRetry,
}: FacultyExtractionsListProps) {
    const { t, i18n } = useTranslation('faculty');
    const locale = i18n.language || 'es';

    const items = useMemo(() => extractions, [extractions]);

    // Inline rename state — single editing row at a time. Title text
    // collapses into an input box that commits on Enter or blur, and
    // cancels on Esc. Avoids the generic browser prompt() modal and
    // keeps the user's focus inside the surface they were already in.
    const [editingId, setEditingId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Uncontrolled input pattern. We don't track the in-flight value
    // in React state — the DOM input owns it via defaultValue, and
    // we read currentTarget.value on commit. Reasons:
    //   1. Controlled inputs interact badly with `autoFocus` + initial
    //      selection: React schedules the value update across commits,
    //      and the selection set during onFocus often gets clobbered
    //      by the next React render that re-applies the value prop.
    //   2. The pattern matches how Notion/Linear/Google Drive do
    //      inline rename — focus on mount + select all text + commit
    //      on Enter/blur.

    const beginEdit = (extraction: Extraction) => {
        setEditingId(extraction.id);
    };

    const commitEditFromValue = (extraction: Extraction, raw: string) => {
        const next = raw.trim();
        if (next && next !== extraction.title) {
            onRename(extraction, next);
        }
        setEditingId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

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
                        data-extraction-row
                        className={cn(
                            "group rounded-lg border bg-card hover:bg-accent/40 transition-colors flex items-start gap-2.5 p-2.5",
                            editingId === item.id ? "cursor-default" : "cursor-pointer",
                            isSelected ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30" : "border-slate-200 dark:border-zinc-800",
                        )}
                        onClick={() => {
                            if (editingId === item.id) return;
                            // Sermons (and other future external-ref artifacts)
                            // navigate to their canonical module; inline preview
                            // wouldn't show the full sermon experience (RichSermon
                            // editor, publish flow). Fall back to inline select
                            // when no external ref or no handler.
                            if (item.externalRef && onOpenExternal) {
                                onOpenExternal(item);
                                return;
                            }
                            onSelect(item);
                        }}
                    >
                        <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", visual.color)} />
                        <div className="flex-1 min-w-0">
                            {editingId === item.id ? (
                                <input
                                    ref={el => {
                                        inputRef.current = el;
                                        // Mount-time focus + select via
                                        // setTimeout. autoFocus fires
                                        // synchronously during commit
                                        // when React/Radix focus events
                                        // are still in flight, so select()
                                        // gets clobbered. Deferring to
                                        // the next macrotask waits past
                                        // every concurrent focus dance,
                                        // and then select() on the
                                        // already-focused input sticks.
                                        if (el && !el.dataset.focused) {
                                            el.dataset.focused = 'true';
                                            setTimeout(() => {
                                                if (inputRef.current === el) {
                                                    el.focus();
                                                    el.select();
                                                }
                                            }, 0);
                                        }
                                    }}
                                    type="text"
                                    defaultValue={item.title}
                                    // Backup: if the user clicks back into
                                    // the input later, re-select all.
                                    onFocus={e => e.currentTarget.select()}
                                    onBlur={e => {
                                        // Some sibling interactions in the same row
                                        // (pin button hover, kebab menu) can briefly
                                        // pull focus and fire blur even on a small
                                        // mouse move. If focus is heading to anything
                                        // inside the same row container, the user did
                                        // NOT intend to commit — keep the input open.
                                        const el = e.currentTarget;
                                        const next = e.relatedTarget as HTMLElement | null;
                                        const row = el.closest('[data-extraction-row]');
                                        if (next && row && row.contains(next)) {
                                            // Restore focus + selection on next tick
                                            // so the sibling's action runs first.
                                            setTimeout(() => {
                                                el.focus();
                                                el.select();
                                            }, 0);
                                            return;
                                        }
                                        commitEditFromValue(item, el.value);
                                    }}
                                    onClick={e => e.stopPropagation()}
                                    onKeyDown={e => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            commitEditFromValue(item, e.currentTarget.value);
                                        } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            cancelEdit();
                                        }
                                    }}
                                    className="w-full text-sm font-medium bg-background border border-indigo-500 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900"
                                />
                            ) : (
                                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{item.title}</div>
                            )}
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <span>{t(TYPE_LABEL_KEY[item.type])}</span>
                                <span aria-hidden>·</span>
                                <span>{formatRelative(item.updatedAt, locale)}</span>
                                {item.projectIds.length > 0 && (
                                    <>
                                        <span aria-hidden>·</span>
                                        <span className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400">
                                            <Pin className="w-3 h-3 fill-current" />
                                            {item.projectIds.length}
                                        </span>
                                    </>
                                )}
                                {item.sourceSessionDeleted && (
                                    <>
                                        <span aria-hidden>·</span>
                                        <span className="text-amber-600">{t('extractionsList.orphan')}</span>
                                    </>
                                )}
                                {item.externalRef && (
                                    <>
                                        <span aria-hidden>·</span>
                                        <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                            <ExternalLink className="w-3 h-3" />
                                            {t(`extractionsList.externalRef.${item.externalRef.collection}`)}
                                        </span>
                                    </>
                                )}
                                {item.publishedRefs && item.publishedRefs.length > 0 && (
                                    <>
                                        <span aria-hidden>·</span>
                                        <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400" title={t('extractionsList.publishedTo.wordpress')}>
                                            <Globe className="w-3 h-3" />
                                            WP
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div
                            className="flex items-center gap-0.5 shrink-0"
                            onClick={e => e.stopPropagation()}
                        >
                            <ExtractionProjectsPicker
                                extraction={item}
                                projects={projects}
                                onAddToProject={projectId => onAddToProject(item, projectId)}
                                onRemoveFromProject={projectId => onRemoveFromProject(item, projectId)}
                                trigger={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-7 h-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        aria-label={t('extractionsList.actions.pin')}
                                    >
                                        <Pin className={cn(
                                            "w-3.5 h-3.5",
                                            item.projectIds.length > 0 && "fill-current text-indigo-500"
                                        )} />
                                    </Button>
                                }
                            />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-7 h-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        onClick={e => e.stopPropagation()}
                                        aria-label={t('extractionsList.actions.menu')}
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    onClick={e => e.stopPropagation()}
                                    // Canonical Radix fix: prevent the menu
                                    // from restoring focus to its trigger
                                    // after close. Without this, picking
                                    // "Renombrar" lands focus in the rename
                                    // input for one frame, then Radix yanks
                                    // it back to the kebab button → input
                                    // fires onBlur → commitEdit unmounts the
                                    // input before the user can type. Other
                                    // actions (Delete, Pin, JumpToOrigin)
                                    // don't need focus to return to the
                                    // kebab; the body gets focus instead.
                                    onCloseAutoFocus={e => e.preventDefault()}
                                >
                                    <DropdownMenuItem onClick={() => beginEdit(item)}>
                                        <Pencil className="w-3.5 h-3.5 mr-2" />
                                        {t('extractionsList.actions.rename')}
                                    </DropdownMenuItem>
                                    {onShareByEmail && (
                                        <DropdownMenuItem onClick={() => onShareByEmail(item)}>
                                            <Mail className="w-3.5 h-3.5 mr-2" />
                                            {t('extractionsList.actions.email')}
                                        </DropdownMenuItem>
                                    )}
                                    {onPublishToWordpress && (item.type === 'BLOG_POST' || item.type === 'SYSTEMATIC_THEOLOGY_PAPER') && (
                                        <DropdownMenuItem onClick={() => onPublishToWordpress(item)}>
                                            <Globe className="w-3.5 h-3.5 mr-2" />
                                            {t('extractionsList.actions.publishWordpress')}
                                        </DropdownMenuItem>
                                    )}
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
                    </div>
                );
            })}
        </div>
    );
}
