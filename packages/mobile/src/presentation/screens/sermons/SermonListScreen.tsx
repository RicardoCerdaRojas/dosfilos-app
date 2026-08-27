import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    SectionList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { usePublishedSermons } from '@/presentation/hooks/useSermons';
import { SermonCard } from '@/presentation/components/SermonCard';
import { SermonSummary } from '@/domain/models/sermon.model';

export default function SermonListScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { data: groups, isLoading, isRefetching, error, refetch } = usePublishedSermons();
    const [searchQuery, setSearchQuery] = useState('');

    const sections = useMemo(() => {
        if (!groups) return [];
        const q = searchQuery.trim().toLowerCase();
        const matches = (s: SermonSummary) =>
            !q ||
            s.title.toLowerCase().includes(q) ||
            s.bibleReferences.some((r) => r.toLowerCase().includes(q));
        return groups
            .map((g) => ({
                title: g.seriesTitle ?? t('sermons:no_series'),
                data: g.sermons.filter(matches),
            }))
            .filter((sec) => sec.data.length > 0);
    }, [groups, searchQuery, t]);

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-background-light dark:bg-background-primary">
                <ActivityIndicator size="large" color="#1754cf" />
            </View>
        );
    }

    if (error) {
        return (
            <View
                className="flex-1 justify-center items-center bg-background-light dark:bg-background-primary px-8"
                style={{ paddingTop: insets.top }}
            >
                <MaterialIcons name="cloud-off" size={40} color="#94a3b8" />
                <Text className="text-slate-500 dark:text-slate-400 font-lexend text-center mt-3">
                    {t('sermons:error_loading_list')}
                </Text>
                <TouchableOpacity
                    onPress={() => refetch()}
                    className="mt-4 bg-primary px-6 py-2.5 rounded-lg active:opacity-80"
                >
                    <Text className="text-white font-lexend-semibold">{t('common:retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View
            className="flex-1 bg-background-light dark:bg-background-primary"
            style={{ paddingTop: insets.top }}
        >
            <View className="px-5 pt-2 pb-3">
                <Text className="text-2xl font-lexend-bold text-slate-900 dark:text-white mb-3">
                    {t('sermons:title')}
                </Text>
                <View className="flex-row items-center bg-white dark:bg-surface-primary rounded-xl px-3 border border-slate-200 dark:border-border-primary/30">
                    <MaterialIcons name="search" size={20} color="#94a3b8" />
                    <TextInput
                        className="flex-1 px-2 py-2.5 text-base font-lexend text-slate-900 dark:text-white"
                        placeholder={t('sermons:search_placeholder')}
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                    />
                </View>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <SermonCard sermon={item} />}
                renderSectionHeader={({ section }) => (
                    <Text className="text-xs font-lexend-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-4 mb-2">
                        {section.title}
                    </Text>
                )}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
                stickySectionHeadersEnabled={false}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                ListEmptyComponent={
                    <View className="items-center mt-16 px-8">
                        <MaterialIcons name="menu-book" size={40} color="#94a3b8" />
                        <Text className="text-slate-500 dark:text-slate-400 font-lexend text-center mt-3">
                            {searchQuery ? t('sermons:no_results') : t('sermons:empty_published')}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}
