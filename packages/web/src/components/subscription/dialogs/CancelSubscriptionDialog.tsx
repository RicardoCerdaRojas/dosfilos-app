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

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentPeriodEnd?: Date;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  onSuccess,
  currentPeriodEnd,
}: CancelSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    try {
      setLoading(true);
      const cancelSubscription = httpsCallable(functions, 'cancelSubscription');
      await cancelSubscription();
      
      toast.success('Suscripción cancelada', {
        description: 'Mantendrás acceso hasta el final del período de facturación',
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast.error(error.message || 'Error al cancelar suscripción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cancelar suscripción?</DialogTitle>
          <DialogDescription>
            Tu suscripción se cancelará al final del período actual.
            {currentPeriodEnd && (
              <>
                {' '}Mantendrás acceso completo hasta el{' '}
                <strong>{currentPeriodEnd.toLocaleDateString()}</strong>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Después de la cancelación:
          </p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            <li>No se realizarán más cargos</li>
            <li>Perderás acceso a funciones premium</li>
            <li>Tus datos se conservarán</li>
            <li>Puedes reactivar en cualquier momento</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Mantener Suscripción
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancelar Suscripción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
