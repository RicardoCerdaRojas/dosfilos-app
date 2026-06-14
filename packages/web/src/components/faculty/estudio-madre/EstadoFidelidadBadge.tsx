import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n';
import type { EstadoFidelidad } from '@dosfilos/domain';

/**
 * Badge cualitativo del estado de fidelidad de un Estudio Madre + el "qué falta"
 * (los bloqueos legibles de `validarEstudioMadre`). La demo de la tesis: el
 * estudio cristalizado por elementos llega a `verde`; el auto-resumen del LLM
 * queda `sin_auditar` — el contraste en pantalla es el argumento.
 */
const VARIANT: Record<EstadoFidelidad, 'success' | 'warning' | 'secondary'> = {
    verde: 'success',
    en_progreso: 'warning',
    sin_auditar: 'secondary',
};

export function EstadoFidelidadBadge({
    estado,
    bloqueos = [],
    autoriaPct,
}: {
    estado: EstadoFidelidad;
    bloqueos?: string[];
    autoriaPct?: number;
}) {
    const { t } = useTranslation('faculty');
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Badge variant={VARIANT[estado]}>{t(`estudioMadre.estado.${estado}`)}</Badge>
                {typeof autoriaPct === 'number' && (
                    <span className="text-xs text-muted-foreground">
                        {t('estudioMadre.authorship', { pct: autoriaPct })}
                    </span>
                )}
            </div>
            {bloqueos.length > 0 && (
                <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{t('estudioMadre.whatsMissing')}</p>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                        {bloqueos.map((b, i) => (
                            <li key={i}>{b}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
