import React, { useState } from 'react';
import { Text, useWindowDimensions } from 'react-native';

import {
    DELIVERY_MEASURE_CH,
    MEASURE_REFERENCE_SIZE,
    MEASURE_SAMPLE,
    measureToWidth,
} from '@/core/theme/typography';

/**
 * Ancho de la caja de texto de entrega, en caracteres reales de la fuente.
 *
 * El ancho medio de carácter SE MIDE en pantalla en vez de estimarse: una
 * constante inventada reintroduce por la puerta de atrás el mismo error que
 * fijar la medida en píxeles (D1).
 *
 * Devuelve además la sonda que hay que montar. Vive acá, y no dentro del
 * cuerpo del sermón, porque la caja tiene que abarcar TODO lo que se lee —
 * título, título de movimiento, cuerpo y atribuciones. Cuando solo la medía
 * el cuerpo, los títulos quedaban pegados al borde y el bloque de lectura se
 * veía desalineado.
 */
export function useDeliveryMeasure(fontSize: number): {
    measure: number | undefined;
    probe: React.ReactNode;
} {
    const { width: screenWidth } = useWindowDimensions();
    const [charRatio, setCharRatio] = useState<number | null>(null);

    const measure = charRatio
        ? Math.min(measureToWidth(charRatio, fontSize, DELIVERY_MEASURE_CH), screenWidth - 48)
        : undefined;

    const probe = (
        <Text
            className="font-lexend"
            numberOfLines={1}
            style={{ position: 'absolute', opacity: 0, fontSize: MEASURE_REFERENCE_SIZE }}
            onLayout={(e) => {
                if (charRatio !== null) return;
                const width = e.nativeEvent.layout.width;
                if (width > 0) {
                    setCharRatio(width / MEASURE_SAMPLE.length / MEASURE_REFERENCE_SIZE);
                }
            }}
        >
            {MEASURE_SAMPLE}
        </Text>
    );

    return { measure, probe };
}
