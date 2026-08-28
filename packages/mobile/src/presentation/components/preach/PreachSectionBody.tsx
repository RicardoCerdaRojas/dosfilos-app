import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { HighlightColor, ReadingBlock, ReadingUnit } from '@dosfilos/domain';

import { tokenizeCitations } from '@/core/utils/sermonSections';
import { ReadingModeTokens } from '@/core/theme/readingModes';
import { DELIVERY_LINE_HEIGHT, PARAGRAPH_GAP_EM, TYPE_SCALE } from '@/core/theme/typography';

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
    /** Colometría: cada oración abre renglón (D6). */
    senseLines: boolean;
    /** Tap sobre el texto: la navegación por zonas ⅓ sigue viva encima del cuerpo. */
    onTapAt: (pageX: number) => void;
    onLongPressUnit: (blockIndex: number, unitIndex: number) => void;
    onPressCitation: (ordinals: number[]) => void;
    /** Abre una cita de bloque colapsada (aparato de estudio, P5). */
    onPressApparatus: (text: string) => void;
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
    senseLines,
    onTapAt,
    onLongPressUnit,
    onPressCitation,
    onPressApparatus,
}: Props) {
    const renderUnit = (
        unit: ReadingUnit,
        blockIndex: number,
        unitIndex: number,
        withTrailingSpace: boolean,
    ) => {
        const mark = highlightFor(unit, highlights);
        return (
            <React.Fragment key={unitIndex}>
                <Text
                    // El tap se reenvía para que las zonas ⅓ de avance sigan
                    // funcionando sobre el texto: un Text con onLongPress se
                    // queda con el toque y dejaría el sermón sin navegación.
                    onPress={(e) => onTapAt(e.nativeEvent.pageX)}
                    onLongPress={() => onLongPressUnit(blockIndex, unitIndex)}
                    suppressHighlighting
                    style={
                        mark
                            ? {
                                  backgroundColor: tokens.highlightColors[mark.color],
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
                                style={{
                                    color: tokens.accent,
                                    fontSize: fontSize * TYPE_SCALE.citationMarker,
                                }}
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
                {/* El espacio va FUERA del resaltado: dentro, dos frases
                    marcadas se verían como una. */}
                {withTrailingSpace ? <Text>{' '}</Text> : null}
            </React.Fragment>
        );
    };

    const paragraphStyle = {
        color: tokens.textPrimary,
        fontSize,
        lineHeight: fontSize * DELIVERY_LINE_HEIGHT,
    };

    return (
        <>
            {blocks.map((block, blockIndex) =>
                block.kind === 'quote' ? (
                    // P5 — el aparato de estudio se colapsa a una marca al
                    // margen. Es el comentario que se leyó el martes: en el
                    // púlpito ocupaba una pantalla entera de algo que nadie
                    // va a decir en voz alta.
                    <TouchableOpacity
                        key={blockIndex}
                        onPress={() => onPressApparatus(block.text)}
                        accessibilityRole="button"
                        accessibilityLabel={block.text}
                        className="flex-row items-center"
                        style={{
                            borderLeftWidth: 2,
                            borderLeftColor: tokens.border,
                            paddingLeft: fontSize * 0.4,
                            paddingVertical: fontSize * 0.25,
                            marginBottom: fontSize * PARAGRAPH_GAP_EM,
                        }}
                    >
                        <MaterialIcons
                            name="format-quote"
                            size={fontSize * TYPE_SCALE.apparatus}
                            color={tokens.textSecondary}
                        />
                        <Text
                            numberOfLines={1}
                            style={{
                                color: tokens.textSecondary,
                                fontSize: fontSize * TYPE_SCALE.apparatus,
                                marginLeft: fontSize * 0.25,
                                flex: 1,
                            }}
                            className="font-lexend"
                        >
                            {block.text}
                        </Text>
                    </TouchableOpacity>
                ) : block.kind === 'listitem' ? (
                    <View
                        key={blockIndex}
                        className="flex-row"
                        style={{ marginBottom: fontSize * 0.45 }}
                    >
                        <Text
                            style={{ ...paragraphStyle, width: fontSize * 1.1 }}
                            className="font-lexend"
                        >
                            {'\u2022'}
                        </Text>
                        <Text style={{ ...paragraphStyle, flex: 1 }} className="font-lexend">
                            {block.units.map((unit, unitIndex) =>
                                renderUnit(
                                    unit,
                                    blockIndex,
                                    unitIndex,
                                    unitIndex < block.units.length - 1,
                                ),
                            )}
                        </Text>
                    </View>
                ) : block.kind === 'subheading' ? (
                    <Text
                        key={blockIndex}
                        style={{
                            color: tokens.textSecondary,
                            fontSize: fontSize * TYPE_SCALE.movementTitle,
                            marginTop: fontSize * 0.6,
                            marginBottom: fontSize * 0.4,
                        }}
                        className="font-lexend-semibold uppercase tracking-wide"
                    >
                        {block.text}
                    </Text>
                ) : senseLines ? (
                    // Colometría: cada oración es su propio bloque, así el ojo
                    // que vuelve del público reengancha en el arranque de la
                    // frase y no a mitad de renglón.
                    <View key={blockIndex} style={{ marginBottom: fontSize * PARAGRAPH_GAP_EM }}>
                        {block.units.map((unit, unitIndex) => (
                            <Text
                                key={unitIndex}
                                style={{ ...paragraphStyle, marginBottom: fontSize * 0.12 }}
                                className="font-lexend"
                            >
                                {renderUnit(unit, blockIndex, unitIndex, false)}
                            </Text>
                        ))}
                    </View>
                ) : (
                    <Text
                        key={blockIndex}
                        style={{ ...paragraphStyle, marginBottom: fontSize * PARAGRAPH_GAP_EM }}
                        className="font-lexend"
                    >
                        {block.units.map((unit, unitIndex) =>
                            renderUnit(
                                unit,
                                blockIndex,
                                unitIndex,
                                unitIndex < block.units.length - 1,
                            ),
                        )}
                    </Text>
                ),
            )}
        </>
    );
}
