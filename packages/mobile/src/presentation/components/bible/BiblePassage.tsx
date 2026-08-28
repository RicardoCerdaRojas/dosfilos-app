import React from 'react';
import { Text, View } from 'react-native';

import { ReadingModeTokens } from '@/core/theme/readingModes';
import { DELIVERY_LINE_HEIGHT, FACE_CLASS } from '@/core/theme/typography';
import type { DeliveryFace } from '@/core/theme/typography';
import type { BibleMark } from '@/domain/bible/entities/BibleMark';
import { verseKey } from '@/domain/bible/entities/BibleMark';

interface Props {
    bookId: string;
    chapter: number;
    /** Versículos del capítulo, en orden. El índice + 1 es el número. */
    verses: string[];
    /** Marcas de este capítulo, indexadas por `verseKey`. */
    marks: Map<string, BibleMark>;
    tokens: ReadingModeTokens;
    face: DeliveryFace;
    fontSize: number;
    /** Versículos seleccionados ahora, para copiar o marcar. */
    selected: Set<number>;
    onToggleVerse: (verse: number) => void;
}

/**
 * Un capítulo como PROSA CONTINUA, con el número de versículo en superíndice.
 *
 * Casi todas las apps de Biblia parten el texto en un bloque por versículo.
 * Es cómodo para el programador y hostil para el lector: destruye la prosa que
 * el autor escribió y convierte una carta en un inventario. Acá el texto corre
 * seguido y el número queda tenue y en volado — disponible cuando se lo busca,
 * invisible cuando se está leyendo. Es la forma de las *reader's Bibles*
 * modernas, y no es una moda: es devolverle al texto su forma original.
 *
 * La estructura no se pierde: tocar un versículo lo selecciona, y de ahí sale
 * marcarlo o copiarlo al sermón. Deja de gritar, no deja de existir.
 *
 * Hereda tipografía, medida y modos de luz del púlpito a propósito: el ojo del
 * pastor no debería cambiar de registro entre el sermón y el pasaje que lo
 * sostiene.
 */
export function BiblePassage({
    bookId,
    chapter,
    verses,
    marks,
    tokens,
    face,
    fontSize,
    selected,
    onToggleVerse,
}: Props) {
    return (
        <Text
            style={{
                color: tokens.textPrimary,
                fontSize,
                lineHeight: fontSize * DELIVERY_LINE_HEIGHT,
            }}
            className={FACE_CLASS[face].regular}
        >
            {verses.map((text, index) => {
                const verse = index + 1;
                const mark = marks.get(verseKey(bookId, chapter, verse));
                const isSelected = selected.has(verse);
                return (
                    <Text key={verse} onPress={() => onToggleVerse(verse)} suppressHighlighting>
                        <Text
                            style={{
                                color: tokens.textSecondary,
                                fontSize: fontSize * 0.58,
                                // Volado: el número acompaña, no interrumpe.
                                lineHeight: fontSize * DELIVERY_LINE_HEIGHT,
                            }}
                            className={FACE_CLASS[face].semibold}
                        >
                            {`${verse} `}
                        </Text>
                        <Text
                            style={{
                                backgroundColor: isSelected
                                    ? tokens.selection
                                    : mark && mark.style === 'highlight'
                                      ? tokens.highlightColors[mark.color]
                                      : 'transparent',
                                textDecorationLine:
                                    mark?.style === 'strike'
                                        ? 'line-through'
                                        : mark?.style === 'underline' ||
                                            (mark && tokens.highlightUnderline)
                                          ? 'underline'
                                          : 'none',
                            }}
                        >
                            {text}
                        </Text>
                        <Text>{'  '}</Text>
                    </Text>
                );
            })}
        </Text>
    );
}

/** Cita en el formato de markdown que ya usa el sermón, para copiar. */
export function formatPassageForSermon(
    bookName: string,
    chapter: number,
    verses: { verse: number; text: string }[],
): string {
    if (!verses.length) return '';
    const first = verses[0].verse;
    const last = verses[verses.length - 1].verse;
    const ref = first === last ? `${bookName} ${chapter}:${first}` : `${bookName} ${chapter}:${first}-${last}`;
    // Cita de bloque: en el púlpito se colapsa a una marca al margen, que es
    // exactamente lo que corresponde a un pasaje citado.
    const body = verses.map((v) => v.text).join(' ');
    return `> **${ref}** ${body}\n`;
}
