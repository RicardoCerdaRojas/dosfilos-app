import React from 'react';
import { Text } from 'react-native';
import type { HighlightColor, ReadingBlock, ReadingUnit } from '@dosfilos/domain';

import { tokenizeCitations } from '@/core/utils/sermonSections';
import { ReadingModeTokens } from '@/core/theme/readingModes';

/** Resaltado ya reanclado al cuerpo crudo de ESTA sección. */
export interface ResolvedHighlight {
    id: string;
    color: HighlightColor;
    start: number;
    end: number;
}

interface Props {
    blocks: ReadingBlock[];
    highlights: ResolvedHighlight[];
    fontSize: number;
    tokens: ReadingModeTokens;
    /** Tap sobre el texto: la navegación por zonas ⅓ sigue viva encima del cuerpo. */
    onTapAt: (pageX: number) => void;
    onLongPressUnit: (blockIndex: number, unitIndex: number) => void;
    onPressCitation: (ordinals: number[]) => void;
}

/**
 * En F1 el resaltado es por frase completa: una marca se pinta sobre la
 * unidad cuando cubre más de la mitad de sus caracteres. La selección fina
 * por carácter llega en F2 y exige render por spans.
 */
function highlightFor(unit: ReadingUnit, highlights: ResolvedHighlight[]): ResolvedHighlight | null {
    const span = Math.max(1, unit.sourceEnd - unit.sourceStart);
    for (const mark of highlights) {
        const overlap =
            Math.min(mark.end, unit.sourceEnd) - Math.max(mark.start, unit.sourceStart);
        if (overlap > span / 2) return mark;
    }
    return null;
}

export function PreachSectionBody({
    blocks,
    highlights,
    fontSize,
    tokens,
    onTapAt,
    onLongPressUnit,
    onPressCitation,
}: Props) {
    return (
        <>
            {blocks.map((block, blockIndex) =>
                block.kind === 'subheading' ? (
                    <Text
                        key={blockIndex}
                        style={{ color: tokens.textSecondary, fontSize: fontSize * 0.8 }}
                        className="font-lexend-semibold uppercase tracking-wide mt-4 mb-2"
                    >
                        {block.text}
                    </Text>
                ) : (
                    <Text
                        key={blockIndex}
                        style={{ color: tokens.textPrimary, fontSize, lineHeight: fontSize * 1.6 }}
                        className="font-lexend mb-5"
                    >
                        {block.units.map((unit, unitIndex) => {
                            const mark = highlightFor(unit, highlights);
                            return (
                                <React.Fragment key={unitIndex}>
                                    <Text
                                        // El tap se reenvía para que las zonas ⅓ de
                                        // avance sigan funcionando sobre el texto:
                                        // un Text con onLongPress se queda con el
                                        // toque y dejaría el sermón sin navegación.
                                        onPress={(e) => onTapAt(e.nativeEvent.pageX)}
                                        onLongPress={() => onLongPressUnit(blockIndex, unitIndex)}
                                        suppressHighlighting
                                        style={
                                            mark
                                                ? {
                                                      backgroundColor:
                                                          tokens.highlightColors[mark.color],
                                                      textDecorationLine: tokens.highlightUnderline
                                                          ? 'underline'
                                                          : 'none',
                                                  }
                                                : undefined
                                        }
                                    >
                                        {tokenizeCitations(unit.text).map((token, tokenIndex) =>
                                            token.kind === 'citation' ? (
                                                <Text
                                                    key={tokenIndex}
                                                    style={{ color: tokens.accent }}
                                                    onPress={() => onPressCitation(token.ordinals)}
                                                    suppressHighlighting
                                                >
                                                    {token.text}
                                                </Text>
                                            ) : (
                                                <Text key={tokenIndex}>{token.text}</Text>
                                            ),
                                        )}
                                    </Text>
                                    {/* El espacio va FUERA del resaltado: dentro,
                                        dos frases marcadas se verían como una. */}
                                    {unitIndex < block.units.length - 1 ? <Text>{' '}</Text> : null}
                                </React.Fragment>
                            );
                        })}
                    </Text>
                ),
            )}
        </>
    );
}
