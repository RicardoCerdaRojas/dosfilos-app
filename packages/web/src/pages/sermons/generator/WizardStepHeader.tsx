import { cn } from '@/lib/utils';

interface Props {
    /** Título del paso o del sermón. Cede espacio antes que las acciones. */
    title: string;
    /** Acciones sobre el DOCUMENTO: pasaje, regenerar, vista previa, historial. */
    documentActions?: React.ReactNode;
    /**
     * Movimiento del asistente y acción terminal: volver, guardar, publicar.
     * Van separadas por una línea, no en otra banda.
     */
    navigationActions?: React.ReactNode;
    className?: string;
}

/**
 * Encabezado compartido de los pasos del asistente.
 *
 * UNA SOLA BANDA, Y ES UNA DECISIÓN DE ESPACIO, NO DE ESTILO. La navegación
 * vivía en una barra al pie: dos bandas horizontales cuestan unos 120px
 * verticales, y en un notebook de 14" o un iPad —donde trabajan los pastores—
 * eso sale del área de trabajo, que en el taller ya reparte tres columnas.
 *
 * Convención sacrificada a conciencia: la acción de avance abajo a la derecha
 * es donde el ojo la busca al terminar de leer. Se compensa con el SEPARADOR:
 * la navegación queda agrupada y visualmente aparte de las herramientas, para
 * que "publicar" no se lea como un botón más de la barra ni reciba el clic
 * destinado a otro.
 *
 * SIN SUBTÍTULO. "Haz clic en Refinar para expandir una sección" es una pista
 * que deja de servir después del primer uso y costaba una línea en cada
 * pantalla.
 *
 * `min-w-0` + `truncate` en el título y `shrink-0` en los grupos de acciones:
 * la fila se parte en dos líneas apenas se le agrega algo, y este archivo ya
 * lo advertía antes de que el encabezado se compartiera.
 */
export function WizardStepHeader({ title, documentActions, navigationActions, className }: Props) {
    return (
        <div className={cn('mb-4 flex-shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
            <h2 className="min-w-0 flex-1 truncate text-lg font-semibold" title={title}>
                {title}
            </h2>

            {documentActions && <div className="flex shrink-0 items-center gap-2">{documentActions}</div>}

            {navigationActions && (
                <div className="flex shrink-0 items-center gap-2 border-l border-border pl-3">
                    {navigationActions}
                </div>
            )}
        </div>
    );
}
