import React, { useRef } from 'react';
import { GestureResponderEvent, LayoutRectangle, Text, View } from 'react-native';
import type { ReadingUnit } from '@dosfilos/domain';
import { splitWords } from '@dosfilos/domain';

import { tokenizeCitations } from '@/core/utils/sermonSections';

/** Una palabra con su rango en el cuerpo CRUDO y su rectángulo en pantalla. */
interface PlacedWord {
    text: string;
    sourceStart: number;
    sourceEnd: number;
    /** Marcadores `[N]` que contiene, si es que la palabra es uno. */
    ordinals: number[] | null;
}

export interface SelectionRange {
    start: number;
    end: number;
}

interface Props {
    units: ReadingUnit[];
    fontSize: number;
    lineHeight: number;
    color: string;
    /** Rango en curso, para pintar la selección mientras el dedo se mueve. */
    selection: SelectionRange | null;
    /** Estilo por palabra ya resuelto desde las marcas guardadas. */
    styleAt: (sourceStart: number) => { background?: string; underline?: boolean; strike?: boolean } | null;
    onSelectionChange: (range: SelectionRange | null) => void;
    onSelectionEnd: (range: SelectionRange, atY: number) => void;
    onTapAt: (pageX: number) => void;
    onPressCitation: (ordinals: number[]) => void;
    selectionColor: string;
}

/**
 * Párrafo con selección POR PALABRA (arrastrando el dedo).
 *
 * POR QUÉ SE RENDERIZA PALABRA POR PALABRA. En React Native un `<Text>`
 * anidado no es una vista: no reporta `onLayout` y no se puede saber dónde
 * cayó cada palabra en pantalla. Sin esa geometría no hay forma de resolver
 * qué se está seleccionando mientras el dedo se mueve. Por eso cada palabra
 * es una `<View>` en una fila que envuelve — se paga en cantidad de nodos y
 * se gana lo único que el pastor pidió: ver lo que está por marcar antes de
 * marcarlo.
 *
 * El espacio entre palabras va DENTRO de cada palabra (marginRight), no como
 * nodo aparte: así la selección no puede quedar "entre" dos palabras.
 */
export function SelectableParagraph({
    units,
    fontSize,
    lineHeight,
    color,
    selection,
    styleAt,
    onSelectionChange,
    onSelectionEnd,
    onTapAt,
    onPressCitation,
    selectionColor,
}: Props) {
    const rects = useRef<Map<number, LayoutRectangle>>(new Map());
    const anchor = useRef<PlacedWord | null>(null);

    const words: PlacedWord[] = [];
    units.forEach((unit) => {
        splitWords(unit.text).forEach((w) => {
            const tokens = tokenizeCitations(w.text);
            const citation = tokens.find((t) => t.kind === 'citation');
            words.push({
                text: w.text,
                sourceStart: unit.sourceStart + w.start,
                sourceEnd: unit.sourceStart + w.end,
                ordinals: citation && citation.kind === 'citation' ? citation.ordinals : null,
            });
        });
    });

    const wordAt = (x: number, y: number): PlacedWord | null => {
        let closest: PlacedWord | null = null;
        let closestDistance = Number.POSITIVE_INFINITY;
        for (const [index, rect] of rects.current.entries()) {
            const word = words[index];
            if (!word) continue;
            if (y < rect.y || y > rect.y + rect.height) continue;
            // Dentro del renglón, la palabra más cercana en X. Así el dedo no
            // tiene que caer exacto: en el atril nunca cae exacto.
            const distance = Math.abs(x - (rect.x + rect.width / 2));
            if (distance < closestDistance) {
                closestDistance = distance;
                closest = word;
            }
        }
        return closest;
    };

    const rangeBetween = (a: PlacedWord, b: PlacedWord): SelectionRange => ({
        start: Math.min(a.sourceStart, b.sourceStart),
        end: Math.max(a.sourceEnd, b.sourceEnd),
    });

    // Props de responder en crudo, no PanResponder: crearlo con useRef obliga a
    // leer `.current` durante el render, que el compilador de React prohíbe.
    // Así los handlers son funciones normales y ven las palabras de este
    // render, sin refs de por medio.
    const handleMove = (e: GestureResponderEvent) => {
        if (!anchor.current) return;
        const word = wordAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
        if (word) onSelectionChange(rangeBetween(anchor.current, word));
    };

    const handleRelease = (e: GestureResponderEvent) => {
        if (!anchor.current) return;
        const word = wordAt(e.nativeEvent.locationX, e.nativeEvent.locationY) ?? anchor.current;
        const range = rangeBetween(anchor.current, word);
        anchor.current = null;
        onSelectionEnd(range, e.nativeEvent.locationY);
    };

    const handleTerminate = () => {
        anchor.current = null;
        onSelectionChange(null);
    };

    return (
        <View
            className="flex-row flex-wrap"
            onStartShouldSetResponder={() => false}
            onMoveShouldSetResponder={() => anchor.current !== null}
            onResponderMove={handleMove}
            onResponderRelease={handleRelease}
            onResponderTerminate={handleTerminate}
        >
            {words.map((word, index) => {
                const selected =
                    selection !== null &&
                    word.sourceStart >= selection.start &&
                    word.sourceEnd <= selection.end;
                const mark = styleAt(word.sourceStart);
                return (
                    <View
                        key={index}
                        onLayout={(e) => rects.current.set(index, e.nativeEvent.layout)}
                        style={{
                            backgroundColor: selected
                                ? selectionColor
                                : (mark?.background ?? 'transparent'),
                            marginRight: fontSize * 0.28,
                        }}
                    >
                        <Text
                            onPress={(e) => {
                                if (word.ordinals) onPressCitation(word.ordinals);
                                else onTapAt(e.nativeEvent.pageX);
                            }}
                            onLongPress={() => {
                                anchor.current = word;
                                onSelectionChange({
                                    start: word.sourceStart,
                                    end: word.sourceEnd,
                                });
                            }}
                            suppressHighlighting
                            style={{
                                color: word.ordinals ? undefined : color,
                                fontSize,
                                lineHeight,
                                textDecorationLine: mark?.strike
                                    ? 'line-through'
                                    : mark?.underline
                                      ? 'underline'
                                      : 'none',
                            }}
                            className="font-lexend"
                        >
                            {word.text}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}
