import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
    children: ReactNode;
    className?: string;
}

/**
 * EL MARCO ÚNICO de un área de trabajo con paneles, al patrón VS Code.
 *
 * VS Code no pone tarjetas sueltas con espacio entre ellas: pone UN marco, y
 * adentro los paneles van PEGADOS, separados sólo por la línea divisoria —
 * que por construcción queda exactamente entre ambos, siempre centrada,
 * porque ES el borde compartido y no un adorno flotando en un gap.
 *
 * Nuestra área de trabajo era lo contrario — cada panel con su propia Card,
 * `gap-4` entre columnas y el divisor perdido en el vacío. El fundador lo
 * comparó con VS Code: "no bien definidos y poco intuitivos". Este contenedor
 * invierte eso: el marco lo pone el grupo, los paneles van sin marco propio,
 * y entre ellos vive `PanelDivider`.
 */
export function PanelGroup({ children, className }: Props) {
    return (
        <div
            className={cn(
                'flex h-full min-h-0 min-w-0 flex-1 rounded-lg border border-border bg-card overflow-hidden',
                className,
            )}
        >
            {children}
        </div>
    );
}
