import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HIGHLIGHT_COLORS } from '@dosfilos/domain';
import type { HighlightColor } from '@dosfilos/domain';

import { ReadingModeTokens } from '@/core/theme/readingModes';

/** Alcance de la marca: la frase bajo el dedo o el párrafo entero (plan §6). */
export type HighlightScope = 'sentence' | 'paragraph';

interface Props {
    visible: boolean;
    tokens: ReadingModeTokens;
    scope: HighlightScope;
    onChangeScope: (scope: HighlightScope) => void;
    /** Color actual si la frase ya estaba resaltada. */
    currentColor: HighlightColor | null;
    onPick: (color: HighlightColor) => void;
    onRemove: () => void;
    onClose: () => void;
}

export function HighlightPalette({
    visible,
    tokens,
    scope,
    onChangeScope,
    currentColor,
    onPick,
    onRemove,
    onClose,
}: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const scopes: HighlightScope[] = ['sentence', 'paragraph'];

    return (
        <Modal visible={visible} transparent animationType={tokens.animations ? 'fade' : 'none'}>
            <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
                <Pressable
                    className="rounded-t-2xl px-6 pt-5"
                    style={{ backgroundColor: tokens.surface, paddingBottom: insets.bottom + 20 }}
                    // Un tap dentro del panel no debe cerrarlo.
                    onPress={() => undefined}
                >
                    <Text
                        style={{ color: tokens.textSecondary }}
                        className="font-lexend-semibold text-xs uppercase tracking-widest mb-2"
                    >
                        {t('preach:highlight')}
                    </Text>

                    <View className="flex-row flex-wrap mb-5">
                        {scopes.map((option) => (
                            <TouchableOpacity
                                key={option}
                                onPress={() => onChangeScope(option)}
                                accessibilityRole="button"
                                accessibilityLabel={t(`preach:scope_${option}`)}
                                className="px-4 py-2 rounded-full mr-2"
                                style={{
                                    backgroundColor: option === scope ? tokens.accent : 'transparent',
                                    borderWidth: 1,
                                    borderColor: option === scope ? tokens.accent : tokens.border,
                                }}
                            >
                                <Text
                                    style={{
                                        color: option === scope ? tokens.background : tokens.textPrimary,
                                    }}
                                    className="font-lexend text-sm"
                                >
                                    {t(`preach:scope_${option}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View className="flex-row items-center">
                        {HIGHLIGHT_COLORS.map((color) => (
                            <TouchableOpacity
                                key={color}
                                onPress={() => onPick(color)}
                                accessibilityRole="button"
                                accessibilityLabel={t(`preach:color_${color}`)}
                                className="mr-3 items-center justify-center"
                                style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 26,
                                    backgroundColor: tokens.highlightColors[color],
                                    borderWidth: color === currentColor ? 3 : 1,
                                    borderColor: color === currentColor ? tokens.accent : tokens.border,
                                }}
                            >
                                {/* En e-ink los cuatro fondos son blancos: la
                                    inicial es lo único que los distingue. */}
                                {tokens.highlightUnderline ? (
                                    <Text
                                        style={{ color: tokens.textPrimary }}
                                        className="font-lexend-semibold text-base"
                                    >
                                        {t(`preach:color_${color}`).charAt(0).toUpperCase()}
                                    </Text>
                                ) : null}
                            </TouchableOpacity>
                        ))}

                        {currentColor ? (
                            <TouchableOpacity
                                onPress={onRemove}
                                accessibilityRole="button"
                                accessibilityLabel={t('preach:remove_highlight')}
                                className="ml-auto items-center justify-center"
                                style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 26,
                                    borderWidth: 1,
                                    borderColor: tokens.border,
                                }}
                            >
                                <MaterialIcons name="format-clear" size={22} color={tokens.textPrimary} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
