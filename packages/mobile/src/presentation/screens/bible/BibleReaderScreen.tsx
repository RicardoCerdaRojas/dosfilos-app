import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { INK_COLORS } from '@dosfilos/domain';
import type { HighlightColor, MarkStyle } from '@dosfilos/domain';

import { READING_MODES } from '@/core/theme/readingModes';
import { FACE_CLASS } from '@/core/theme/typography';
import { useReaderSettingsStore } from '@/presentation/state/readerSettings.store';
import { useBibleMarks, useBibleMarkMutations } from '@/presentation/hooks/useBibleMarks';
import { verseKey } from '@/domain/bible/entities/BibleMark';
import { useDeliveryMeasure } from '@/presentation/hooks/useDeliveryMeasure';
import {
    SelectableVerses,
    selectionText,
    type WordSelection,
} from '@/presentation/components/bible/SelectableVerses';
import { InkLayer } from '@/presentation/components/preach/InkLayer';
import { MarkPopover } from '@/presentation/components/preach/MarkPopover';
import { useBibleInk } from '@/presentation/hooks/useBibleInk';
import { formatSelectionForSermon } from '@/presentation/components/bible/passageFormat';
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
    const [selection, setSelection] = useState<WordSelection | null>(null);
    const [popoverY, setPopoverY] = useState(0);
    const [showPopover, setShowPopover] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    const { height: screenHeight } = useWindowDimensions();
    /** Alto de la cabecera: la capa de tinta empieza debajo para no taparla. */
    const [headerHeight, setHeaderHeight] = useState(0);
    const { data: marks } = useBibleMarks();
    const { set: setMark, clear: clearMark } = useBibleMarkMutations();
    const { measure, probe } = useDeliveryMeasure(fontSize);
    const fullWidth = useReaderSettingsStore((s) => s.fullWidth);
    const setFullWidth = useReaderSettingsStore((s) => s.setFullWidth);

    /**
     * Firma del layout: al cambiar, los versículos se vuelven a medir.
     *
     * Sin esto la tinta queda a medias, porque `onLayout` sólo dispara para
     * las vistas que efectivamente se movieron. Es exactamente el bug que ya
     * costó dos vueltas en el púlpito.
     */
    const inkLayoutKey = `${bookId}|${chapter}|${fontSize}|${parallelId ?? ''}|${readingMode}|${fullWidth}`;
    const ink = useBibleInk(bookId, chapter, inkLayoutKey);

    const repo = BibleVersionFactory.getByVersion(versionId);
    const parallelRepo = parallelId ? BibleVersionFactory.getByVersion(parallelId) : null;

    const books = repo?.getBooks() ?? [];
    const book = books.find((b) => b.id === bookId) ?? books[0];
    const verses = repo?.getChapterContent(bookId, chapter) ?? [];
    /**
     * El mismo capítulo EN LA OTRA VERSIÓN.
     *
     * El id del libro no cruza de una versión a la otra: `jn` es Jonás en la
     * RVR y no existe en la ASV, que lo numera `32`. Se traduce por el id
     * canónico, que es el único vocabulario común.
     */
    const parallelBookId = parallelRepo
        ? parallelRepo.getBookIdForCanonical(repo.getCanonicalBookId(bookId))
        : null;
    const parallelVerses = parallelBookId
        ? (parallelRepo?.getChapterContent(parallelBookId, chapter) ?? [])
        : [];
    const chapterCount = repo?.getChapterCount(bookId) ?? 1;

    /** Los versículos que toca la selección, con sus extremos de palabra. */
    const selectedRanges = () => {
        if (!selection) return [];
        const ranges = [];
        for (let verse = selection.startVerse; verse <= selection.endVerse; verse += 1) {
            ranges.push({
                verse,
                from: verse === selection.startVerse ? selection.startWord : undefined,
                to: verse === selection.endVerse ? selection.endWord : undefined,
            });
        }
        return ranges;
    };

    const closePopover = () => {
        setShowPopover(false);
        setSelection(null);
    };

    const applyMark = (color: HighlightColor, style: MarkStyle) => {
        setMark.mutate({ versionId, bookId, chapter, ranges: selectedRanges(), color, style });
        closePopover();
    };

    const removeMark = () => {
        clearMark.mutate({
            bookId,
            chapter,
            verses: selectedRanges().map((r) => r.verse),
        });
        closePopover();
    };

    const copyToSermon = () => {
        if (!selection) return;
        // Viaja lo SELECCIONADO, no el versículo entero: si el pastor eligió
        // media frase, es esa media frase la que quiere en el sermón.
        const markdown = formatSelectionForSermon(
            book?.name ?? bookId,
            chapter,
            selection.startVerse,
            selection.endVerse,
            selectionText(verses, selection),
        );
        closePopover();
        // El pasaje viaja por parámetro: el editor lo recibe y lo inserta donde
        // esté el cursor. Copiar al portapapeles obligaría a pegar a mano.
        router.push(`/sermon/paste?markdown=${encodeURIComponent(markdown)}`);
    };

    // Se anota después de pintar, no durante el render: escribir en un store
    // mientras React renderiza puede reentrar en el mismo árbol.
    useEffect(() => {
        setLastRead({ versionId, bookId, chapter });
    }, [versionId, bookId, chapter, setLastRead]);

    /** Marca ya existente bajo la selección, para que el popover la muestre. */
    const currentMark = selection
        ? marks?.get(verseKey(bookId, chapter, selection.startVerse))
        : undefined;

    /**
     * Cambiar de versión conserva el libro.
     *
     * El id no cruza entre versiones, así que sin traducir por el canónico
     * pasar de la RVR a la ASV dejaba un id que la otra no reconoce y el
     * lector volvía a Génesis.
     */
    const changeVersion = (nextVersionId: string) => {
        const next = BibleVersionFactory.getByVersion(nextVersionId);
        const translated = next.getBookIdForCanonical(repo.getCanonicalBookId(bookId));
        setVersionId(nextVersionId);
        if (translated) setBookId(translated);
        if (parallelId === nextVersionId) setParallelId(null);
    };

    const goChapter = (delta: number) => {
        const next = chapter + delta;
        if (next >= 1 && next <= chapterCount) {
            setChapter(next);
            setSelection(null);
        }
    };

    return (
        <View className="flex-1" style={{ backgroundColor: tokens.background }}>
            {/* Cabecera: libro y capítulo abren el selector; la versión es un
                interruptor, no una pantalla previa. */}
            <View
                className="flex-row items-center px-5 pb-3"
                onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
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

                {/* Columna medida o página entera. La columna es lo correcto
                    para leer; el ancho completo sirve para mirar de un vistazo,
                    y en una tablet de 13″ la diferencia se nota. */}
                <TouchableOpacity
                    onPress={() => setFullWidth(!fullWidth)}
                    accessibilityRole="button"
                    accessibilityLabel={t('bible:full_width')}
                    className="mr-4"
                >
                    <MaterialIcons
                        name={fullWidth ? 'format-align-justify' : 'format-align-center'}
                        size={22}
                        color={fullWidth ? tokens.accent : tokens.textSecondary}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setParallelId(parallelId ? null : versionId === 'rvr1960' ? 'asv' : 'rvr1960')}
                    accessibilityRole="button"
                    accessibilityLabel={t('bible:parallel')}
                    className="mr-4"
                >
                    <MaterialIcons
                        name="view-column"
                        size={22}
                        color={parallelId ? tokens.accent : tokens.textSecondary}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setShowSearch(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('bible:search')}
                    className="mr-4"
                >
                    <MaterialIcons name="search" size={22} color={tokens.textSecondary} />
                </TouchableOpacity>

                {/* Lápiz. La Biblia del pastor está escrita al margen: era lo
                    único que el atril sabía hacer y el lector no. */}
                <TouchableOpacity
                    onPress={() => {
                        ink.setPenActive(!ink.penActive);
                        ink.setEraser(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('preach:pen')}
                >
                    <MaterialIcons
                        name={ink.penActive ? 'draw' : 'edit'}
                        size={22}
                        color={ink.penActive ? tokens.accent : tokens.textSecondary}
                    />
                </TouchableOpacity>

                {ink.penActive ? (
                    <>
                        {INK_COLORS.map((color) => (
                            <TouchableOpacity
                                key={color}
                                onPress={() => {
                                    ink.setPenColor(color);
                                    ink.setEraser(false);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={t(`preach:ink_${color}`)}
                                className="ml-3"
                                style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 11,
                                    backgroundColor:
                                        color === 'red'
                                            ? tokens.timerOver
                                            : color === 'blue'
                                              ? tokens.accent
                                              : tokens.textPrimary,
                                    borderWidth: ink.penColor === color && !ink.eraser ? 2 : 0,
                                    borderColor: tokens.background,
                                }}
                            />
                        ))}
                        <TouchableOpacity
                            onPress={() => ink.setEraser(!ink.eraser)}
                            accessibilityRole="button"
                            accessibilityLabel={t('preach:eraser')}
                            className="ml-3"
                        >
                            <MaterialIcons
                                name="auto-fix-normal"
                                size={22}
                                color={ink.eraser ? tokens.accent : tokens.textSecondary}
                            />
                        </TouchableOpacity>
                    </>
                ) : null}
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 120 }}>
                {probe}
                <View
                    style={{
                        alignSelf: 'center',
                        width: '100%',
                        maxWidth: fullWidth
                            ? undefined
                            : measure
                              ? measure * (parallelId ? 2.1 : 1)
                              : undefined,
                    }}
                >
                    <View className={parallelId ? 'flex-row' : undefined}>
                        <View style={{ flex: 1, marginRight: parallelId ? 24 : 0 }}>
                            {parallelId ? (
                                // Sin rótulo, dos columnas de texto parecido no
                                // dicen cuál es cuál.
                                <Text
                                    style={{ color: tokens.textSecondary, marginBottom: 10 }}
                                    className={`${FACE_CLASS[face].semibold} text-xs`}
                                >
                                    {versionId.toUpperCase()}
                                </Text>
                            ) : null}
                            <SelectableVerses
                                bookId={bookId}
                                chapter={chapter}
                                verses={verses}
                                marks={marks ?? new Map()}
                                tokens={tokens}
                                face={face}
                                fontSize={fontSize}
                                selection={selection}
                                onSelectionChange={setSelection}
                                onSelectionEnd={(range, atY) => {
                                    setSelection(range);
                                    setPopoverY(atY);
                                    setShowPopover(true);
                                }}
                                onVerseLayout={ink.rememberVerse}
                                layoutKey={inkLayoutKey}
                            />
                        </View>
                        {parallelId ? (
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{ color: tokens.textSecondary, marginBottom: 10 }}
                                    className={`${FACE_CLASS[face].semibold} text-xs`}
                                >
                                    {parallelId.toUpperCase()}
                                </Text>
                                <SelectableVerses
                                    bookId={parallelBookId ?? bookId}
                                    chapter={chapter}
                                    verses={parallelVerses}
                                    marks={new Map()}
                                    tokens={tokens}
                                    face={face}
                                    fontSize={fontSize}
                                    selection={null}
                                    onSelectionChange={() => undefined}
                                    onSelectionEnd={() => undefined}
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

            {/* La tinta va encima del texto pero debajo de la cabecera: si la
                tapara, no habría cómo apagar el lápiz. */}
            <InkLayer
                tokens={tokens}
                notes={ink.notes}
                anchorRectFor={ink.anchorRectFor}
                bodySize={fontSize}
                penActive={ink.penActive}
                anchorAt={ink.anchorAt}
                onFinishStroke={ink.addStroke}
                color={ink.penColor}
                eraser={ink.eraser}
                onErase={ink.eraseNote}
                top={headerHeight}
                bottom={0}
            />

            {/* Popover contextual, igual que en el púlpito: aparece al lado
                de lo que se eligió. La barra inferior obligaba a mirar al
                otro extremo de la pantalla del que se estaba marcando. */}
            <MarkPopover
                visible={showPopover}
                tokens={tokens}
                anchorY={popoverY}
                screenHeight={screenHeight}
                currentColor={currentMark?.color ?? null}
                currentStyle={currentMark?.style ?? null}
                onPick={applyMark}
                onRemove={removeMark}
                onClose={closePopover}
                extraAction={{
                    icon: 'post-add',
                    label: t('bible:to_sermon'),
                    onPress: copyToSermon,
                }}
            />

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
                    setSelection(null);
                    setShowPicker(false);
                }}
                onPickVersion={changeVersion}
                onClose={() => setShowPicker(false)}
            />

            <BibleSearchSheet
                visible={showSearch}
                tokens={tokens}
                face={face}
                versionId={versionId}
                currentBookId={bookId}
                currentBookName={book?.name ?? ''}
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
