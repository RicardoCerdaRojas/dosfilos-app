import { useTranslation } from '@/i18n';
import { Loader2, AlertOctagon } from 'lucide-react';

type Variant = 'extracting' | 'failed';

interface LibraryStatusCalloutProps {
    /**
     * `'extracting'` — recursos que el cloud function todavía está
     * procesando (extracción de texto en curso). Informativo, no
     * accionable: el usuario sólo espera.
     *
     * `'failed'` — recursos cuya extracción falló. Requiere acción
     * (re-subir o borrar) pero la acción vive per-card en el menú,
     * no acá. El callout solo da visibilidad agregada.
     */
    variant: Variant;
    /** Number of resources in this state. Hides the callout when 0. */
    count: number;
}

/**
 * Secondary informational callouts complementing the primary
 * `LibraryAttentionCallout`. Each shows a specific extraction-pipeline
 * state so the user can disambiguate at a glance whether they need to
 * act, wait, or recover.
 *
 * The primary callout (amber) is for "click to process" — this
 * component covers the other two states ("still extracting" /
 * "extraction failed"). Together with the per-card status badges they
 * remove the previous ambiguity where every non-indexed resource —
 * regardless of cause — funneled into the single amber callout and the
 * "Procesar pendientes" button (which would have failed anyway for
 * resources still extracting or in error).
 */
export function LibraryStatusCallout({ variant, count }: LibraryStatusCalloutProps) {
    const { t } = useTranslation('library');

    if (count <= 0) return null;

    const isExtracting = variant === 'extracting';
    const tone = isExtracting
        ? 'bg-info-subtle border border-info/30'
        : 'bg-destructive/10 border border-destructive/30';
    const iconBox = isExtracting
        ? 'bg-info text-info-foreground'
        : 'bg-destructive text-white';
    const labelTone = isExtracting
        ? 'text-info-subtle-foreground'
        : 'text-destructive';
    const Icon = isExtracting ? Loader2 : AlertOctagon;
    const iconClass = isExtracting ? 'h-5 w-5 animate-spin' : 'h-5 w-5';

    return (
        <div className={`${tone} rounded-xl p-4 flex items-center gap-4`}>
            <div className={`h-10 w-10 rounded-lg ${iconBox} flex items-center justify-center shrink-0`}>
                <Icon className={iconClass} />
            </div>
            <div className="flex-1 min-w-0">
                <div className={`text-[10px] uppercase tracking-[0.18em] ${labelTone} font-medium mb-0.5`}>
                    {t(`statusCallout.${variant}.label`)}
                </div>
                <h2 className="font-reading text-[17px] leading-tight text-foreground mb-0.5">
                    {t(`statusCallout.${variant}.title`, { count })}
                </h2>
                <p className="text-[13px] leading-snug text-muted-foreground">
                    {t(`statusCallout.${variant}.description`)}
                </p>
            </div>
        </div>
    );
}
