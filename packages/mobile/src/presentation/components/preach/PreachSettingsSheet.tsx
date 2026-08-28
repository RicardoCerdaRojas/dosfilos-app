import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    READING_MODE_LABELS,
    ReadingMode,
    ReadingModeTokens,
} from '@/core/theme/readingModes';

const MODES: ReadingMode[] = ['claro', 'sepia', 'oscuro', 'atril', 'eink'];
const FONT_MIN = 20;
const FONT_MAX = 40;
const DURATIONS = [20, 25, 30, 35, 40, 45];

interface Props {
    visible: boolean;
    onClose: () => void;
    tokens: ReadingModeTokens;
    readingMode: ReadingMode;
    setReadingMode: (mode: ReadingMode) => void;
    fontSize: number;
    setFontSize: (size: number) => void;
    senseLines: boolean;
    setSenseLines: (on: boolean) => void;
    targetMinutes: number;
    onPickDuration: (minutes: number) => void;
}

/**
 * Hoja de ajustes del púlpito: modo de luz, cuerpo, corte de línea y duración
 * objetivo. Vive aparte porque la pantalla ya carga timer, navegación por
 * secciones, citas, resaltado y aparato de estudio.
 */
export function PreachSettingsSheet({
    visible,
    onClose,
    tokens,
    readingMode,
    setReadingMode,
    fontSize,
    setFontSize,
    senseLines,
    setSenseLines,
    targetMinutes,
    onPickDuration,
}: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    return (
        <Modal visible={visible} transparent animationType={tokens.animations ? 'slide' : 'none'}>
                <Pressable className="flex-1 bg-black/40" onPress={onClose}>
                    <View
                        className="mt-auto rounded-t-2xl px-6 pt-5"
                        style={{ backgroundColor: tokens.surface, paddingBottom: insets.bottom + 20 }}
                    >
                        <Text style={{ color: tokens.textSecondary }} className="font-lexend-semibold text-xs uppercase tracking-widest mb-2">
                            {t('preach:light_mode')}
                        </Text>
                        <View className="flex-row flex-wrap mb-5">
                            {MODES.map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => setReadingMode(m)}
                                    className="px-4 py-2 rounded-full mr-2 mb-2"
                                    style={{
                                        backgroundColor: m === readingMode ? tokens.accent : 'transparent',
                                        borderWidth: 1,
                                        borderColor: m === readingMode ? tokens.accent : tokens.border,
                                    }}
                                >
                                    <Text
                                        style={{ color: m === readingMode ? tokens.background : tokens.textPrimary }}
                                        className="font-lexend text-sm"
                                    >
                                        {READING_MODE_LABELS[m]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={{ color: tokens.textSecondary }} className="font-lexend-semibold text-xs uppercase tracking-widest mb-2">
                            {t('preach:text_size')}
                        </Text>
                        <View className="flex-row items-center mb-5">
                            <TouchableOpacity
                                onPress={() => setFontSize(Math.max(FONT_MIN, fontSize - 2))}
                                className="px-4 py-2 rounded-lg"
                                style={{ borderWidth: 1, borderColor: tokens.border }}
                            >
                                <MaterialIcons name="remove" size={20} color={tokens.textPrimary} />
                            </TouchableOpacity>
                            <Text style={{ color: tokens.textPrimary }} className="font-lexend mx-4">
                                {fontSize}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setFontSize(Math.min(FONT_MAX, fontSize + 2))}
                                className="px-4 py-2 rounded-lg"
                                style={{ borderWidth: 1, borderColor: tokens.border }}
                            >
                                <MaterialIcons name="add" size={20} color={tokens.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: tokens.textSecondary }} className="font-lexend-semibold text-xs uppercase tracking-widest mb-2">
                            {t('preach:line_breaks')}
                        </Text>
                        <View className="flex-row flex-wrap mb-5">
                            {[false, true].map((on) => (
                                <TouchableOpacity
                                    key={String(on)}
                                    onPress={() => setSenseLines(on)}
                                    accessibilityRole="button"
                                    accessibilityLabel={t(on ? 'preach:sense_lines' : 'preach:running_text')}
                                    className="px-4 py-2 rounded-full mr-2 mb-2"
                                    style={{
                                        backgroundColor: on === senseLines ? tokens.accent : 'transparent',
                                        borderWidth: 1,
                                        borderColor: on === senseLines ? tokens.accent : tokens.border,
                                    }}
                                >
                                    <Text
                                        style={{ color: on === senseLines ? tokens.background : tokens.textPrimary }}
                                        className="font-lexend text-sm"
                                    >
                                        {t(on ? 'preach:sense_lines' : 'preach:running_text')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={{ color: tokens.textSecondary }} className="font-lexend-semibold text-xs uppercase tracking-widest mb-2">
                            {t('preach:target_duration')}
                        </Text>
                        <View className="flex-row flex-wrap">
                            {DURATIONS.map((min) => (
                                <TouchableOpacity
                                    key={min}
                                    onPress={() => onPickDuration(min)}
                                    className="px-4 py-2 rounded-full mr-2 mb-2"
                                    style={{
                                        backgroundColor: min === targetMinutes ? tokens.accent : 'transparent',
                                        borderWidth: 1,
                                        borderColor: min === targetMinutes ? tokens.accent : tokens.border,
                                    }}
                                >
                                    <Text
                                        style={{ color: min === targetMinutes ? tokens.background : tokens.textPrimary }}
                                        className="font-lexend text-sm"
                                    >
                                        {min}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Pressable>
            </Modal>
    );
}
