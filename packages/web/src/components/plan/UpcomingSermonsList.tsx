import { PlannedSermon } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Wand2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpcomingSermonsListProps {
  sermons: PlannedSermon[];
  onStartDraft?: (sermon: PlannedSermon) => void;
  onContinue?: (draftId: string) => void;
  onEdit?: (sermon: PlannedSermon) => void;
  onView?: (draftId: string) => void;
  maxItems?: number;
}

const getStatusInfo = (sermon: PlannedSermon) => {
  if (sermon.draftId) {
    return {
      status: 'in_progress' as const,
      badge: <Badge variant="outline" className="border-amber-500 text-amber-600">En Desarrollo</Badge>,
      color: 'border-l-amber-500'
    };
  }
  return {
    status: 'planned' as const,
    badge: <Badge variant="outline" className="border-slate-400 text-slate-600">Planificado</Badge>,
    color: 'border-l-slate-400'
  };
};

const getDaysUntil = (date: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const diff = targetDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export function UpcomingSermonsList({
  sermons,
  onStartDraft,
  onContinue,
  onEdit,
  onView,
  maxItems = 5
}: UpcomingSermonsListProps) {
  // Process sermons
  const processedSermons = sermons
    .map(s => ({
      ...s,
      daysUntil: s.scheduledDate ? getDaysUntil(s.scheduledDate) : null
    }));

  // Separate dated and undated
  const datedSermons = processedSermons
    .filter(s => s.daysUntil !== null && s.daysUntil! >= 0 && s.daysUntil! <= 30)
    .sort((a, b) => a.daysUntil! - b.daysUntil!);
    
  // Undated sermons (ordered by week/sequence if available, or just index)
  const undatedSermons = processedSermons
    .filter(s => s.daysUntil === null);
    
  // Combine: Dated first (urgent), then undated
  const displayList = [...datedSermons, ...undatedSermons].slice(0, maxItems);

  if (displayList.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Próximos Sermones</h3>
        <p className="text-center text-muted-foreground py-8">
          No hay sermones pendientes próximos
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        Próximos Sermones
      </h3>
      <div className="space-y-3">
        {displayList.map((sermon) => {
          const statusInfo = getStatusInfo(sermon);
          const isUrgent = sermon.daysUntil !== null && sermon.daysUntil <= 7;

          return (
            <div
              key={sermon.id}
              className={cn(
                'border-l-4 p-4 rounded-r-lg hover:bg-slate-50 transition-colors',
                statusInfo.color,
                isUrgent && !sermon.draftId && 'bg-amber-50/30'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Date Badge */}
                <div className={cn(
                  'flex flex-col items-center justify-center rounded-lg p-2 min-w-[60px]',
                  sermon.daysUntil !== null 
                    ? (isUrgent ? 'bg-amber-100' : 'bg-slate-100')
                    : 'bg-slate-50 border border-slate-200'
                )}>
                  <span className={cn(
                    'text-xs font-medium uppercase',
                    sermon.daysUntil !== null 
                      ? (isUrgent ? 'text-amber-700' : 'text-slate-600')
                      : 'text-slate-400'
                  )}>
                    {sermon.daysUntil !== null ? (
                       sermon.daysUntil === 0 ? 'Hoy' :
                       sermon.daysUntil === 1 ? 'Mañana' :
                       `${sermon.daysUntil}d`
                    ) : '-'}
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight mt-1">
                    {sermon.scheduledDate ? new Date(sermon.scheduledDate).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short'
                    }) : 'Sin fecha'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{sermon.title}</h4>
                    {statusInfo.badge}
                    {isUrgent && !sermon.draftId && (
                      <Badge variant="outline" className="border-amber-600 text-amber-600">Urgente</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    <span className="font-medium">{sermon.passage || 'Sin pasaje'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2"
                      onClick={() => onEdit(sermon)}
                      title="Editar detalles"
                    >
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}

                  {statusInfo.status === 'planned' && onStartDraft && (
                    <Button
                      size="sm"
                      variant={isUrgent ? 'default' : 'outline'}
                      onClick={() => onStartDraft(sermon)}
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      Desarrollar
                    </Button>
                  )}
                  {statusInfo.status === 'in_progress' && sermon.draftId && onContinue && (
                    <Button
                      size="sm"
                      onClick={() => onContinue(sermon.draftId!)}
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      Continuar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
