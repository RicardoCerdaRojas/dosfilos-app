import { useTranslation } from '@/i18n';
import { Loader2, AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Variant = 'extracting' | 'failed' | 'indexFailed';

interface LibraryStatusCalloutProps {
    /**
     * `'extracting'` — recursos que el cloud function todavía está
     * procesando (extracción de texto en curso). Informativo, no
     * accionable: el usuario sólo espera.
     *
     * `'failed'` — recursos cuya extracción falló. Requiere acción
     * (re-subir o borrar) pero la acción vive per-card en el menú,
     * no acá. El callout solo da visibilidad agregada.
     *
     * `'indexFailed'` — el texto se extrajo bien pero la indexación
     * reventó. Es el único de los tres que se recupera desde acá: el
     * `structured.md` ya está en Storage, así que reintentar no gasta
     * páginas del saldo. Antes este estado no tenía superficie propia
     * y quedaba invisible salvo por un tooltip en una tarjeta.
     */
    variant: Variant;
    /** Number of resources in this state. Hides the callout when 0. */
    count: number;
    /** Retry action. Only rendered for `'indexFailed'`. */
    onRetry?: () => void;
    /** Disables the retry button while a bulk job is running. */
    isRetrying?: boolean;
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
export function LibraryStatusCallout({
    variant,
    count,
    onRetry,
    isRetrying = false,
}: LibraryStatusCalloutProps) {
    const { t } = useTranslation('library');

    if (count <= 0) return null;

    const isExtracting = variant === 'extracting';
    const tone = isExtracting
        ? 'bg-info-subtle border border-info/30'
        : 'bg-destructive/10 border border-destructive/30';
    const iconBox = isExtracting
        ? 'bg-info text-info-foreground'
        : 'bg-destructive text-destructive-foreground';
    const labelTone = isExtracting
        ? 'text-info-subtle-foreground'
        : 'text-destructive';
    const Icon = isExtracting ? Loader2 : AlertOctagon;
    const iconClass = isExtracting ? 'h-5 w-5 animate-spin' : 'h-5 w-5';
    const showRetry = variant === 'indexFailed' && !!onRetry;

    return (
        <div className={`${tone} rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4`}>
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
            {showRetry && (
                <Button
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2 shrink-0"
                >
                    <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                    {t('statusCallout.indexFailed.actionButton')}
                </Button>
            )}
        </div>
    );
}
