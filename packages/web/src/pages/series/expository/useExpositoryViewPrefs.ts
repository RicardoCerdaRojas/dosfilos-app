import { useEffect, useState } from 'react';
import { hasMethodologyBeenShown } from '@/components/expository/MethodologyPresentation';

/**
 * CÓMO SE VE EL ASISTENTE, aparte de lo que el asistente HACE.
 *
 * El tamaño de letra, qué pases están plegados y si la metodología está abierta
 * no dicen nada sobre el libro que se está dividiendo: son preferencias de
 * lectura. Vivían mezcladas entre los veinticinco estados del orquestador, así
 * que cambiar cómo se pliega una tarjeta obligaba a leer el pipeline entero.
 */
export function useExpositoryViewPrefs() {
    /**
     * Tamaño del cuerpo: 1 normal, 2 grande, 3 más grande.
     *
     * SE RECUERDA ENTRE VISITAS a propósito. Un pastor que necesita letra grande
     * la necesita SIEMPRE, y volver a elegirla en cada visita es recordarle en
     * cada visita por qué la eligió.
     */
    const [textZoom, setTextZoom] = useState<1 | 2 | 3>(() => {
        if (typeof window === 'undefined') return 1;
        const stored = window.localStorage.getItem('expositoryTextZoom');
        const parsed = stored ? Number(stored) : 1;
        return parsed === 2 || parsed === 3 ? (parsed as 2 | 3) : 1;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('expositoryTextZoom', String(textZoom));
    }, [textZoom]);

    const zoomClassName =
        textZoom === 3 ? 'expository-zoom-larger' : textZoom === 2 ? 'expository-zoom-large' : '';

    /** Pases mostrados como chip en la tira en vez de como tarjeta completa. */
    const [collapsedPasses, setCollapsedPasses] = useState<Set<number>>(new Set());

    /**
     * Plegar y desplegar VIAJA EN UNA TRANSICIÓN cuando el navegador la soporta.
     *
     * El navegador captura el antes y el después y transforma uno en otro: por
     * eso la tarjeta y su chip se leen como el MISMO objeto que cambia de forma,
     * y no como uno que desaparece y otro que aparece en su lugar. Sin soporte
     * —Firefox— el cambio es instantáneo y todo sigue funcionando.
     */
    const togglePass = (index: number) => {
        const apply = () => {
            setCollapsedPasses((prev) => {
                const next = new Set(prev);
                if (next.has(index)) next.delete(index);
                else next.add(index);
                return next;
            });
        };
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
            (document as { startViewTransition: (cb: () => void) => void }).startViewTransition(apply);
        } else {
            apply();
        }
    };

    /**
     * La metodología se abre sola LA PRIMERA VEZ y nunca más.
     *
     * Explica qué hacen los cinco pases y por qué. Quien ya lo vio la abre desde
     * el botón: repetirla en cada visita la convertiría en algo que se cierra
     * sin leer.
     */
    const [methodologyOpen, setMethodologyOpen] = useState(false);
    useEffect(() => {
        if (!hasMethodologyBeenShown()) setMethodologyOpen(true);
    }, []);

    return {
        textZoom,
        setTextZoom,
        zoomClassName,
        collapsedPasses,
        /** Reemplazo directo — lo usa la restauración del borrador guardado. */
        setCollapsedPasses,
        togglePass,
        methodologyOpen,
        setMethodologyOpen,
    };
}
