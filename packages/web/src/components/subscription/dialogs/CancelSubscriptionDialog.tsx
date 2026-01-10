/**
 * Cancel Subscription Dialog - WITH RETENTION STRATEGY
 * 
 * Flow:
 * 1. Check if user is in trial
 * 2. If trial → Show TrialExtensionDialog
 * 3. If accepted → Extend trial, close
 * 4. If declined → Show CancellationFeedbackDialog
 * 5. After feedback → Proceed with cancellation
 * 6. If not trial → Proceed directly with cancellation
 */

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
import { TrialExtensionDialog } from '../TrialExtensionDialog';
import { CancellationFeedbackDialog } from '../CancellationFeedbackDialog';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isTrialing: boolean;
  trialEndDate?: Date | null;
}

export function CancelSubscriptionDialog({
  open,
  onClose,
  onSuccess,
  isTrialing,
  trialEndDate,
}: CancelSubscriptionDialogProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showTrialExtension, setShowTrialExtension] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Open retention flow or direct cancellation
  const handleInitialCancel = () => {
    if (isTrialing && trialEndDate) {
      // Show retention offer first
      setShowTrialExtension(true);
    } else {
      // Direct cancellation for non-trial users
      proceedWithCancellation();
    }
  };

  // User accepts trial extension
  const handleAcceptExtension = async () => {
    try {
      const extendTrial = httpsCallable(functions, 'extendTrial');
      const result = await extendTrial({});
      
      const data = result.data as { success: boolean; newTrialEnd: string; message: string };
      
      toast.success(data.message);
      setShowTrialExtension(false);
      onSuccess(); // Refresh subscription data
      onClose();
    } catch (error: any) {
      console.error('Error extending trial:', error);
      toast.error('Error al extender el trial');
    }
  };

  // User declines trial extension
  const handleDeclineExtension = () => {
    setShowTrialExtension(false);
    setShowFeedback(true);
  };

  // User completes feedback
  const handleFeedbackComplete = () => {
    setShowFeedback(false);
    proceedWithCancellation();
  };

  // Actually cancel the subscription
  const proceedWithCancellation = async () => {
    setIsCancelling(true);
    try {
      const cancelSubscription = httpsCallable(functions, 'cancelSubscription');
      await cancelSubscription();
      
      toast.success('Suscripción cancelada');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error cancelling:', error);
      toast.error('Error al cancelar suscripción');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      {/* Main Cancellation Dialog */}
      <Dialog open={open && !showTrialExtension && !showFeedback} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar suscripción</DialogTitle>
            <DialogDescription>
              ¿Estás seguro que deseas cancelar tu suscripción?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {isTrialing
                ? 'Tu prueba gratuita terminará y perderás acceso a las características premium.'
                : 'Perderás acceso a las características premium al final de tu período de facturación actual.'}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              No, mantener suscripción
            </Button>
            <Button
              variant="destructive"
              onClick={handleInitialCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trial Extension Retention Dialog */}
      {trialEndDate && (
        <TrialExtensionDialog
          open={showTrialExtension}
          onAccept={handleAcceptExtension}
          onDecline={handleDeclineExtension}
          trialEndDate={trialEndDate}
        />
      )}

      {/* Cancellation Feedback Dialog */}
      <CancellationFeedbackDialog
        open={showFeedback}
        onComplete={handleFeedbackComplete}
      />
    </>
  );
}
