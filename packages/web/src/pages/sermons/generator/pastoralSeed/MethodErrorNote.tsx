import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    /** Descripción del hallazgo, ya redactada por el catálogo de dominio. */
    description: string;
}

/**
 * Observación de método en el wizard — la MISMA vara que usa el acompañante
 * socrático del chat (`detectMethodErrorForStep`, catálogo de dominio).
 *
 * APARECE SOLA y NO BLOQUEA (decisión del fundador, 2026-08-21). Las dos mitades
 * importan:
 *
 * - Aparece sola porque antes el wizard solo confrontaba si el pastor abría el
 *   acompañante: la misma ayuda existía en las dos superficies, pero en una
 *   había que pedirla. Eso hacía que el estándar del producto dependiera de por
 *   dónde entró el pastor.
 * - No bloquea porque esto es coincidencia de palabras, no juicio. Un falso
 *   positivo en un chat cuesta un turno; acá, sin recuperación conversacional,
 *   costaría un muro levantado por una lista de keywords.
 *
 * Se puede descartar. Lo que traba el avance sigue siendo el validador
 * determinista del paso, no esto.
 */
export function MethodErrorNote({ description }: Props) {
    const { t } = useTranslation('studyDepth');
    const [dismissed, setDismissed] = useState(false);
    if (dismissed) return null;

    return (
        <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
            <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{t('methodNote.title')}</p>
                <p className="mt-1 text-muted-foreground">{description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('methodNote.optional')}</p>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                aria-label={t('methodNote.dismiss')}
                onClick={() => setDismissed(true)}
            >
                <X className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
