import { useWindowDimensions } from 'react-native';

/**
 * Umbral de tablet, en puntos del lado corto.
 *
 * Es una app de tablet, pero corre en teléfono y el iPad se rota. 768 es el
 * lado corto de un iPad de 11″ en vertical: por debajo, teléfono.
 */
const TABLET_MIN = 700;

/** A partir de acá caben dos paneles sin que ninguno quede angosto. */
const SPLIT_MIN = 1000;

/**
 * Medida de lectura de estudio, en puntos.
 *
 * El texto largo del detalle se lee sentado y en silencio: admite más ancho
 * que el atril, pero no el de la tablet entera. Un renglón de 1000 px hace
 * perder la línea al volver — el mismo problema que el púlpito ya resuelve
 * midiendo en caracteres.
 */
export const STUDY_COLUMN = 680;

export interface LayoutInfo {
    isTablet: boolean;
    /** Hay lugar para lista + detalle a la vez. */
    isSplit: boolean;
    /** Margen lateral: más aire en pantalla grande. */
    gutter: number;
    /** Ancho máximo de una columna de contenido. */
    contentWidth: number;
}

export function useLayout(): LayoutInfo {
    const { width, height } = useWindowDimensions();
    const shortSide = Math.min(width, height);
    const isTablet = shortSide >= TABLET_MIN;
    return {
        isTablet,
        isSplit: width >= SPLIT_MIN,
        gutter: isTablet ? 32 : 20,
        contentWidth: STUDY_COLUMN,
    };
}
