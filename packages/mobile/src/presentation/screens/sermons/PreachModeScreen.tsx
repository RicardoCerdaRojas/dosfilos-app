import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import type { CitationManifestEntry, ReadingBlock } from '@dosfilos/domain';
import {
    aggregateRequiredAttributions,
    buildMovementBudgets,
    buildReadingBlocks,
} from '@dosfilos/domain';

import { useSermon } from '@/presentation/hooks/useSermons';
import { usePreachHighlights } from '@/presentation/hooks/usePreachHighlights';
import { extractSectionsWithBody } from '@/core/utils/sermonSections';
import { READING_MODES } from '@/core/theme/readingModes';
import { GAZE_LINE_RATIO, TYPE_SCALE } from '@/core/theme/typography';
import { useReaderSettingsStore } from '@/presentation/state/readerSettings.store';
import { PreachSectionBody } from '@/presentation/components/preach/PreachSectionBody';
import { useDeliveryMeasure } from '@/presentation/hooks/useDeliveryMeasure';
import { HighlightPalette } from '@/presentation/components/preach/HighlightPalette';
import { PreachSettingsSheet } from '@/presentation/components/preach/PreachSettingsSheet';
import { PreachInstrumentPanel } from '@/presentation/components/preach/PreachInstrumentPanel';
import { usePagination } from '@/presentation/hooks/usePagination';

interface PreachModeScreenProps {
    /** Id inyectado: lo usa la vista previa de dev, que no llega por ruta. */
    sermonId?: string;
    /** Movimiento inicial: la vista previa de dev abre en el que se revisa. */
    initialSectionIndex?: number;
}

