import React, { useRef } from 'react';
import { GestureResponderEvent, LayoutRectangle, Text, View } from 'react-native';
import { splitWords } from '@dosfilos/domain';

import { ReadingModeTokens } from '@/core/theme/readingModes';
import { DELIVERY_LINE_HEIGHT, FACE_CLASS } from '@/core/theme/typography';
import type { DeliveryFace } from '@/core/theme/typography';
import type { BibleMark } from '@/domain/bible/entities/BibleMark';
import { verseKey } from '@/domain/bible/entities/BibleMark';

/** Una palabra del capítulo, con el versículo al que pertenece. */
interface PlacedWord {
    text: string;
    verse: number;
    /** La primera palabra del versículo lleva el número en volado. */
    leading: boolean;
}

/** Umbral del long press propio. El de RN son ~500 ms y no se puede bajar. */
const LONG_PRESS_MS = 240;

interface Props {
    bookId: string;
    chapter: number;
    verses: string[];
    marks: Map<string, BibleMark>;
    tokens: ReadingModeTokens;
    face: DeliveryFace;
    fontSize: number;
    selected: Set<number>;
    onToggleVerse: (verse: number) => void;
    /** Rango arrastrado: reemplaza la selección por estos versículos. */
    onSelectRange: (from: number, to: number) => void;
}

/**
 * El capítulo como PROSA CONTINUA, seleccionable por versículo.
 *
 * POR QUÉ CADA PALABRA ES UNA VISTA. Antes el capítulo era un `<Text>` con un
 * `<Text onPress>` anidado por versículo. Un `<Text>` anidado no es una vista:
 * no reporta `onLayout`, no se puede saber dónde cayó en pantalla, y el toque
 * se resuelve por dentro del párrafo — de ahí que el versículo elegido no
 * fuera el tocado y que arrastrar no seleccionara nada hacia adelante. Es el
 * mismo problema que ya había en el sermón, y se resuelve igual: la palabra es
 * una `<View>`, tiene rectángulo propio, y la geometría deja de ser un
 * misterio. Se paga en cantidad de nodos.
 *
 * Tocar alterna un versículo; mantener y arrastrar toma un rango, hacia
 * adelante o hacia atrás. El número queda tenue y en volado: disponible cuando
 * se lo busca, invisible cuando se lee.
 */
export function SelectableVerses({
    bookId,
    chapter,
    verses,
    marks,
    tokens,
    face,
    fontSize,
    selected,
    onToggleVerse,
    onSelectRange,
}: Props) {
    const rects = useRef<Map<number, LayoutRectangle>>(new Map());
    const anchor = useRef<number | null>(null);
    const container = useRef<View | null>(null);
    /**
     * Origen del contenedor en coordenadas de PANTALLA: los rectángulos de las
     * palabras llegan relativos al contenedor y el toque sólo trae `pageX/Y`
     * fiables. `locationX/Y` son relativas a la vista que recibió el toque
     * —cada palabra es la suya—, y usarlas era lo que hacía que el arrastre
     * resolviera siempre la primera palabra.
     */
    const origin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pressStart = useRef<{ x: number; y: number } | null>(null);

    const words: PlacedWord[] = [];
    verses.forEach((text, index) => {
        const verse = index + 1;
        splitWords(text).forEach((w, position) => {
            words.push({ text: w.text, verse, leading: position === 0 });
        });
    });

    const verseAt = (pageX: number, pageY: number): number | null => {
        const x = pageX - origin.current.x;
        const y = pageY - origin.current.y;
        let closest: number | null = null;
        let closestDistance = Number.POSITIVE_INFINITY;
        for (const [index, rect] of rects.current.entries()) {
            const word = words[index];
            if (!word) continue;
            if (y < rect.y || y > rect.y + rect.height) continue;
            const distance = Math.abs(x - (rect.x + rect.width / 2));
            if (distance < closestDistance) {
                closestDistance = distance;
                closest = word.verse;
            }
        }
        return closest;
    };

    const cancelTimerOnly = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = null;
    };

    const cancelPress = () => {
        cancelTimerOnly();
        pressStart.current = null;
    };

    const handleTouchStart = (e: GestureResponderEvent) => {
        const { pageX, pageY } = e.nativeEvent;
        pressStart.current = { x: pageX, y: pageY };
        cancelTimerOnly();
        pressTimer.current = setTimeout(() => {
            const verse = verseAt(pageX, pageY);
            if (verse === null) return;
            anchor.current = verse;
            onSelectRange(verse, verse);
        }, LONG_PRESS_MS);
    };

    const handleTouchMove = (e: GestureResponderEvent) => {
        // Si el dedo se fue antes de que prendiera el rango, era scroll.
        if (anchor.current || !pressStart.current) return;
        const { pageX, pageY } = e.nativeEvent;
        const moved =
            Math.abs(pageX - pressStart.current.x) + Math.abs(pageY - pressStart.current.y);
        if (moved > 12) cancelTimerOnly();
    };

    const handleMove = (e: GestureResponderEvent) => {
        if (anchor.current === null) return;
        const verse = verseAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (verse !== null) onSelectRange(anchor.current, verse);
    };

    const handleRelease = (e: GestureResponderEvent) => {
        cancelPress();
        if (anchor.current === null) return;
        const verse = verseAt(e.nativeEvent.pageX, e.nativeEvent.pageY) ?? anchor.current;
        onSelectRange(anchor.current, verse);
        anchor.current = null;
    };

    const handleTerminate = () => {
        cancelPress();
        anchor.current = null;
    };

    const lineHeight = fontSize * DELIVERY_LINE_HEIGHT;

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
            // Con un rango vivo NO se cede el gesto: si no, el scroll lo
            // reclama a mitad del arrastre y la selección se borra sola.
            onResponderTerminationRequest={() => anchor.current === null}
            onResponderMove={handleMove}
            onResponderRelease={handleRelease}
            onResponderTerminate={handleTerminate}
        >
            {words.map((word, index) => {
                const mark = marks.get(verseKey(bookId, chapter, word.verse));
                const isSelected = selected.has(word.verse);
                return (
                    <View
                        key={index}
                        onLayout={(e) => rects.current.set(index, e.nativeEvent.layout)}
                        style={{
                            backgroundColor: isSelected
                                ? tokens.selection
                                : mark && mark.style === 'highlight'
                                  ? tokens.highlightColors[mark.color]
                                  : 'transparent',
                            // Padding y no margen: el espacio entre palabras
                            // queda DENTRO del fondo y el resaltado sale
                            // continuo en vez de entrecortado.
                            paddingRight: fontSize * 0.28,
                        }}
                    >
                        <Text
                            onPress={() => onToggleVerse(word.verse)}
                            suppressHighlighting
                            style={{
                                color: tokens.textPrimary,
                                fontSize,
                                lineHeight,
                                textDecorationLine:
                                    mark?.style === 'strike'
                                        ? 'line-through'
                                        : mark?.style === 'underline' ||
                                            (mark && tokens.highlightUnderline)
                                          ? 'underline'
                                          : 'none',
                            }}
                            className={FACE_CLASS[face].regular}
                        >
                            {word.leading ? (
                                <Text
                                    style={{
                                        color: tokens.textSecondary,
                                        fontSize: fontSize * 0.58,
                                        lineHeight,
                                        textDecorationLine: 'none',
                                    }}
                                    className={FACE_CLASS[face].semibold}
                                >
                                    {`${word.verse} `}
                                </Text>
                            ) : null}
                            {word.text}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}
