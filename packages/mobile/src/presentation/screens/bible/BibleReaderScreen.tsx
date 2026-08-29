import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { HIGHLIGHT_COLORS } from '@dosfilos/domain';
import type { HighlightColor, MarkStyle } from '@dosfilos/domain';

import { READING_MODES } from '@/core/theme/readingModes';
import { FACE_CLASS } from '@/core/theme/typography';
import { useReaderSettingsStore } from '@/presentation/state/readerSettings.store';
import { useBibleMarks, useBibleMarkMutations } from '@/presentation/hooks/useBibleMarks';
import { useDeliveryMeasure } from '@/presentation/hooks/useDeliveryMeasure';
import { SelectableVerses } from '@/presentation/components/bible/SelectableVerses';
import { formatPassageForSermon } from '@/presentation/components/bible/passageFormat';
import { BiblePickerSheet } from '@/presentation/components/bible/BiblePickerSheet';
import { BibleSearchSheet } from '@/presentation/components/bible/BibleSearchSheet';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';

/**
 * El lector — la PUERTA 1 de la Biblia: cuando el pastor va a leer.
 *
 * Reemplaza a las cuatro pantallas anteriores (biblioteca → versión → lector →
 * búsqueda). Elegir versión y elegir libro no son destinos: son controles. La
 * ceremonia sobraba, la función no — por eso todo sigue estando, a un toque.
 *
 * Hereda del púlpito la tipografía, la medida en caracteres y los cinco modos
 * de luz. No es prolijidad: el ojo del pastor no debería cambiar de registro
 * entre el sermón y el pasaje que lo sostiene.
 */
