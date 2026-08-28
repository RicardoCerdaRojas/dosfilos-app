import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReadingModeTokens } from '@/core/theme/readingModes';
import { FACE_CLASS } from '@/core/theme/typography';
import type { DeliveryFace } from '@/core/theme/typography';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';

interface Props {
    visible: boolean;
    tokens: ReadingModeTokens;
    face: DeliveryFace;
    versionId: string;
    onOpen: (bookId: string, chapter: number) => void;
    onClose: () => void;
}

/**
 * Búsqueda con CONTEXTO, no un índice de referencias.
 *
 * Una lista de "Salmo 23:4 · Jeremías 23:23" obliga a abrir cada una para
 * saber si servía. Acá cada resultado trae el versículo entero: buscar es una
 * forma de leer, no un paso previo a leer.
 */
export function BibleSearchSheet({ visible, tokens, face, versionId, onOpen, onClose }: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');

    const repo = BibleVersionFactory.getByVersion(versionId);
    // Sin debounce: la búsqueda es local, sobre memoria. Esperar acá sería
    // fingir una latencia que no existe.
    const results = query.trim().length >= 3 ? (repo?.search(query.trim(), 40) ?? []) : [];

    return (
        <Modal visible={visible} transparent animationType={tokens.animations ? 'fade' : 'none'}>
            <Pressable className="flex-1 bg-black/40" onPress={onClose}>
                <Pressable
                    className="mt-auto rounded-t-3xl px-6 pt-5"
                    onPress={() => undefined}
                    style={{
                        backgroundColor: tokens.surface,
                        paddingBottom: insets.bottom + 20,
                        height: '80%',
                    }}
                >
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                        placeholder={t('bible:search_placeholder')}
                        placeholderTextColor={tokens.textSecondary}
                        style={{
                            color: tokens.textPrimary,
                            borderColor: tokens.border,
                            borderWidth: 1,
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                        }}
                        className={`${FACE_CLASS[face].regular} text-base`}
                    />

                    <ScrollView className="mt-4" keyboardShouldPersistTaps="handled">
                        {results.length === 0 && query.trim().length >= 3 ? (
                            <Text
                                style={{ color: tokens.textSecondary }}
                                className="font-lexend text-sm mt-4"
                            >
                                {t('bible:no_results')}
                            </Text>
                        ) : null}

                        {results.map((result, index) => {
                            const parsed = repo?.parseReference(result.reference);
                            return (
                                <TouchableOpacity
                                    key={`${result.reference}-${index}`}
                                    onPress={() =>
                                        parsed && onOpen(parsed.book, parsed.chapter)
                                    }
                                    accessibilityRole="button"
                                    accessibilityLabel={result.reference}
                                    className="py-3"
                                    style={{ borderBottomWidth: 1, borderBottomColor: tokens.border }}
                                >
                                    <Text
                                        style={{ color: tokens.accent }}
                                        className={`${FACE_CLASS[face].semibold} text-xs mb-1`}
                                    >
                                        {result.reference}
                                    </Text>
                                    <Text
                                        style={{ color: tokens.textPrimary }}
                                        className={`${FACE_CLASS[face].regular} text-base leading-6`}
                                    >
                                        {result.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
