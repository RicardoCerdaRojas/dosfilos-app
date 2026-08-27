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
import { aggregateRequiredAttributions } from '@dosfilos/domain';

import { useSermon } from '@/presentation/hooks/useSermons';
import {
    extractSectionsWithBody,
    toPlainBlocks,
    tokenizeCitations,
} from '@/core/utils/sermonSections';
import { READING_MODES, READING_MODE_LABELS, ReadingMode } from '@/core/theme/readingModes';
import { useReaderSettingsStore } from '@/presentation/state/readerSettings.store';

const MODES: ReadingMode[] = ['claro', 'sepia', 'oscuro', 'atril', 'eink'];
const FONT_MIN = 20;
const FONT_MAX = 40;

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

    const goTo = (index: number) => {
        if (index < 0 || index >= sections.length) return;
        setSectionIndex(index);
        scrollRef.current?.scrollTo({ y: 0, animated: tokens.animations });
    };

    // Zonas de tap: ⅓ izquierda retrocede, ⅓ derecha avanza, centro
    // muestra/oculta controles. Doble tap con dos dedos → blackout.
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
                                size={20}
                                color={tokens.textSecondary}
                            />
                            <Text
                                style={{ color: timerColor, fontSize: 20, marginLeft: 4 }}
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

            <Pressable className="flex-1" onPress={(e) => handleTap(e.nativeEvent.locationX)}>
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={{
                        paddingHorizontal: 40,
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

                    {section
                        ? toPlainBlocks(section.body).map((block, i) =>
                              block.kind === 'subheading' ? (
                                  <Text
                                      key={i}
                                      style={{ color: tokens.textSecondary, fontSize: fontSize * 0.8 }}
                                      className="font-lexend-semibold uppercase tracking-wide mt-4 mb-2"
                                  >
                                      {block.text}
                                  </Text>
                              ) : (
                                  <Text
                                      key={i}
                                      style={{
                                          color: tokens.textPrimary,
                                          fontSize,
                                          lineHeight: fontSize * 1.6,
                                      }}
                                      className="font-lexend mb-5"
                                  >
                                      {tokenizeCitations(block.text).map((tk, j) =>
                                          tk.kind === 'citation' ? (
                                              <Text
                                                  key={j}
                                                  style={{ color: tokens.accent }}
                                                  onPress={() => openCitation(tk.ordinals)}
                                                  suppressHighlighting
                                              >
                                                  {tk.text}
                                              </Text>
                                          ) : (
                                              <Text key={j}>{tk.text}</Text>
                                          ),
                                      )}
                                  </Text>
                              ),
                          )
                        : null}

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

            {/* Ajustes: modo de luz, tipografía, duración */}
            <Modal visible={showSettings} transparent animationType={tokens.animations ? 'slide' : 'none'}>
                <Pressable className="flex-1 bg-black/40" onPress={() => setShowSettings(false)}>
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
                            {t('preach:target_duration')}
                        </Text>
                        <View className="flex-row flex-wrap">
                            {[20, 25, 30, 35, 40, 45].map((min) => (
                                <TouchableOpacity
                                    key={min}
                                    onPress={() => {
                                        setTargetMinutes(min);
                                        setElapsed(0);
                                    }}
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
