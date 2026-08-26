import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props extends React.ComponentProps<typeof Button> {
    /** Lo que el botón hace, en palabras. Va al tooltip Y al aria-label. */
    label: string;
    children: React.ReactNode;
}

/**
 * Botón de ícono para la banda del paso: el ícono a la vista, el nombre en
 * el tooltip y en `aria-label`.
 *
 * ES EL SISTEMA DE LA BOTONERA, no un botón más. La banda llegó a seis
 * botones con frases completas ("Volver a armar el borrador", "Volver a
 * Homilética"…) y en un notebook de 14" el título del sermón desaparecía
 * empujado por sus propios controles. La convención que este componente fija:
 *
 * - UNA acción primaria por contexto conserva texto — la del siguiente paso
 *   natural (armar en el taller, publicar en el borrador).
 * - Las demás van como ícono visible con tooltip. ABREVIAR no es OCULTAR:
 *   la lección del menú "⋮" ("casi imperceptible") fue contra esconder
 *   acciones tras un clic extra, no contra los íconos a la vista.
 * - Lo que no tiene ícono universal conserva su texto, corto.
 */
export const ToolbarIconButton = forwardRef<HTMLButtonElement, Props>(
    ({ label, children, ...props }, ref) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button ref={ref} variant="outline" size="sm" aria-label={label} {...props}>
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    ),
);
ToolbarIconButton.displayName = 'ToolbarIconButton';
