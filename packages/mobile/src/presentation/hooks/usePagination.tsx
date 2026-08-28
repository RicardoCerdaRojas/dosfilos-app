import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { ReadingBlock } from '@dosfilos/domain';

/**
 * Paginación real del púlpito (D7, P1).
 *
 * REGLA DEL MANUSCRITO: la página nunca termina a mitad de oración. Paginar
 * "por sección" no alcanza — un movimiento largo no entra en una pantalla y
 * se sigue scrolleando, que es exactamente lo que rompe la memoria espacial:
 * en una página fija el ojo aprende dónde está cada cosa y el regreso de la
 * mirada es gratis; al scrollear, todo se mueve todo el tiempo.
 *
 * CÓMO. No hay forma de saber cuánto mide un bloque sin renderizarlo, así que
 * se hace una pasada de medición invisible, se guardan las alturas y recién
 * entonces se arman las páginas empaquetando bloques enteros. El bloque es el
 * átomo: nunca se parte, y como los bloques ya vienen cortados en unidades de
 * sentido, ninguna página corta una oración.
 *
 * LÍMITE CONOCIDO: si un bloque solo excede el alto disponible —un párrafo de
 * ~150 palabras a 28 pt— ocupa su propia página y esa página se puede
 * scrollear. Es preferible a perder texto, y en prosa de sermón es raro.
 */
export interface Pagination {
    /** Páginas, cada una con los índices de bloque que le tocan. */
    pages: number[][];
    /** `true` mientras faltan alturas por medir. */
    measuring: boolean;
    /** Nodo de medición: montarlo una vez, fuera de la vista. */
    probe: React.ReactNode;
}

interface Options {
    blocks: ReadingBlock[];
    /** Alto útil de la página, ya descontado el tablero inferior. */
    availableHeight: number;
    /** Render de un bloque, el MISMO que usa la página real. */
    renderBlock: (block: ReadingBlock, index: number) => React.ReactNode;
    /**
     * Cambia cuando cambia cualquier cosa que altere las alturas (cuerpo,
     * colometría, sección). Fuerza volver a medir.
     */
    layoutKey: string;
}

export function usePagination({
    blocks,
    availableHeight,
    renderBlock,
    layoutKey,
}: Options): Pagination {
    const [heights, setHeights] = useState<Record<string, number[]>>({});

    const measured = heights[layoutKey];
    const complete =
        blocks.length > 0 && measured?.length === blocks.length && measured.every((h) => h > 0);

    const onMeasured = useCallback(
        (index: number, height: number) => {
            setHeights((current) => {
                const forKey = current[layoutKey] ? [...current[layoutKey]] : [];
                if (forKey[index] === height) return current;
                forKey[index] = height;
                return { ...current, [layoutKey]: forKey };
            });
        },
        [layoutKey],
    );

    const pages = useMemo(() => {
        if (!complete || availableHeight <= 0) return [];
        const result: number[][] = [];
        let current: number[] = [];
        let used = 0;

        blocks.forEach((_, index) => {
            const height = measured[index];
            // Un bloque que no entra en una página vacía va solo: partirlo
            // rompería una oración, que es justo lo que se evita.
            if (current.length > 0 && used + height > availableHeight) {
                result.push(current);
                current = [];
                used = 0;
            }
            current.push(index);
            used += height;
        });

        if (current.length) result.push(current);
        return result;
    }, [blocks, measured, complete, availableHeight]);

    const probe = complete ? null : (
        <View
            // Fuera de la vista pero con el ancho real: medir a otro ancho
            // daría otro alto y las páginas saldrían mal cortadas.
            style={{ position: 'absolute', opacity: 0, left: 0, right: 0 }}
            pointerEvents="none"
        >
            {blocks.map((block, index) => (
                <View
                    key={`${layoutKey}-${index}`}
                    onLayout={(e) => onMeasured(index, e.nativeEvent.layout.height)}
                >
                    {renderBlock(block, index)}
                </View>
            ))}
        </View>
    );

    return { pages, measuring: !complete, probe };
}
