import { type ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/i18n';
import { TIPOS_BASICOS, TIPOS_AVANZADOS } from '@/features/estudio-madre/tipos';
import type { ElementoTipo } from '@dosfilos/domain';

/**
 * Picker de tipo de elemento agrupado (Básicos / Avanzados), reutilizado por el
 * botón de promoción por mensaje y por el toolbar de selección de texto.
 */
export function PromoteTipoMenu({
    open,
    onOpenChange,
    onPick,
    align = 'end',
    children,
}: {
    open?: boolean;
    onOpenChange?: (o: boolean) => void;
    onPick: (tipo: ElementoTipo) => void;
    align?: 'start' | 'end' | 'center';
    children: ReactNode;
}) {
    const { t } = useTranslation('faculty');
    const grupos: { label: string; tipos: ElementoTipo[] }[] = [
        { label: t('estudioMadre.grupoBasicos'), tipos: TIPOS_BASICOS },
        { label: t('estudioMadre.grupoAvanzados'), tipos: TIPOS_AVANZADOS },
    ];
    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent align={align} className="w-56 p-1 max-h-80 overflow-y-auto">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{t('estudioMadre.promoteAs')}</p>
                {grupos.map((grupo, gi) => (
                    <div key={grupo.label} className={gi > 0 ? 'mt-1 border-t border-border pt-1' : ''}>
                        <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                            {grupo.label}
                        </p>
                        {grupo.tipos.map((tipo) => (
                            <button
                                key={tipo}
                                type="button"
                                onClick={() => onPick(tipo)}
                                className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                {t(`estudioMadre.tipos.${tipo}`)}
                            </button>
                        ))}
                    </div>
                ))}
            </PopoverContent>
        </Popover>
    );
}
