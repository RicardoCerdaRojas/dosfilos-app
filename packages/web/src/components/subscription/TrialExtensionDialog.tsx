/**
 * Trial Extension Dialog
 * 
 * Purpose: First step in retention strategy
 * Offers 7 additional trial days when user attempts to cancel during trial
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
import { Gift, Calendar, Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface TrialExtensionDialogProps {
  open: boolean;
  onAccept: () => Promise<void>;
  onDecline: () => void;
  trialEndDate: Date;
}

export function TrialExtensionDialog({
  open,
  onAccept,
  onDecline,
  trialEndDate,
}: TrialExtensionDialogProps) {
  const { t } = useTranslation('subscription');
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
    } finally {
      setIsAccepting(false);
    }
  };

  // Calculate new trial end date (7 days from original)
  const newTrialEndDate = new Date(trialEndDate);
  newTrialEndDate.setDate(newTrialEndDate.getDate() + 7);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'long',
    }).format(date);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isAccepting && onDecline()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            {t('trialExtension.title', {
              defaultValue: '¡Espera! Te regalamos 7 días más',
            })}
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {t('trialExtension.subtitle', {
              defaultValue: 'Sabemos que a veces necesitas más tiempo para descubrir todo el potencial de DosFilos.Preach',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">
                  {t('trialExtension.benefit1.title', {
                    defaultValue: '7 días adicionales gratis',
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('trialExtension.benefit1.description', {
                    defaultValue: 'Sin costo, sin compromiso. Solo más tiempo para explorar.',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">
                  {t('trialExtension.benefit2.title', {
                    defaultValue: 'Acceso completo hasta',
                  })}{' '}
                  <span className="text-primary">{formatDate(newTrialEndDate)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('trialExtension.benefit2.description', {
                    defaultValue: 'Todas las características premium sin restricciones.',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Reminder */}
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-center">
              {t('trialExtension.reminder', {
                defaultValue: 'Puedes cancelar en cualquier momento. No te cobraremos nada durante la extensión.',
              })}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full"
            size="lg"
          >
            {isAccepting 
              ? t('trialExtension.accepting', { defaultValue: 'Activando extensión...' })
              : t('trialExtension.accept', { defaultValue: '¡Sí, dame 7 días más!' })
            }
          </Button>
          <Button
            variant="ghost"
            onClick={onDecline}
            disabled={isAccepting}
            className="w-full"
          >
            {t('trialExtension.decline', {
              defaultValue: 'No gracias, quiero cancelar',
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