export default function BibleReaderScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const readingMode = useReaderSettingsStore((s) => s.readingMode);
    const face = useReaderSettingsStore((s) => s.deliveryFace);
    const fontSize = useReaderSettingsStore((s) => s.deliveryFontSize);
    const tokens = READING_MODES[readingMode];

    // Retoma donde quedó: el estado inicial sale de lo guardado.
    const lastRead = useReaderSettingsStore((s) => s.lastRead);
    const setLastRead = useReaderSettingsStore((s) => s.setLastRead);
    const [versionId, setVersionId] = useState(lastRead?.versionId ?? 'rvr1960');
    const [parallelId, setParallelId] = useState<string | null>(null);
    // `jn` es Jonás EN ESTE juego de datos (Juan es `jo`). El id se escribe
    // acá y no se adivina: los ids del dato no son los del dominio.
    const [bookId, setBookId] = useState(lastRead?.bookId ?? 'jn');
    const [chapter, setChapter] = useState(lastRead?.chapter ?? 1);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [showPicker, setShowPicker] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    const { data: marks } = useBibleMarks();
    const { set: setMark, clear: clearMark } = useBibleMarkMutations();
    const { measure, probe } = useDeliveryMeasure(fontSize);

    const repo = BibleVersionFactory.getByVersion(versionId);
    const parallelRepo = parallelId ? BibleVersionFactory.getByVersion(parallelId) : null;

    const books = repo?.getBooks() ?? [];
    const book = books.find((b) => b.id === bookId) ?? books[0];
    const verses = repo?.getChapterContent(bookId, chapter) ?? [];
    const parallelVerses = parallelRepo?.getChapterContent(bookId, chapter) ?? [];
    const chapterCount = repo?.getChapterCount(bookId) ?? 1;

    const toggleVerse = (verse: number) =>
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(verse)) next.delete(verse);
            else next.add(verse);
            return next;
        });

    /** Rango arrastrado: reemplaza la selección, hacia adelante o hacia atrás. */
    const selectRange = (from: number, to: number) =>
        setSelected(
            new Set(
                Array.from(
                    { length: Math.abs(to - from) + 1 },
                    (_, i) => Math.min(from, to) + i,
                ),
            ),
        );

    const selectedList = [...selected].sort((a, b) => a - b);

    const applyMark = (color: HighlightColor, style: MarkStyle) => {
        setMark.mutate({ versionId, bookId, chapter, verses: selectedList, color, style });
        setSelected(new Set());
    };

    const copyToSermon = () => {
        const picked = selectedList.map((verse) => ({ verse, text: verses[verse - 1] ?? '' }));
        const markdown = formatPassageForSermon(book?.name ?? bookId, chapter, picked);
        setSelected(new Set());
        // El pasaje viaja por parámetro: el editor lo recibe y lo inserta donde
        // esté el cursor. Copiar al portapapeles obligaría a pegar a mano.
        router.push(`/sermon/paste?markdown=${encodeURIComponent(markdown)}`);
    };

    // Se anota después de pintar, no durante el render: escribir en un store
    // mientras React renderiza puede reentrar en el mismo árbol.
    useEffect(() => {
        setLastRead({ versionId, bookId, chapter });
    }, [versionId, bookId, chapter, setLastRead]);

    const goChapter = (delta: number) => {
        const next = chapter + delta;
        if (next >= 1 && next <= chapterCount) {
            setChapter(next);
            setSelected(new Set());
        }
    };

    return (
        <View className="flex-1" style={{ backgroundColor: tokens.background }}>
            {/* Cabecera: libro y capítulo abren el selector; la versión es un
                interruptor, no una pantalla previa. */}
            <View
                className="flex-row items-center px-5 pb-3"
                style={{
                    paddingTop: insets.top + 8,
                    borderBottomWidth: 1,
                    borderBottomColor: tokens.border,
                }}
            >
                <TouchableOpacity
                    onPress={() => setShowPicker(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('bible:pick_passage')}
                    className="flex-row items-center"
                >
                    <Text
                        style={{ color: tokens.textPrimary }}
                        className={`${FACE_CLASS[face].semibold} text-xl`}
                    >
                        {book?.name ?? ''} {chapter}
                    </Text>
                    <MaterialIcons name="expand-more" size={22} color={tokens.textSecondary} />
                </TouchableOpacity>

                <View className="flex-1" />

                <TouchableOpacity
                    onPress={() => setParallelId(parallelId ? null : versionId === 'rvr1960' ? 'asv' : 'rvr1960')}
                    accessibilityRole="button"
                    accessibilityLabel={t('bible:parallel')}
                    className="mr-4"
                >
                    <MaterialIcons
                        name="vertical-split"
                        size={22}
                        color={parallelId ? tokens.accent : tokens.textSecondary}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setShowSearch(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('bible:search')}
                >
                    <MaterialIcons name="search" size={22} color={tokens.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 120 }}>
                {probe}
                <View style={{ alignSelf: 'center', width: '100%', maxWidth: measure ? measure * (parallelId ? 2.1 : 1) : undefined }}>
                    <View className={parallelId ? 'flex-row' : undefined}>
                        <View style={{ flex: 1, marginRight: parallelId ? 24 : 0 }}>
                            <SelectableVerses
                                bookId={bookId}
                                chapter={chapter}
                                verses={verses}
                                marks={marks ?? new Map()}
                                tokens={tokens}
                                face={face}
                                fontSize={fontSize}
                                selected={selected}
                                onToggleVerse={toggleVerse}
                                onSelectRange={selectRange}
                            />
                        </View>
                        {parallelId ? (
                            <View style={{ flex: 1 }}>
                                <SelectableVerses
                                    bookId={bookId}
                                    chapter={chapter}
                                    verses={parallelVerses}
                                    marks={new Map()}
                                    tokens={tokens}
                                    face={face}
                                    fontSize={fontSize}
                                    selected={selected}
                                    onToggleVerse={toggleVerse}
                                    onSelectRange={selectRange}
                                />
                            </View>
                        ) : null}
                    </View>

                    <View className="flex-row justify-between mt-10">
                        <TouchableOpacity
                            onPress={() => goChapter(-1)}
                            disabled={chapter <= 1}
                            accessibilityRole="button"
                            accessibilityLabel={t('bible:previous_chapter')}
                            style={{ opacity: chapter <= 1 ? 0.3 : 1 }}
                        >
                            <MaterialIcons name="chevron-left" size={30} color={tokens.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => goChapter(1)}
                            disabled={chapter >= chapterCount}
                            accessibilityRole="button"
                            accessibilityLabel={t('bible:next_chapter')}
                            style={{ opacity: chapter >= chapterCount ? 0.3 : 1 }}
                        >
                            <MaterialIcons name="chevron-right" size={30} color={tokens.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Barra de acción: aparece sólo con versículos elegidos. Marcar y
                copiar son las dos cosas que se hacen con un pasaje. */}
            {selectedList.length > 0 ? (
                <View
                    className="absolute left-0 right-0 flex-row items-center px-5 py-3"
                    style={{
                        bottom: 0,
                        paddingBottom: insets.bottom + 12,
                        backgroundColor: tokens.surface,
                        borderTopWidth: 1,
                        borderTopColor: tokens.border,
                    }}
                >
                    {HIGHLIGHT_COLORS.map((color) => (
                        <TouchableOpacity
                            key={color}
                            onPress={() => applyMark(color, 'highlight')}
                            accessibilityRole="button"
                            accessibilityLabel={t(`preach:color_${color}`)}
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                marginRight: 8,
                                backgroundColor: tokens.highlightColors[color],
                                borderWidth: 1,
                                borderColor: tokens.border,
                            }}
                        />
                    ))}
                    <TouchableOpacity
                        onPress={() => applyMark('yellow', 'underline')}
                        accessibilityRole="button"
                        accessibilityLabel={t('preach:style_underline')}
                        className="ml-1 mr-1"
                    >
                        <MaterialIcons name="format-underlined" size={22} color={tokens.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            clearMark.mutate({ bookId, chapter, verses: selectedList });
                            setSelected(new Set());
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('preach:remove_highlight')}
                    >
                        <MaterialIcons name="format-clear" size={22} color={tokens.textSecondary} />
                    </TouchableOpacity>

                    <View className="flex-1" />

                    <TouchableOpacity
                        onPress={copyToSermon}
                        accessibilityRole="button"
                        accessibilityLabel={t('bible:to_sermon')}
                        className="flex-row items-center px-4 py-2 rounded-full"
                        style={{ backgroundColor: tokens.accent }}
                    >
                        <MaterialIcons name="post-add" size={18} color={tokens.background} />
                        <Text
                            style={{ color: tokens.background }}
                            className={`${FACE_CLASS[face].semibold} text-sm ml-2`}
                        >
                            {t('bible:to_sermon')}
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            <BiblePickerSheet
                visible={showPicker}
                tokens={tokens}
                face={face}
                books={books}
                bookId={bookId}
                chapter={chapter}
                versionId={versionId}
                onPick={(nextBook, nextChapter) => {
                    setBookId(nextBook);
                    setChapter(nextChapter);
                    setSelected(new Set());
                    setShowPicker(false);
                }}
                onPickVersion={setVersionId}
                onClose={() => setShowPicker(false)}
            />

            <BibleSearchSheet
                visible={showSearch}
                tokens={tokens}
                face={face}
                versionId={versionId}
                onOpen={(nextBook, nextChapter) => {
                    setBookId(nextBook);
                    setChapter(nextChapter);
                    setShowSearch(false);
                }}
                onClose={() => setShowSearch(false)}
            />
        </View>
    );
}
