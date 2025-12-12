import { SermonItem } from '@/hooks/useSeriesData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  CalendarDays,
  Wand2,
  FileText,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PlanListViewProps {
  sermons: SermonItem[];
  onStartDraft: (sermon: SermonItem) => void;
  onContinue: (draftId: string) => void;
  onView: (draftId: string) => void;
  onRemove?: (sermon: SermonItem) => void;
  onReschedule?: (sermon: SermonItem) => void;
}

const getStatusBadge = (status: SermonItem['status']) => {
  switch (status) {
    case 'planned':
      return <Badge variant="outline" className="border-slate-400 text-slate-600 text-xs">Planificado</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">En Desarrollo</Badge>;
    case 'complete':
      return <Badge variant="outline" className="border-green-500 text-green-600 text-xs">Listo</Badge>;
  }
};

const getStatusColor = (status: SermonItem['status']) => {
  switch (status) {
    case 'planned': return 'border-l-slate-400';
    case 'in_progress': return 'border-l-amber-500';
    case 'complete': return 'border-l-green-500';
  }
};

export function PlanListView({
  sermons,
  onStartDraft,
  onContinue,
  onView,
  onRemove,
  onReschedule
}: PlanListViewProps) {
  const [sermonToDelete, setSermonToDelete] = useState<SermonItem | null>(null);

  if (sermons.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground border-dashed">
        No hay sermones planificados todavía.
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sermons.map((item, index) => (
          <Card
            key={item.id}
            className={cn(
              'p-4 flex items-center gap-4 group transition-all hover:shadow-md border-l-4',
              getStatusColor(item.status)
            )}
          >
            {/* Number */}
            <div className="text-muted-foreground font-mono text-sm w-8 text-center shrink-0">
              {index + 1}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-medium truncate">{item.title}</h3>
                {getStatusBadge(item.status)}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                {/* Passage */}
                {item.passage && (
                  <span className="flex items-center gap-1 font-medium text-primary/80">
                    <FileText className="h-3 w-3" />
                    {item.passage}
                  </span>
                )}

                {/* Date */}
                {item.scheduledDate ? (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(item.scheduledDate).toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600">
                    <CalendarDays className="h-3 w-3" />
                    Sin fecha
                  </span>
                )}

                {/* Progress */}
                {item.status === 'in_progress' && item.wizardProgress && (
                  <span className="text-amber-600">
                    • Paso {item.wizardProgress.currentStep}/4
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {item.status === 'planned' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onStartDraft(item)}
                >
                  <Wand2 className="h-4 w-4 mr-1" />
                  Desarrollar
                </Button>
              )}
              {item.status === 'in_progress' && item.draftId && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onContinue(item.draftId!)}
                >
                  <Wand2 className="h-4 w-4 mr-1" />
                  Continuar
                </Button>
              )}
              {item.status === 'complete' && item.draftId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(item.draftId!)}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Ver
                </Button>
              )}

              {onRemove && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onReschedule && (
                      <DropdownMenuItem onClick={() => onReschedule(item)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Reprogramar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setSermonToDelete(item)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!sermonToDelete} onOpenChange={() => setSermonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sermón del plan?</AlertDialogTitle>
            <AlertDialogDescription>
              "{sermonToDelete?.title}" será removido de este plan.
              {sermonToDelete?.draftId && ' El borrador se mantendrá en tus sermones.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sermonToDelete && onRemove) {
                  onRemove(sermonToDelete);
                  setSermonToDelete(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
