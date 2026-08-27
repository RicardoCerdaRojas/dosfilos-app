import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/presentation/state/auth.store';
import { usePublishedSermons } from '@/presentation/hooks/useSermons';
import { SermonCard } from '@/presentation/components/SermonCard';

export default function HomeScreen() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { data: groups, isLoading } = usePublishedSermons();

    // "Lo próximo a predicar": los más recientes, sin importar la serie.
    const recent = (groups ?? [])
        .flatMap((g) => g.sermons)
        .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
        .slice(0, 3);

    return (
        <View
            className="flex-1 bg-background-light dark:bg-background-primary"
            style={{ paddingTop: insets.top }}
        >
            <ScrollView
                className="flex-1 px-6"
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="py-6">
                    <Text className="text-xs uppercase tracking-widest text-primary font-lexend-semibold">
                        Dos Filos Preach
                    </Text>
                    <Text className="text-2xl font-lexend-bold text-slate-900 dark:text-white mt-1">
                        {t('home:welcome')} {user?.firstName ?? ''}
                    </Text>
                </View>

                <View className="flex-row justify-between mb-8">
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)/sermons')}
                        className="flex-1 mr-3 bg-white dark:bg-surface-primary rounded-xl px-4 py-5 items-center border border-slate-100 dark:border-border-primary/30 active:opacity-80"
                    >
                        <MaterialIcons name="record-voice-over" size={26} color="#1754cf" />
                        <Text className="font-lexend-semibold text-slate-900 dark:text-white mt-2 text-center">
                            {t('home:go_preach')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)/bible')}
                        className="flex-1 bg-white dark:bg-surface-primary rounded-xl px-4 py-5 items-center border border-slate-100 dark:border-border-primary/30 active:opacity-80"
                    >
                        <MaterialIcons name="menu-book" size={26} color="#1754cf" />
                        <Text className="font-lexend-semibold text-slate-900 dark:text-white mt-2 text-center">
                            {t('home:open_bible')}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-xs font-lexend-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {t('home:recent_sermons')}
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/sermons')}>
                        <Text className="text-primary font-lexend-semibold text-sm">
                            {t('home:view_all')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <ActivityIndicator color="#1754cf" className="mt-6" />
                ) : recent.length === 0 ? (
                    <Text className="text-slate-500 dark:text-slate-400 font-lexend mt-2">
                        {t('sermons:empty_published')}
                    </Text>
                ) : (
                    recent.map((sermon) => <SermonCard key={sermon.id} sermon={sermon} />)
                )}
            </ScrollView>
        </View>
    );
}
