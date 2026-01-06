import { useState } from 'react';
import { ContentActivity } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { FileText, BookOpen, Folder, Upload, CalendarDays, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
    content: ContentActivity[];
    title?: string;
}

function getIconForType(type: ContentActivity['type']) {
    switch (type) {
        case 'sermon':
            return <FileText className="h-4 w-4" />;
        case 'greek_session':
            return <BookOpen className="h-4 w-4" />;
        case 'series':
            return <Folder className="h-4 w-4" />;
        case 'library_upload':
            return <Upload className="h-4 w-4" />;
        case 'preaching_plan':
            return <CalendarDays className="h-4 w-4" />;
        default:
            return <FileText className="h-4 w-4" />;
    }
}

function getTypeLabel(type: ContentActivity['type']): string {
    const labels = {
        sermon: 'Sermón',
        greek_session: 'Greek Tutor',
        series: 'Serie',
        library_upload: 'Biblioteca',
        preaching_plan: 'Plan',
    };
    return labels[type] || type;
}

function getStatusBadge(status?: string) {
    if (!status) return null;

    const statusConfig: Record<string, { label: string; className: string }> = {
        published: { label: 'Publicado', className: 'bg-green-100 text-green-700' },
        draft: { label: 'Borrador', className: 'bg-yellow-100 text-yellow-700' },
        completed: { label: 'Completado', className: 'bg-blue-100 text-blue-700' },
        in_progress: { label: 'En progreso', className: 'bg-purple-100 text-purple-700' },
        active: { label: 'Activo', className: 'bg-green-100 text-green-700' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-700' };

    return (
        <span className={`text-xs px-2 py-1 rounded-full ${config.className}`}>
            {config.label}
        </span>
    );
}

function ContentActivityItem({ item }: { item: ContentActivity }) {
    return (
        <li className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                {getIconForType(item.type)}
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{item.title}</p>
                        <p className="text-sm text-slate-500">
                            {getTypeLabel(item.type)}
                        </p>
                    </div>
                    {getStatusBadge(item.status)}
                </div>
                
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>
                        {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                            locale: es,
                        })}
                    </span>
                </div>
            </div>
        </li>
    );
}

export function RecentContentList({ content, title = 'Contenido Reciente' }: Props) {
    const [showAll, setShowAll] = useState(false);
    const displayLimit = 10;
    const displayedContent = showAll ? content : content.slice(0, displayLimit);
    const hasMore = content.length > displayLimit;

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                {content.length > 0 && (
                    <span className="text-sm text-slate-500">
                        {content.length} {content.length === 1 ? 'item' : 'items'}
                    </span>
                )}
            </div>
            
            {content.length === 0 ? (
                <div className="text-center py-8">
                    <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
                        <FileText className="h-6 w-6" />
                    </div>
                    <p className="text-slate-500 text-sm">No hay contenido reciente</p>
                </div>
            ) : (
                <>
                    <ul className="space-y-2 max-h-[500px] overflow-y-auto">
                        {displayedContent.map((item) => (
                            <ContentActivityItem key={item.id} item={item} />
                        ))}
                    </ul>
                    
                    {hasMore && !showAll && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="mt-4 w-full py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            Ver {content.length - displayLimit} más...
                        </button>
                    )}
                    
                    {showAll && hasMore && (
                        <button
                            onClick={() => setShowAll(false)}
                            className="mt-4 w-full py-2 text-sm text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Ver menos
                        </button>
                    )}
                </>
            )}
        </Card>
    );
}
