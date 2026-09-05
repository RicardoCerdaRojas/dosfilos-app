import { AlertTriangle, CheckCircle2, FileSearch, Info, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { PdfDiagnosis } from '@dosfilos/domain';
import type { PdfPreflightState } from '../hooks/usePdfPreflight';

/**
 * Lo que el diagnóstico del PDF le dice al usuario antes de subirlo.
 *
 * **Advierte; nunca bloquea.** El botón de subir no se toca. Hay libros
 * que el diagnóstico no puede juzgar —no sabe si un manual de
 * homilética debería traer griego— y quien decide es quien conoce el
 * libro.
 *
 * **Y no usa jerga.** «Capa de texto» no significa nada para un pastor.
 * Se dice lo que le importa: si el buscador va a poder mirar dentro del
 * libro, y qué pasa si no. El detalle técnico vive en el tooltip, para
 * quien lo quiera.
 */
export function PdfPreflightNotice({ state }: { state: PdfPreflightState }) {
    const { t } = useTranslation('library');

    if (state.status === 'idle' || state.status === 'unavailable') return null;

    if (state.status === 'reading') {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                {t('preflight.reading')}
            </div>
        );
    }

    const { diagnosis, evidence } = state;
    const tono = TONO[diagnosis.verdict];
    const Icono = tono.icon;

    return (
        <div className={`rounded-lg border px-3 py-2.5 space-y-1.5 ${tono.container}`}>
            <p className="flex items-start gap-2 text-xs font-medium">
                <Icono className={`h-4 w-4 mt-px shrink-0 ${tono.icono}`} />
                <span>{t(`preflight.${diagnosis.verdict}.title`)}</span>
            </p>
            <p className="text-[11px] leading-relaxed opacity-90 pl-6">
                {t(`preflight.${diagnosis.verdict}.body`)}
            </p>
            {/* El dato medido queda a mano de quien quiera comprobarlo,
                sin ocupar la primera lectura. */}
            <p
                className="text-[10px] opacity-60 pl-6"
                title={t('preflight.measuredDetail', {
                    from: evidence.sampleFromPage,
                    to: evidence.sampleToPage,
                    chars: evidence.sampleChars,
                })}
            >
                {t('preflight.measured', { pages: evidence.pages })}
            </p>
        </div>
    );
}

const TONO: Record<PdfDiagnosis['verdict'], { container: string; icono: string; icon: typeof Info }> = {
    'apto': {
        container: 'border-success/30 bg-success-subtle/30 text-success-subtle-foreground',
        icono: 'text-success',
        icon: CheckCircle2,
    },
    'sin-capa-de-texto': {
        container: 'border-warning/40 bg-warning-subtle/40 text-warning-subtle-foreground',
        icono: 'text-warning',
        icon: AlertTriangle,
    },
    'escritura-ausente': {
        container: 'border-warning/40 bg-warning-subtle/40 text-warning-subtle-foreground',
        icono: 'text-warning',
        icon: AlertTriangle,
    },
    'escritura-sin-diacriticos': {
        container: 'border-warning/40 bg-warning-subtle/40 text-warning-subtle-foreground',
        icono: 'text-warning',
        icon: AlertTriangle,
    },
    'sin-escritura-original': {
        container: 'border-border/60 bg-muted/30 text-muted-foreground',
        icono: 'text-muted-foreground',
        icon: FileSearch,
    },
};
