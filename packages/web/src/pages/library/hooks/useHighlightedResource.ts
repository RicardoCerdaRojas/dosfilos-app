import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Id del nodo que envuelve cada tarjeta, para poder ir a una en concreto. */
export function resourceAnchorId(resourceId: string): string {
    return `resource-${resourceId}`;
}

interface Options {
    /** Ids ya cargados. Mientras esté vacío por carga, no se concluye nada. */
    resourceIds: string[];
    loading: boolean;
}

/**
 * Lleva al pastor HASTA EL LIBRO cuando llega desde una cita.
 *
 * Una cita en el sermón nombra el libro y la página, pero llegar a él era cosa
 * suya: abrir la biblioteca y buscarlo a mano entre decenas. Ahora el popover
 * enlaza a `?resource=<id>` y esto se encarga de encontrarlo, traerlo a la
 * vista y marcarlo un momento para que el ojo lo ubique.
 *
 * SI NO ESTÁ, SE DICE. El recurso pudo borrarse después de predicar el sermón.
 * Sin aviso, el pastor llegaría a su biblioteca sin entender por qué el enlace
 * no hizo nada y buscaría un rato el libro que ya no existe. `notFound` deja
 * decirlo.
 *
 * SE ESPERA A QUE LA LISTA CARGUE antes de concluir que falta: con la lista
 * vacía porque todavía no llegó, cualquier id parecería inexistente y el aviso
 * saldría siempre — una señal que se dispara siempre deja de señalar.
 */
export function useHighlightedResource({ resourceIds, loading }: Options) {
    const [searchParams] = useSearchParams();
    const objetivo = searchParams.get('resource');
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [notFound, setNotFound] = useState<string | null>(null);
    /** Sólo una vez por visita: volver a resaltar al re-renderizar sería ruido. */
    const yaResuelto = useRef<string | null>(null);

    useEffect(() => {
        if (!objetivo || loading) return;
        if (yaResuelto.current === objetivo) return;
        yaResuelto.current = objetivo;

        if (!resourceIds.includes(objetivo)) {
            setNotFound(objetivo);
            return;
        }

        setHighlightedId(objetivo);
        // Tras el pintado: el nodo no existe hasta que la grilla se dibuja.
        requestAnimationFrame(() => {
            document
                .getElementById(resourceAnchorId(objetivo))
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        const t = setTimeout(() => setHighlightedId(null), 2600);
        return () => clearTimeout(t);
    }, [objetivo, loading, resourceIds]);

    return { highlightedId, notFound, dismissNotFound: () => setNotFound(null) };
}
