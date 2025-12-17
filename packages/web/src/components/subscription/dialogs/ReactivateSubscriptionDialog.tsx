import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@dosfilos/infrastructure';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ReactivateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentPeriodEnd?: Date;
}

export function ReactivateSubscriptionDialog({
  open,
  onOpenChange,
  onSuccess,
  currentPeriodEnd,
}: ReactivateSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleReactivate = async () => {
    try {
      setLoading(true);
      const reactivateSubscription = httpsCallable(functions, 'reactivateSubscription');
      await reactivateSubscription();
      
      toast.success('Suscripción reactivada', {
        description: 'Tu suscripción se ha reactivado exitosamente',
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      toast.error(error.message || 'Error al reactivar suscripción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Reactivar suscripción?</DialogTitle>
          <DialogDescription>
            Tu suscripción continuará automáticamente y se renovará al final del período actual.
            {currentPeriodEnd && (
              <>
                {' '}Tu próximo cobro será el{' '}
                <strong>{currentPeriodEnd.toLocaleDateString()}</strong>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Al reactivar:
          </p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            <li>Se cancelará la solicitud de cancelación</li>
            <li>Mantendrás acceso a todas las funciones premium</li>
            <li>Los cobros continuarán normalmente</li>
            <li>Puedes cancelar nuevamente cuando quieras</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleReactivate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reactivar Suscripción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
