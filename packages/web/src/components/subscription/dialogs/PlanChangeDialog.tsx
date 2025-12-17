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
import { Badge } from '@/components/ui/badge';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@dosfilos/infrastructure';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';
import { getFeatureLabel } from '@/utils/featureLabels';

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentPlan?: any;
  newPlan?: any;
}

export function PlanChangeDialog({
  open,
  onOpenChange,
  onSuccess,
  currentPlan,
  newPlan,
}: PlanChangeDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!newPlan?.stripeProductIds?.[0]) {
      toast.error('No se pudo obtener el ID del plan');
      return;
    }

    try {
      setLoading(true);
      const changePlan = httpsCallable(functions, 'changePlan');
      await changePlan({ newPriceId: newPlan.stripeProductIds[0] });
      
      toast.success('Plan actualizado', {
        description: 'Tu plan se ha cambiado exitosamente',
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error changing plan:', error);
      toast.error(error.message || 'Error al cambiar plan');
    } finally {
      setLoading(false);
    }
  };

  const isUpgrade = (newPlan?.sortOrder || 0) > (currentPlan?.sortOrder || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cambiar Plan</DialogTitle>
          <DialogDescription>
            {isUpgrade ? 'Actualiza' : 'Cambia'} tu plan de suscripción
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Plan Comparison */}
          <div className="flex items-center justify-between gap-4">
            {/* Current Plan */}
            <div className="flex-1 p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{currentPlan?.name}</h4>
                <Badge variant="outline">Actual</Badge>
              </div>
              <p className="text-2xl font-bold">${currentPlan?.pricing?.monthly}/mes</p>
            </div>

            <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />

            {/* New Plan */}
            <div className="flex-1 p-4 border-2 border-primary rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{newPlan?.name}</h4>
                <Badge>{isUpgrade ? 'Upgrade' : 'Cambio'}</Badge>
              </div>
              <p className="text-2xl font-bold text-primary">${newPlan?.pricing?.monthly}/mes</p>
            </div>
          </div>

          {/* New Features */}
          {isUpgrade && newPlan?.features && (
            <div className="space-y-2">
              <h5 className="font-medium text-sm">Nuevas funciones incluidas:</h5>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {newPlan.features
                  .filter((f: string) => !currentPlan?.features?.includes(f))
                  .slice(0, 4)
                  .map((feature: string, idx: number) => (
                    <li key={idx}>✨ {getFeatureLabel(feature)}</li>
                  ))}
              </ul>
            </div>
          )}

          {/* Billing Note */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              📅 El cambio se aplicará de inmediato. Se realizará un ajuste prorrateado en tu próxima factura.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleChange} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
