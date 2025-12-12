import { SermonItem } from '@/hooks/useSeriesData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, FileText, Wand2, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SermonDetailModalProps {
  sermon: SermonItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStartDraft?: (sermon: SermonItem) => void;
  onContinue?: (draftId: string) => void;
  onView?: (draftId: string) => void;
  onUpdateDate?: (sermonId: string, newDate: Date | null) => void;
  onDelete?: (sermonId: string) => void;
}

const getStatusBadge = (status: SermonItem['status']) => {
  switch (status) {
    case 'planned':
      return <Badge variant="outline" className="border-slate-400 text-slate-600">Planificado</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="border-amber-500 text-amber-600">En Desarrollo</Badge>;
    case 'complete':
      return <Badge variant="outline" className="border-green-500 text-green-600">Listo</Badge>;
  }
};

export function SermonDetailModal({
  sermon,
  isOpen,
  onClose,
  onStartDraft,
  onContinue,
  onView,
  onUpdateDate,
  onDelete
}: SermonDetailModalProps) {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!sermon) return null;

  const handleDateSave = () => {
    if (onUpdateDate && dateValue) {
      onUpdateDate(sermon.id, new Date(dateValue));
    } else if (onUpdateDate && !dateValue) {
      onUpdateDate(sermon.id, null);
    }
    setIsEditingDate(false);
  };

  const handleDateEdit = () => {
    setIsEditingDate(true);
    if (sermon.scheduledDate) {
      setDateValue(new Date(sermon.scheduledDate).toISOString().split('T')[0]);
    } else {
      setDateValue('');
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{sermon.title}</DialogTitle>
              <div className="flex items-center gap-2">
                {getStatusBadge(sermon.status)}
                {sermon.wizardProgress && sermon.status === 'in_progress' && (
                  <Badge variant="outline" className="text-xs">
                    Paso {sermon.wizardProgress.currentStep}/4
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {sermon.description && (
            <DialogDescription className="text-base mt-2">
              {sermon.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pasaje Bíblico */}
          {sermon.passage && (
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Pasaje Bíblico</div>
                <div className="font-semibold text-primary">{sermon.passage}</div>
              </div>
            </div>
          )}

          {/* Fecha Programada */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha Programada
            </Label>
            
            {isEditingDate ? (
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleDateSave}>
                  Guardar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditingDate(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className={cn(
                  "text-sm",
                  !sermon.scheduledDate && "text-muted-foreground italic"
                )}>
                  {sermon.scheduledDate ? (
                    new Date(sermon.scheduledDate).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  ) : (
                    'Sin fecha programada'
                  )}
                </span>
                {onUpdateDate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDateEdit}
                  >
                    Editar
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-4 border-t">
          <div className="flex gap-2">
            {sermon.status === 'planned' && onStartDraft && (
              <Button onClick={() => {
                onStartDraft(sermon);
                onClose();
              }}>
                <Wand2 className="h-4 w-4 mr-2" />
                Desarrollar Sermón
              </Button>
            )}
            
            {sermon.status === 'in_progress' && sermon.draftId && onContinue && (
              <Button onClick={() => {
                onContinue(sermon.draftId!);
                onClose();
              }}>
                <Wand2 className="h-4 w-4 mr-2" />
                Continuar Desarrollo
              </Button>
            )}
            
            {sermon.status === 'complete' && sermon.draftId && onView && (
              <Button variant="outline" onClick={() => {
                onView(sermon.draftId!);
                onClose();
              }}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Sermón
              </Button>
            )}
          </div>

          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>¿Eliminar sermón del plan?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Estás a punto de eliminar <span className="font-semibold">"{sermon?.title}"</span> de este plan de predicación.
            {sermon?.draftId && (
              <p className="mt-2 text-sm">
                ℹ️ El borrador del sermón se mantendrá en tu biblioteca personal.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (sermon && onDelete) {
                onDelete(sermon.id);
                onClose();
                setShowDeleteConfirm(false);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar del Plan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>  );
}