export default function PreachModeScreen({
    sermonId,
    initialSectionIndex = 0,
}: PreachModeScreenProps = {}) {
    const params = useLocalSearchParams<{ id: string }>();
    const id = sermonId ?? params.id;
    const router = useRouter();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { width, height: screenHeight } = useWindowDimensions();
    const { data: sermon, isLoading } = useSermon(id ?? '');

    const readingMode = useReaderSettingsStore((s) => s.readingMode);
    const setReadingMode = useReaderSettingsStore((s) => s.setReadingMode);
    const fontSize = useReaderSettingsStore((s) => s.deliveryFontSize);
    const setFontSize = useReaderSettingsStore((s) => s.setDeliveryFontSize);
    const senseLines = useReaderSettingsStore((s) => s.senseLines);
    const setSenseLines = useReaderSettingsStore((s) => s.setSenseLines);
    const gazeLine = useReaderSettingsStore((s) => s.gazeLine);
    const setGazeLine = useReaderSettingsStore((s) => s.setGazeLine);
    const budgetOverrides = useReaderSettingsStore((s) => s.budgetOverrides);
    const setBudgetOverride = useReaderSettingsStore((s) => s.setBudgetOverride);
    const tokens = READING_MODES[readingMode];

    // El púlpito nunca se apaga a mitad de sermón. En modo atril es
    // incondicional por diseño; en el resto vale mientras dure la pantalla.
    useKeepAwake();

    const [sectionIndex, setSectionIndex] = useState(initialSectionIndex);
    /** Página dentro del movimiento. La unidad de avance bajo el pulgar (D7). */
    const [pageIndex, setPageIndex] = useState(0);
    const [chromeVisible, setChromeVisible] = useState(true);
    const [blackout, setBlackout] = useState(false);
    const [showSections, setShowSections] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [citation, setCitation] = useState<{ ordinal: number; entry: CitationManifestEntry }[] | null>(
        null,
    );
    /** Cita de bloque abierta desde su marca al margen (P5). */
    const [apparatus, setApparatus] = useState<string | null>(null);

    const [targetMinutes, setTargetMinutes] = useState(30);
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const lastTapRef = useRef(0);

    useEffect(() => {
        if (!running) return;
        const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(timer);
    }, [running]);

    const sections = sermon?.content ? extractSectionsWithBody(sermon.content) : [];
    const section = sections[sectionIndex];
    const manifest = sermon?.citationManifest;
    const attributions = aggregateRequiredAttributions(manifest);

    const blocks = section ? buildReadingBlocks(section.body) : [];

    // La caja de medida abarca TODO lo que se lee — título, título de
    // movimiento, cuerpo y atribuciones. Cuando sólo la usaba el cuerpo, los
    // títulos quedaban pegados al borde y el bloque se veía desalineado.
    const { measure, probe } = useDeliveryMeasure(fontSize);

    // El presupuesto de tiempo por movimiento alimenta el riel (D2). Por
    // defecto se reparte proporcional a las palabras; lo que el pastor fija a
    // mano se respeta y el resto se reacomoda, así que ajustar uno no
    // descuadra el total. F3 lo reemplazará con tiempos reales del ensayo.
    const budgets = buildMovementBudgets(
        sections.map((sec) => ({ slug: sec.slug, title: sec.title || t('preach:opening'), body: sec.body })),
        targetMinutes * 60,
        Object.fromEntries(
            sections
                .map((sec) => [sec.slug, budgetOverrides[`${id}|${sec.slug}`]] as const)
                .filter(([, value]) => typeof value === 'number'),
        ),
    );

    // P7 — el tercio inferior no se llena de prosa: leerlo obliga a bajar el
    // mentón y la cara sale de la congregación. Ahí va el tablero.
    const chromeTop = chromeVisible ? insets.top + 44 : insets.top + 16;
    const readableHeight = screenHeight - chromeTop - insets.bottom;
    const panelHeight = Math.round(readableHeight / 3);
    const pageHeight = readableHeight - panelHeight - fontSize * 2;

    const renderBlockForMeasure = (block: ReadingBlock, index: number) => (
        <PreachSectionBody
            blocks={[block]}
            highlights={[]}
            fontSize={fontSize}
            tokens={tokens}
            senseLines={senseLines}
            onTapAt={() => undefined}
            onLongPressUnit={() => undefined}
            onPressCitation={() => undefined}
            onPressApparatus={() => undefined}
        />
    );

    const { pages, measuring, probe: pageProbe } = usePagination({
        blocks,
        availableHeight: pageHeight,
        renderBlock: renderBlockForMeasure,
        layoutKey: `${section?.slug ?? ''}|${fontSize}|${senseLines}|${measure ?? 0}`,
    });

    const safePageIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
    const pageBlocks = pages.length
        ? pages[safePageIndex].map((i) => blocks[i])
        : blocks;

    // El resaltado por tap largo vive en su propio hook: la pantalla ya
    // carga timer, modos de luz, navegación por secciones y citas.
    // El pulso se apaga solo en e-ink: los lectores BOOX no tienen motor
    // háptico. Atril apaga animaciones pero conserva el pulso.
    const highlighting = usePreachHighlights(id ?? '', section, blocks, readingMode !== 'eink');

    const goTo = (index: number) => {
        if (index < 0 || index >= sections.length) return;
        setSectionIndex(index);
        setPageIndex(0);
        scrollRef.current?.scrollTo({ y: 0, animated: tokens.animations });
    };

    /**
     * El avance es POR PÁGINA, no por movimiento. Al llegar al borde salta al
     * movimiento vecino: para el predicador el sermón es continuo, la división
     * en movimientos sirve para ubicarse, no para tener que navegarla.
     */
    const step = (delta: number) => {
        const next = safePageIndex + delta;
        if (next >= 0 && next < pages.length) {
            setPageIndex(next);
            scrollRef.current?.scrollTo({ y: 0, animated: tokens.animations });
            return;
        }
        if (delta > 0 && sectionIndex < sections.length - 1) {
            goTo(sectionIndex + 1);
        } else if (delta < 0 && sectionIndex > 0) {
            // Al retroceder de movimiento se entra por su ÚLTIMA página, que
            // es donde estabas leyendo cuando avanzaste.
            setSectionIndex(sectionIndex - 1);
            setPageIndex(Number.MAX_SAFE_INTEGER);
            scrollRef.current?.scrollTo({ y: 0, animated: tokens.animations });
        }
    };

    // Zonas de tap: ⅓ izquierda retrocede, ⅓ derecha avanza, centro
    // muestra/oculta controles. Doble tap con dos dedos → blackout.
    // `x` es SIEMPRE absoluto de pantalla (pageX): el cuerpo del sermón
    // reenvía sus taps desde adentro y su locationX sería relativo.
    const handleTap = (x: number) => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            lastTapRef.current = 0;
            setBlackout(true);
            return;
        }
        lastTapRef.current = now;
        if (x < width / 3) step(-1);
        else if (x > (width * 2) / 3) step(1);
        else setChromeVisible((v) => !v);
    };

    const openCitation = (ordinals: number[]) => {
        if (!manifest) return;
        const resolved = ordinals
            .map((n) => ({ ordinal: n, entry: manifest.entries[n - 1] }))
            .filter((p): p is { ordinal: number; entry: CitationManifestEntry } => Boolean(p.entry));
        if (resolved.length) setCitation(resolved);
    };

    if (isLoading || !sermon) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: tokens.background }}>
                <ActivityIndicator color={tokens.accent} />
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: tokens.background }}>
            <StatusBar style={tokens.statusBarStyle} hidden={!chromeVisible} />

            {chromeVisible && (
                <View
                    className="flex-row items-center justify-between px-5 pb-2"
                    style={{ paddingTop: insets.top + 6, borderBottomWidth: 1, borderBottomColor: tokens.border }}
                >
                    <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
                        <MaterialIcons name="close" size={22} color={tokens.textSecondary} />
                    </TouchableOpacity>

                    <View className="flex-row items-center">
                        {/* El timer vive abajo, en el tablero (P7). Acá queda
                            sólo arrancarlo y pararlo. */}
                        <TouchableOpacity onPress={() => setRunning((r) => !r)} className="mr-5">
                            <MaterialIcons
                                name={running ? 'pause' : 'play-arrow'}
                                size={26}
                                color={running ? tokens.accent : tokens.textSecondary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowSections(true)} className="mr-4">
                            <MaterialIcons name="format-list-numbered" size={22} color={tokens.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowSettings(true)}>
                            <MaterialIcons name="tune" size={22} color={tokens.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <Pressable className="flex-1" onPress={(e) => handleTap(e.nativeEvent.pageX)}>
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={{
                        // Sin medida en píxeles: PreachSectionBody se centra a
                        // sí mismo en 48 ch (D1). Esto es solo respiro mínimo.
                        paddingHorizontal: 24,
                        paddingTop: chromeVisible ? 16 : insets.top + 24,
                        paddingBottom: insets.bottom + 56,
                    }}
                >
                    {probe}
                    <View
                        style={{
                            width: measure,
                            alignSelf: 'center',
                            // Sin esto, mientras se miden las alturas se ve el
                            // movimiento entero de un flash antes de paginar.
                            opacity: measure && !measuring ? 1 : 0,
                        }}
                    >
                        {pageProbe}
                        {/* Guía de mirada al 66 % de la medida: se lee de
                            corrido hasta acá y el resto se dice mirando a la
                            gente. Sólo tiene sentido con la medida clavada. */}
                        {gazeLine && measure ? (
                            <View
                                pointerEvents="none"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: measure * GAZE_LINE_RATIO,
                                    width: 1,
                                    backgroundColor: tokens.accent,
                                    opacity: 0.35,
                                }}
                            />
                        ) : null}
                        {sectionIndex === 0 && safePageIndex === 0 && (
                            <Text
                                style={{
                                    color: tokens.textPrimary,
                                    fontSize: Math.min(fontSize * 1.4, 46),
                                    marginBottom: fontSize * 0.8,
                                }}
                                className="font-lexend-bold leading-tight"
                            >
                                {sermon.title}
                            </Text>
                        )}
                        {section?.title && safePageIndex === 0 ? (
                            // Ubica, no compite: 0.6× en versalitas y color
                            // secundario. A 1.15× le disputaba la pantalla al
                            // título del sermón.
                            <Text
                                style={{
                                    color: tokens.textSecondary,
                                    fontSize: fontSize * TYPE_SCALE.movementTitle,
                                    marginBottom: fontSize * 0.5,
                                }}
                                className="font-lexend-semibold uppercase tracking-widest"
                            >
                                {section.title}
                            </Text>
                        ) : null}

                    <PreachSectionBody
                        blocks={pageBlocks}
                        highlights={highlighting.highlights}
                        fontSize={fontSize}
                        tokens={tokens}
                        senseLines={senseLines}
                        onTapAt={handleTap}
                        onPressApparatus={setApparatus}
                        onLongPressUnit={highlighting.openPalette}
                        onPressCitation={openCitation}
                    />

                    {sectionIndex === sections.length - 1 &&
                        safePageIndex === Math.max(0, pages.length - 1) &&
                        attributions.length > 0 && (
                        <View style={{ borderTopWidth: 1, borderTopColor: tokens.border }} className="mt-8 pt-4">
                            {attributions.map((block) => (
                                <View key={block.sourceId} className="mb-3">
                                    <Text
                                        style={{ color: tokens.textSecondary, fontSize: fontSize * 0.6 }}
                                        className="font-lexend-semibold"
                                    >
                                        {block.title}
                                    </Text>
                                    {block.lines.map((line, i) => (
                                        <Text
                                            key={i}
                                            style={{ color: tokens.textSecondary, fontSize: fontSize * 0.55 }}
                                            className="font-lexend"
                                        >
                                            {line}
                                        </Text>
                                    ))}
                                </View>
                            ))}
                        </View>
                    )}
                    </View>
                </ScrollView>
            </Pressable>

            {/* P7 — el tercio inferior es el tablero: timer y riel, los dos
                datos que se consultan de reojo desde el atril. */}
            {budgets.length > 0 && (
                <View style={{ paddingBottom: insets.bottom }}>
                    <PreachInstrumentPanel
                        tokens={tokens}
                        fontSize={fontSize}
                        budgets={budgets}
                        elapsedSeconds={elapsed}
                        readingIndex={sectionIndex}
                        pageIndex={safePageIndex}
                        pageCount={Math.max(1, pages.length)}
                        height={panelHeight}
                    />
                </View>
            )}

            {/* Riel de secciones */}
            <Modal visible={showSections} transparent animationType={tokens.animations ? 'slide' : 'none'}>
                <Pressable className="flex-1 bg-black/40" onPress={() => setShowSections(false)}>
                    <View
                        className="mt-auto rounded-t-2xl px-6 pt-5"
                        style={{ backgroundColor: tokens.surface, paddingBottom: insets.bottom + 20, maxHeight: '70%' }}
                    >
                        <Text style={{ color: tokens.textPrimary }} className="font-lexend-semibold text-lg mb-3">
                            {t('preach:sections')}
                        </Text>
                        <ScrollView>
                            {sections.map((s, i) => (
                                <TouchableOpacity
                                    key={s.slug}
                                    onPress={() => {
                                        goTo(i);
                                        setShowSections(false);
                                    }}
                                    className="py-3"
                                >
                                    <Text
                                        style={{ color: i === sectionIndex ? tokens.accent : tokens.textPrimary }}
                                        className="font-lexend text-base"
                                    >
                                        {s.title || t('preach:opening')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            {/* Ajustes: modo de luz, tipografía, corte de línea, duración */}
            <PreachSettingsSheet
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                tokens={tokens}
                readingMode={readingMode}
                setReadingMode={setReadingMode}
                fontSize={fontSize}
                setFontSize={setFontSize}
                senseLines={senseLines}
                setSenseLines={setSenseLines}
                gazeLine={gazeLine}
                setGazeLine={setGazeLine}
                targetMinutes={targetMinutes}
                onPickDuration={(min) => {
                    setTargetMinutes(min);
                    setElapsed(0);
                }}
                budgets={budgets}
                onSetBudget={(slug, seconds) => setBudgetOverride(`${id}|${slug}`, seconds)}
            />

            {/* Popover de cita [N] — primer cliente del citationManifest */}
            <Modal visible={citation !== null} transparent animationType={tokens.animations ? 'fade' : 'none'}>
                <Pressable className="flex-1 bg-black/50 items-center justify-center px-8" onPress={() => setCitation(null)}>
                    <View className="rounded-2xl p-6 w-full max-w-2xl" style={{ backgroundColor: tokens.surface }}>
                        {(citation ?? []).map(({ ordinal, entry }) => (
                            <View key={ordinal} className="mb-4">
                                <Text style={{ color: tokens.accent }} className="font-lexend-semibold text-sm mb-1">
                                    [{ordinal}] {entry.title}
                                </Text>
                                {entry.author ? (
                                    <Text style={{ color: tokens.textSecondary }} className="font-lexend text-xs mb-1">
                                        {entry.author}
                                        {entry.page ? ` · ${t('preach:page')} ${entry.page}` : ''}
                                    </Text>
                                ) : null}
                                <Text style={{ color: tokens.textPrimary }} className="font-lexend text-base leading-6">
                                    “{entry.excerpt}”
                                </Text>
                            </View>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            {/* Aparato de estudio: fuera del flujo de entrega, en capa (P5) */}
            <Modal visible={apparatus !== null} transparent animationType={tokens.animations ? 'fade' : 'none'}>
                <Pressable
                    className="flex-1 bg-black/50 items-center justify-center px-8"
                    onPress={() => setApparatus(null)}
                >
                    <View
                        className="rounded-2xl p-6 w-full max-w-2xl"
                        style={{ backgroundColor: tokens.surface, maxHeight: '70%' }}
                    >
                        <ScrollView>
                            <Text
                                style={{ color: tokens.textPrimary, fontSize: fontSize * 0.7 }}
                                className="font-lexend leading-6"
                            >
                                {apparatus}
                            </Text>
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            {/* Resaltado por tap largo: color y alcance (frase o párrafo) */}
            <HighlightPalette
                visible={highlighting.paletteOpen}
                tokens={tokens}
                scope={highlighting.scope}
                onChangeScope={highlighting.setScope}
                currentColor={highlighting.pendingColor}
                onPick={highlighting.applyColor}
                onRemove={highlighting.removeHighlight}
                onClose={highlighting.closePalette}
            />

            {/* Blackout: pantalla negra total; un tap la retira */}
            {blackout && (
                <Pressable
                    onPress={() => setBlackout(false)}
                    className="absolute inset-0"
                    style={{ backgroundColor: '#000000' }}
                />
            )}
        </View>
    );
}
