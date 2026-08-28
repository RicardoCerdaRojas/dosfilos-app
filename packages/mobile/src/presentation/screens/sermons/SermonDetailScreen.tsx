import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { buildReadingBlocks } from '@dosfilos/domain';

import { useSermon } from '@/presentation/hooks/useSermons';
import { useBriefcase, usePrepareBriefcase } from '@/presentation/hooks/useSermonBriefcase';
import { extractSectionsWithBody } from '@/core/utils/sermonSections';
import { READING_MODES } from '@/core/theme/readingModes';
import { useReaderSettingsStore } from '@/presentation/state/readerSettings.store';
import { BibleConsultSheet } from '@/presentation/components/bible/BibleConsultSheet';

export default function SermonDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    const { data: sermon, isLoading, error } = useSermon(id ?? '');
    const readingMode = useReaderSettingsStore((s) => s.readingMode);
    const deliveryFace = useReaderSettingsStore((s) => s.deliveryFace);
    const fontSize = useReaderSettingsStore((s) => s.deliveryFontSize);
    const [showBible, setShowBible] = useState(false);
    const { data: briefcase } = useBriefcase(id ?? '');
    const prepare = usePrepareBriefcase(id ?? '');

    // Sin useMemo: el compilador de React memoiza solo (y la regla de lint
    // rechaza memoización manual que no puede preservar).
    const sections = sermon?.content ? extractSectionsWithBody(sermon.content) : [];

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-background-light dark:bg-background-primary">
                <ActivityIndicator size="large" color="#1754cf" />
            </View>
        );
    }

    if (error || !sermon) {
        return (
            <View className="flex-1 justify-center items-center bg-background-light dark:bg-background-primary px-8">
                <MaterialIcons name="error-outline" size={40} color="#94a3b8" />
                <Text className="text-slate-500 dark:text-slate-400 font-lexend text-center mt-3">
                    {t('sermons:error_loading')}
                </Text>
            </View>
        );
    }

    const publishedDate = sermon.publishedAt
        ? new Date(sermon.publishedAt).toLocaleDateString(i18n.language, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : null;

    return (
        <View className="flex-1 bg-background-light dark:bg-background-primary">
            <View
                className="flex-row items-center px-3 pb-2 bg-background-light dark:bg-background-primary"
                style={{ paddingTop: insets.top + 4 }}
            >
                <TouchableOpacity onPress={() => router.back()} className="p-2 active:opacity-60">
                    <MaterialIcons name="arrow-back" size={24} color="#64748b" />
                </TouchableOpacity>
                <Text
                    className="flex-1 text-base font-lexend-semibold text-slate-900 dark:text-white ml-1"
                    numberOfLines={1}
                >
                    {sermon.title}
                </Text>
                {/* La Biblia al lado del sermón también acá: al preparar se
                    consulta más que al predicar. */}
                <TouchableOpacity
                    onPress={() => setShowBible(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('bible:title')}
                    className="p-2 active:opacity-60"
                >
                    <MaterialIcons name="menu-book" size={22} color="#64748b" />
                </TouchableOpacity>
            </View>

            <BibleConsultSheet
                visible={showBible}
                tokens={READING_MODES[readingMode]}
                face={deliveryFace}
                fontSize={fontSize}
                references={sermon.bibleReferences ?? []}
                onClose={() => setShowBible(false)}
            />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 96 }}
            >
                <Text className="text-3xl font-lexend-bold text-slate-900 dark:text-white mt-4 leading-tight">
                    {sermon.title}
                </Text>
                {sermon.bibleReferences.length > 0 && (
                    <Text className="text-primary font-lexend text-base mt-2">
                        {sermon.bibleReferences.join(' · ')}
                    </Text>
                )}
                {publishedDate && (
                    <Text className="text-xs text-slate-400 font-lexend mt-1">{publishedDate}</Text>
                )}

                {/* M-03 — el maletín. El pastor VE que el sermón está
                    garantizado antes de subir al púlpito; no tiene que
                    confiar en que la caché "probablemente" lo tenga. */}
                <TouchableOpacity
                    onPress={() => prepare.mutate()}
                    disabled={prepare.isPending}
                    accessibilityRole="button"
                    accessibilityLabel={t(briefcase ? 'sermons:ready_offline' : 'sermons:prepare_offline')}
                    className="flex-row items-center mt-4 self-start px-3 py-2 rounded-full border"
                    style={{ borderColor: briefcase ? '#15803d' : '#cbd5e1' }}
                >
                    <MaterialIcons
                        name={
                            prepare.isPending
                                ? 'cloud-download'
                                : briefcase
                                  ? 'offline-pin'
                                  : 'cloud-off'
                        }
                        size={18}
                        color={briefcase ? '#15803d' : '#64748b'}
                    />
                    <Text
                        className="font-lexend text-xs ml-2"
                        style={{ color: briefcase ? '#15803d' : '#64748b' }}
                    >
                        {prepare.isPending
                            ? t('sermons:preparing_offline')
                            : briefcase
                              ? t('sermons:ready_offline')
                              : t('sermons:prepare_offline')}
                    </Text>
                </TouchableOpacity>

                {sections.length === 0 ? (
                    <Text className="text-slate-500 dark:text-slate-400 font-lexend mt-8">
                        {t('sermons:no_content')}
                    </Text>
                ) : (
                    sections.map((section) => (
                        <View key={section.slug} className="mt-7">
                            {section.title ? (
                                <Text className="text-xl font-lexend-semibold text-slate-900 dark:text-white mb-2">
                                    {section.title}
                                </Text>
                            ) : null}
                            {buildReadingBlocks(section.body).map((block, i) =>
                                block.kind === 'subheading' ? (
                                    <Text
                                        key={i}
                                        className="text-sm font-lexend-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-3 mb-2"
                                    >
                                        {block.text}
                                    </Text>
                                ) : block.kind === 'quote' ? (
                                    // El detalle es la vista de ESTUDIO: acá la
                                    // cita del comentario sí va en el flujo. La
                                    // que se colapsa es la del púlpito (P5).
                                    <Text
                                        key={i}
                                        className="text-base leading-7 italic text-slate-600 dark:text-slate-400 border-l-2 border-slate-300 dark:border-slate-600 pl-3 mb-3"
                                    >
                                        {block.text}
                                    </Text>
                                ) : (
                                    <Text
                                        key={i}
                                        className="text-base leading-7 text-slate-700 dark:text-slate-300 mb-3"
                                    >
                                        {block.kind === 'listitem' ? '•  ' : ''}
                                        {block.text}
                                    </Text>
                                ),
                            )}
                        </View>
                    ))
                )}
            </ScrollView>

            <View
                className="absolute left-0 right-0 flex-row items-center justify-center"
                style={{ bottom: insets.bottom + 16 }}
            >
                {/* Editar vive acá, en la vista de estudio — no en el púlpito.
                    Predicando no se corrige: se predica. */}
                <TouchableOpacity
                    onPress={() => router.push(`/sermon/edit/${sermon.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={t('sermons:edit')}
                    className="px-6 py-3.5 rounded-full flex-row items-center mr-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 active:opacity-80"
                >
                    <MaterialIcons name="edit" size={20} className="text-slate-600" />
                    <Text className="font-lexend-semibold ml-2 text-slate-700 dark:text-slate-200">
                        {t('sermons:edit')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push(`/preach/${sermon.id}`)}
                    disabled={sections.length === 0}
                    className="bg-primary px-8 py-3.5 rounded-full flex-row items-center active:opacity-80"
                    style={{ opacity: sections.length === 0 ? 0.4 : 1 }}
                >
                    <MaterialIcons name="record-voice-over" size={20} color="#ffffff" />
                    <Text className="text-white font-lexend-semibold ml-2">
                        {t('sermons:enter_preach_mode')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
