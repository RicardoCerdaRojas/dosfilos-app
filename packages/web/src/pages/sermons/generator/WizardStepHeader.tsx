import { cn } from '@/lib/utils';

interface Props {
    /**
     * Va ANTES del título, en la misma fila: las pestañas del paso.
     *
     * Son parte del encabezado y no una barra propia encima. Con las pestañas
     * en su línea, el título en otra y los botones en una tercera, el paso
     * gastaba tres bandas horizontales antes de mostrar una palabra del sermón.
     */
    leading?: React.ReactNode;
    /** Título del paso o del sermón. Cede espacio antes que las acciones. */
    title: string;
    /** Un dato corto sobre el estado del paso, junto al título. */
    meta?: React.ReactNode;
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
 * SIN MARGEN PROPIO. Lo separa el `gap` de la columna que lo contiene, que es
 * la misma en los tres pasos. Con `mb-4` acá y `gap-4` afuera la banda quedaba
 * al doble de distancia en unos pasos y no en otros.
 *
 * `min-w-0` + `truncate` en el título y `shrink-0` en los grupos de acciones:
 * la fila se parte en dos líneas apenas se le agrega algo, y este archivo ya
 * lo advertía antes de que el encabezado se compartiera.
 */
export function WizardStepHeader({
    leading,
    title,
    meta,
    documentActions,
    navigationActions,
    className,
}: Props) {
    return (
        <div className={cn('flex-shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
            {leading && <div className="flex shrink-0 items-center">{leading}</div>}

            <div className="min-w-0 flex-1 flex items-baseline gap-2">
                <h2 className="min-w-0 truncate text-lg font-semibold" title={title}>
                    {title}
                </h2>
                {meta && <span className="shrink-0 text-sm text-muted-foreground">{meta}</span>}
            </div>

            {documentActions && <div className="flex shrink-0 items-center gap-2">{documentActions}</div>}

            {navigationActions && (
                <div className="flex shrink-0 items-center gap-2 border-l border-border pl-3">
                    {navigationActions}
                </div>
            )}
        </div>
    );
}
