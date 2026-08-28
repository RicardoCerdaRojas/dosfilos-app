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

/** Umbral del long press propio. El de RN son ~500 ms y no se puede bajar. */
const LONG_PRESS_MS = 240;

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
    /** Clase de NativeWind de la familia elegida (font-lexend, font-literata…). */
    faceClass: string;
    /**
     * Reporta dónde quedó cada palabra en PANTALLA. Es lo que le permite a la
     * capa de tinta anclarse al texto: sin esta geometría una nota sólo podría
     * guardarse en coordenadas de pantalla, y se rompería al cambiar el cuerpo.
     */
    onWordLayout?: (sourceStart: number, rect: { x: number; y: number; height: number }) => void;
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
    faceClass,
    onWordLayout,
}: Props) {
    const rects = useRef<Map<number, LayoutRectangle>>(new Map());
    const anchor = useRef<PlacedWord | null>(null);
    const container = useRef<View | null>(null);
    /**
     * Origen del contenedor en coordenadas de PANTALLA.
     *
     * Hace falta porque los rectángulos de las palabras llegan relativos al
     * contenedor, mientras que el toque sólo trae `pageX/pageY` fiables. Usar
     * `locationX/locationY` fue el bug: en RN son relativas al elemento que
     * recibió el toque —cada palabra es su propia vista—, así que al arrastrar
     * llegaban valores casi en cero y la búsqueda resolvía siempre la primera
     * palabra del párrafo. De ahí que seleccionara todo hacia atrás.
     */
    const origin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pressStart = useRef<{ x: number; y: number } | null>(null);

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

    const wordAt = (pageX: number, pageY: number): PlacedWord | null => {
        const x = pageX - origin.current.x;
        const y = pageY - origin.current.y;
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
    const cancelPress = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = null;
        pressStart.current = null;
    };

    /**
     * Long press propio en vez del de `Text`: el de RN tarda ~500 ms y no se
     * puede bajar. A 240 ms el gesto se siente inmediato y sigue sin dispararse
     * por un roce.
     */
    const handleTouchStart = (e: GestureResponderEvent) => {
        const { pageX, pageY } = e.nativeEvent;
        pressStart.current = { x: pageX, y: pageY };
        cancelTimerOnly();
        pressTimer.current = setTimeout(() => {
            const word = wordAt(pageX, pageY);
            if (!word) return;
            anchor.current = word;
            onSelectionChange({ start: word.sourceStart, end: word.sourceEnd });
        }, LONG_PRESS_MS);
    };

    const cancelTimerOnly = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = null;
    };

    const handleTouchMove = (e: GestureResponderEvent) => {
        // Si el dedo se fue antes de que prendiera la selección, era un swipe
        // o un scroll: se cancela para no robarle el gesto a la navegación.
        if (anchor.current || !pressStart.current) return;
        const { pageX, pageY } = e.nativeEvent;
        const moved =
            Math.abs(pageX - pressStart.current.x) + Math.abs(pageY - pressStart.current.y);
        if (moved > 12) cancelTimerOnly();
    };

    const handleMove = (e: GestureResponderEvent) => {
        if (!anchor.current) return;
        const word = wordAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (word) onSelectionChange(rangeBetween(anchor.current, word));
    };

    const handleRelease = (e: GestureResponderEvent) => {
        cancelPress();
        if (!anchor.current) return;
        const word = wordAt(e.nativeEvent.pageX, e.nativeEvent.pageY) ?? anchor.current;
        const range = rangeBetween(anchor.current, word);
        anchor.current = null;
        onSelectionEnd(range, e.nativeEvent.pageY);
    };

    const handleTerminate = () => {
        cancelPress();
        anchor.current = null;
        onSelectionChange(null);
    };

    return (
        <View
            ref={container}
            className="flex-row flex-wrap"
            onLayout={() =>
                container.current?.measureInWindow((x, y) => {
                    origin.current = { x, y };
                })
            }
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
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
                        onLayout={(e) => {
                            rects.current.set(index, e.nativeEvent.layout);
                            if (!onWordLayout) return;
                            // En coordenadas de pantalla: la tinta vive fuera
                            // de este contenedor y necesita el mismo sistema.
                            onWordLayout(word.sourceStart, {
                                x: origin.current.x + e.nativeEvent.layout.x,
                                y: origin.current.y + e.nativeEvent.layout.y,
                                height: e.nativeEvent.layout.height,
                            });
                        }}
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
                            className={faceClass}
                        >
                            {word.text}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}
