/**
 * Cancellation Feedback Dialog
 * 
 * Purpose: Second step in retention strategy
 * Collects feedback when user declines trial extension
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MessageSquare } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@dosfilos/infrastructure';
import { toast } from 'sonner';

interface CancellationFeedbackDialogProps {
  open: boolean;
  onComplete: () => void;
}

export function CancellationFeedbackDialog({
  open,
  onComplete,
}: CancellationFeedbackDialogProps) {
  const { t } = useTranslation('subscription');
  const [reason, setReason] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = [
    {
      value: 'too_expensive',
      label: t('feedback.reasons.tooExpensive', {
        defaultValue: 'Demasiado costoso',
      }),
    },
    {
      value: 'not_enough_features',
      label: t('feedback.reasons.notEnoughFeatures', {
        defaultValue: 'No tiene las características que necesito',
      }),
    },
    {
      value: 'technical_issues',
      label: t('feedback.reasons.technicalIssues', {
        defaultValue: 'Problemas técnicos',
      }),
    },
    {
      value: 'not_using',
      label: t('feedback.reasons.notUsing', {
        defaultValue: 'No lo estoy usando lo suficiente',
      }),
    },
    {
      value: 'found_alternative',
      label: t('feedback.reasons.foundAlternative', {
        defaultValue: 'Encontré una alternativa mejor',
      }),
    },
    {
      value: 'other',
      label: t('feedback.reasons.other', {
        defaultValue: 'Otro motivo',
      }),
    },
  ];

  const handleSubmit = async () => {
    if (!reason) {
      toast.error(
        t('feedback.errors.selectReason', {
          defaultValue: 'Por favor selecciona un motivo',
        })
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const submitFeedback = httpsCallable(functions, 'submitCancellationFeedback');
      await submitFeedback({
        reason,
        comments,
        timestamp: new Date().toISOString(),
      });

      toast.success(
        t('feedback.success', {
          defaultValue: 'Gracias por tu feedback. ¡Esperamos verte pronto!',
        })
      );

      onComplete();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error(
        t('feedback.errors.submit', {
          defaultValue: 'Error al enviar feedback',
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isSubmitting && handleSkip()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <DialogTitle className="text-center text-2xl">
            {t('feedback.title', {
              defaultValue: 'Ayúdanos a mejorar',
            })}
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {t('feedback.subtitle', {
              defaultValue: 'Tu opinión es muy valiosa para nosotros. ¿Puedes decirnos por qué cancelas?',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Reason Selection */}
          <div className="space-y-3">
            <Label>
              {t('feedback.reasonLabel', {
                defaultValue: 'Motivo principal',
              })}
            </Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reasons.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label
                    htmlFor={r.value}
                    className="font-normal cursor-pointer"
                  >
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">
              {t('feedback.commentsLabel', {
                defaultValue: 'Comentarios adicionales (opcional)',
              })}
            </Label>
            <Textarea
              id="comments"
              placeholder={t('feedback.commentsPlaceholder', {
                defaultValue: '¿Hay algo específico que podríamos mejorar?',
              })}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
            className="w-full"
          >
            {isSubmitting
              ? t('feedback.submitting', { defaultValue: 'Enviando...' })
              : t('feedback.submit', { defaultValue: 'Enviar feedback' })
            }
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full"
          >
            {t('feedback.skip', {
              defaultValue: 'Omitir',
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
