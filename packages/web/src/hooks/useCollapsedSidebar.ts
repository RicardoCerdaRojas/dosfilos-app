import { useEffect, useRef } from 'react';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Pliega el menú lateral de la app mientras el componente esté montado, y lo
 * devuelve como estaba al salir.
 *
 * POR QUÉ: el flujo del sermón usa el ancho completo —el taller llega a tener
 * mapa, decisiones y prosa a la vez—, y el menú de navegación no aporta nada
 * mientras se redacta. Plegarlo al entrar recupera ese espacio sin pedirle nada
 * al pastor.
 *
 * SE TOMA PRESTADO, NO SE IMPONE. `setOpen` del sidebar escribe una cookie, así
 * que plegarlo a secas dejaría el menú cerrado en TODA la app después de salir
 * del wizard — un efecto global disparado por una pantalla, que el usuario no
 * pidió y no relacionaría con lo que hizo.
 *
 * Y SI ÉL LO ABRE ADENTRO, MANDA ÉL. Al desmontar sólo se restaura cuando el
 * menú sigue como lo dejamos: si lo abrió a mano, esa es una decisión suya y
 * revertirla sería pisarla.
 */
export function useCollapsedSidebar() {
    const { open, setOpen, isMobile } = useSidebar();

    // Refs para que el efecto corra UNA vez y aun así lea el valor actual al
    // desmontar. Con `open` en las dependencias, el efecto se re-ejecutaría cada
    // vez que el menú cambie y volvería a plegarlo apenas el pastor lo abra.
    const openRef = useRef(open);
    openRef.current = open;
    const setOpenRef = useRef(setOpen);
    setOpenRef.current = setOpen;

    useEffect(() => {
        // En móvil el menú es un cajón superpuesto que ya empieza cerrado: no
        // hay ancho que recuperar y tocarlo sólo generaría un parpadeo.
        if (isMobile) return;

        const previo = openRef.current;
        if (previo) setOpenRef.current(false);

        return () => {
            if (previo && openRef.current === false) setOpenRef.current(true);
        };
    }, [isMobile]);
}
