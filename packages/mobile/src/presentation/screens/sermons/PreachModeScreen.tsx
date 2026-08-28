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
import type { CitationManifestEntry } from '@dosfilos/domain';
import { aggregateRequiredAttributions, buildReadingBlocks } from '@dosfilos/domain';

import { useSermon } from '@/presentation/hooks/useSermons';
import { usePreachHighlights } from '@/presentation/hooks/usePreachHighlights';
import { extractSectionsWithBody } from '@/core/utils/sermonSections';
import { READING_MODES } from '@/core/theme/readingModes';
import { TYPE_SCALE } from '@/core/theme/typography';
import { useReaderSettingsStore } from '@/presentation/state/readerSettings.store';
import { PreachSectionBody } from '@/presentation/components/preach/PreachSectionBody';
import { HighlightPalette } from '@/presentation/components/preach/HighlightPalette';
import { PreachSettingsSheet } from '@/presentation/components/preach/PreachSettingsSheet';

const formatTime = (totalSeconds: number): string => {
    const abs = Math.abs(totalSeconds);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return `${totalSeconds < 0 ? '-' : ''}${m}:${String(s).padStart(2, '0')}`;
};

export default function PreachModeScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { data: sermon, isLoading } = useSermon(id ?? '');

    const readingMode = useReaderSettingsStore((s) => s.readingMode);
    const setReadingMode = useReaderSettingsStore((s) => s.setReadingMode);
    const fontSize = useReaderSettingsStore((s) => s.fontSize);
    const setFontSize = useReaderSettingsStore((s) => s.setFontSize);
    const senseLines = useReaderSettingsStore((s) => s.senseLines);
    const setSenseLines = useReaderSettingsStore((s) => s.setSenseLines);
    const tokens = READING_MODES[readingMode];

    // El púlpito nunca se apaga a mitad de sermón. En modo atril es
    // incondicional por diseño; en el resto vale mientras dure la pantalla.
    useKeepAwake();

    const [sectionIndex, setSectionIndex] = useState(0);
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

    // El resaltado por tap largo vive en su propio hook: la pantalla ya
    // carga timer, modos de luz, navegación por secciones y citas.
    // El pulso se apaga solo en e-ink: los lectores BOOX no tienen motor
    // háptico. Atril apaga animaciones pero conserva el pulso.
    const highlighting = usePreachHighlights(id ?? '', section, blocks, readingMode !== 'eink');

    const goTo = (index: number) => {
        if (index < 0 || index >= sections.length) return;
        setSectionIndex(index);
        scrollRef.current?.scrollTo({ y: 0, animated: tokens.animations });
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
        if (x < width / 3) goTo(sectionIndex - 1);
        else if (x > (width * 2) / 3) goTo(sectionIndex + 1);
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

    const targetSeconds = targetMinutes * 60;
    const remaining = targetSeconds - elapsed;
    const ratio = elapsed / targetSeconds;
    const timerColor = ratio < 0.8 ? tokens.timerOk : ratio <= 1 ? tokens.timerWarn : tokens.timerOver;

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
                        <TouchableOpacity onPress={() => setRunning((r) => !r)} className="flex-row items-center mr-4">
                            <MaterialIcons
                                name={running ? 'pause' : 'play-arrow'}
                                size={Math.round(fontSize * TYPE_SCALE.timer * 0.8)}
                                color={tokens.textSecondary}
                            />
                            {/* D5: el timer se consulta de reojo desde el
                                atril. Escala con el cuerpo en vez de quedarse
                                en el tamaño más chico de la pantalla. */}
                            <Text
                                style={{
                                    color: timerColor,
                                    fontSize: fontSize * TYPE_SCALE.timer,
                                    marginLeft: 6,
                                    fontVariant: ['tabular-nums'],
                                }}
                                className="font-lexend-semibold"
                            >
                                {formatTime(remaining)}
                            </Text>
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
                    {sectionIndex === 0 && (
                        <Text
                            style={{ color: tokens.textPrimary, fontSize: Math.min(fontSize * 1.4, 46) }}
                            className="font-lexend-bold leading-tight mb-4"
                        >
                            {sermon.title}
                        </Text>
                    )}
                    {section?.title ? (
                        <Text
                            style={{ color: tokens.textPrimary, fontSize: fontSize * 1.15 }}
                            className="font-lexend-semibold mb-4"
                        >
                            {section.title}
                        </Text>
                    ) : null}

                    <PreachSectionBody
                        blocks={blocks}
                        highlights={highlighting.highlights}
                        fontSize={fontSize}
                        tokens={tokens}
                        senseLines={senseLines}
                        onTapAt={handleTap}
                        onPressApparatus={setApparatus}
                        onLongPressUnit={highlighting.openPalette}
                        onPressCitation={openCitation}
                    />

                    {sectionIndex === sections.length - 1 && attributions.length > 0 && (
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
                </ScrollView>
            </Pressable>

            {chromeVisible && sections.length > 0 && (
                <View
                    className="flex-row items-center justify-center pb-2"
                    style={{ paddingBottom: insets.bottom + 8 }}
                >
                    {sections.map((s, i) => (
                        <View
                            key={s.slug}
                            style={{
                                width: i === sectionIndex ? 22 : 7,
                                height: 7,
                                borderRadius: 4,
                                marginHorizontal: 3,
                                backgroundColor: i === sectionIndex ? tokens.accent : tokens.border,
                            }}
                        />
                    ))}
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
                targetMinutes={targetMinutes}
                onPickDuration={(min) => {
                    setTargetMinutes(min);
                    setElapsed(0);
                }}
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
