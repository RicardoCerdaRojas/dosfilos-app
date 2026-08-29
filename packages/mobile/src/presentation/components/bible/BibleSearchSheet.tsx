import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReadingModeTokens } from '@/core/theme/readingModes';
import { FACE_CLASS } from '@/core/theme/typography';
import type { DeliveryFace } from '@/core/theme/typography';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';
import { AUTHOR_KEYS, bookIdsForScope, type SearchScope } from '@/domain/bible/utils/BibleScopes';

interface Props {
    visible: boolean;
    tokens: ReadingModeTokens;
    face: DeliveryFace;
    versionId: string;
    /** Libro abierto: es el ámbito más útil y por eso tiene chip propio. */
    currentBookId: string;
    currentBookName: string;
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
export function BibleSearchSheet({
    visible,
    tokens,
    face,
    versionId,
    currentBookId,
    currentBookName,
    onOpen,
    onClose,
}: Props) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [scope, setScope] = useState<SearchScope>({ kind: 'all' });

    const repo = BibleVersionFactory.getByVersion(versionId);
    const scopeIds = repo ? bookIdsForScope(scope, repo.getBooks(), versionId) : null;
    // Sin debounce: la búsqueda es local, sobre memoria. Esperar acá sería
    // fingir una latencia que no existe.
    const results =
        query.trim().length >= 3
            ? (repo?.search(query.trim(), 40, scopeIds ?? undefined) ?? [])
            : [];

    /** Chip de ámbito. El elegido lleva fondo, no sólo color. */
    const chip = (key: string, label: string, active: boolean, onPress: () => void) => (
        <TouchableOpacity
            key={key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className="px-3.5 py-2 rounded-full mr-2"
            style={{
                backgroundColor: active ? tokens.accent : tokens.background,
                borderWidth: 1,
                borderColor: active ? tokens.accent : tokens.border,
            }}
        >
            <Text
                style={{ color: active ? tokens.background : tokens.textSecondary }}
                className={`${FACE_CLASS[face].semibold} text-xs`}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

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

                    {/* Ámbito. Buscar en los 66 libros sirve para recordar una
                        frase; para trabajar hay que poder acotar. */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        className="mt-3"
                        contentContainerStyle={{ paddingVertical: 4 }}
                    >
                        {chip('all', t('bible:scope_all'), scope.kind === 'all', () =>
                            setScope({ kind: 'all' }),
                        )}
                        {chip(
                            'book',
                            currentBookName,
                            scope.kind === 'book',
                            () => setScope({ kind: 'book', bookId: currentBookId }),
                        )}
                        {chip(
                            'old',
                            t('bible:old_testament_full'),
                            scope.kind === 'testament' && scope.value === 'Old',
                            () => setScope({ kind: 'testament', value: 'Old' }),
                        )}
                        {chip(
                            'new',
                            t('bible:new_testament_full'),
                            scope.kind === 'testament' && scope.value === 'New',
                            () => setScope({ kind: 'testament', value: 'New' }),
                        )}
                        {AUTHOR_KEYS.map((author) =>
                            chip(
                                author,
                                t(`bible:author_${author}`),
                                scope.kind === 'author' && scope.value === author,
                                () => setScope({ kind: 'author', value: author }),
                            ),
                        )}
                    </ScrollView>

                    {scope.kind === 'author' ? (
                        // Se dice, no se sobreentiende: varias de estas
                        // atribuciones se discuten, y la interfaz no debería
                        // afirmar lo que el pastor no afirmaría predicando.
                        <Text
                            style={{ color: tokens.textSecondary }}
                            className={`${FACE_CLASS[face].regular} text-xs mt-1`}
                        >
                            {t('bible:author_note')}
                        </Text>
                    ) : null}

                    <ScrollView className="mt-3" keyboardShouldPersistTaps="handled">
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
                                        // `parsed.book` es el NOMBRE del
                                        // libro; arriba se espera el id del
                                        // dato. Sin traducir, abrir un
                                        // resultado caía en Génesis.
                                        parsed &&
                                        onOpen(repo.resolveBookId(parsed.book), parsed.chapter)
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
