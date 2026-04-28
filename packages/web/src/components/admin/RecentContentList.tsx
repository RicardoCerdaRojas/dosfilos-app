import { useState } from 'react';
import { ContentActivity } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import {
    FileText,
    BookOpen,
    Upload,
    CalendarDays,
    Clock,
    Languages,
    MessageSquare,
    FolderKanban,
    Layers,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es as esLocale, enUS as enLocale } from 'date-fns/locale';
import { useTranslation } from '@/i18n';

interface Props {
    content: ContentActivity[];
    title?: string;
}

function getIconForType(type: ContentActivity['type']) {
    switch (type) {
        case 'sermon':           return <FileText className="h-4 w-4" />;
        case 'greek_session':    return <BookOpen className="h-4 w-4" />;
        case 'hebrew_session':   return <Languages className="h-4 w-4" />;
        case 'faculty_session':  return <MessageSquare className="h-4 w-4" />;
        case 'project':          return <FolderKanban className="h-4 w-4" />;
        case 'series':           return <Layers className="h-4 w-4" />;
        case 'library_upload':   return <Upload className="h-4 w-4" />;
        case 'preaching_plan':   return <CalendarDays className="h-4 w-4" />;
        default:                 return <FileText className="h-4 w-4" />;
    }
}

function ContentActivityItem({
    item,
    typeLabel,
    statusLabel,
    relativeTime,
}: {
    item: ContentActivity;
    typeLabel: string;
    statusLabel: { label: string; className: string } | null;
    relativeTime: string;
}) {
    return (
        <li className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                {getIconForType(item.type)}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{typeLabel}</p>
                    </div>
                    {statusLabel && (
                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusLabel.className}`}>
                            {statusLabel.label}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/80">
                    <Clock className="h-3 w-3" />
                    <span>{relativeTime}</span>
                </div>
            </div>
        </li>
    );
}

export function RecentContentList({ content, title }: Props) {
    const { t, i18n } = useTranslation('admin');
    const [showAll, setShowAll] = useState(false);
    const displayLimit = 10;
    const displayedContent = showAll ? content : content.slice(0, displayLimit);
    const hasMore = content.length > displayLimit;
    const dateLocale = i18n.language.startsWith('es') ? esLocale : enLocale;

    const resolveTypeLabel = (type: ContentActivity['type']): string =>
        t(`users.activity.recent.types.${type}`, { defaultValue: type });

    const resolveStatusLabel = (status?: string): { label: string; className: string } | null => {
        if (!status) return null;
        const styles: Record<string, string> = {
            published:   'bg-success/15 text-success',
            draft:       'bg-warning/15 text-warning',
            completed:   'bg-info/15 text-info',
            in_progress: 'bg-primary/15 text-primary',
            active:      'bg-success/15 text-success',
        };
        const className = styles[status] ?? 'bg-muted text-muted-foreground';
        const label = t(`users.activity.recent.status.${status}`, { defaultValue: status });
        return { label, className };
    };

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                    {title ?? t('users.activity.recent.defaultTitle')}
                </h3>
                {content.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                        {t('users.activity.recent.itemCount', { count: content.length })}
                    </span>
                )}
            </div>

            {content.length === 0 ? (
                <div className="text-center py-8">
                    <div className="inline-flex p-3 rounded-full bg-muted text-muted-foreground/60 mb-3">
                        <FileText className="h-6 w-6" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                        {t('users.activity.recent.empty')}
                    </p>
                </div>
            ) : (
                <>
                    <ul className="space-y-2 max-h-[500px] overflow-y-auto">
                        {displayedContent.map((item) => (
                            <ContentActivityItem
                                key={item.id}
                                item={item}
                                typeLabel={resolveTypeLabel(item.type)}
                                statusLabel={resolveStatusLabel(item.status)}
                                relativeTime={formatDistanceToNow(new Date(item.createdAt), {
                                    addSuffix: true,
                                    locale: dateLocale,
                                })}
                            />
                        ))}
                    </ul>

                    {hasMore && !showAll && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="mt-4 w-full py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                            {t('users.activity.recent.showMore', { count: content.length - displayLimit })}
                        </button>
                    )}

                    {showAll && hasMore && (
                        <button
                            onClick={() => setShowAll(false)}
                            className="mt-4 w-full py-2 text-sm text-muted-foreground hover:bg-muted/40 rounded-lg transition-colors"
                        >
                            {t('users.activity.recent.showLess')}
                        </button>
                    )}
                </>
            )}
        </Card>
    );
}
