import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { usePublishedSermons, useSermon, useUpdateSermon } from '@/presentation/hooks/useSermons';

/**
 * Pegar un pasaje en un sermón.
 *
 * Se elige a qué sermón va y el pasaje se agrega al final del cuerpo. Al final
 * y no en el cursor a propósito: cuando el pastor está leyendo la Biblia no
 * tiene un sermón abierto con un cursor puesto — está recolectando, y ordenar
 * es una tarea distinta que se hace después, en el editor.
 */
export default function SermonPasteScreen() {
    const { markdown } = useLocalSearchParams<{ markdown: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { data: groups, isLoading } = usePublishedSermons();

    const sermons = (groups ?? []).flatMap((group) => group.sermons);

    return (
        <View className="flex-1 bg-white dark:bg-slate-900">
            <View
                className="flex-row items-center px-5 pb-3 border-b border-slate-200 dark:border-slate-700"
                style={{ paddingTop: insets.top + 8 }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel={t('common:cancel')}
                >
                    <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
                <Text className="font-lexend-semibold text-base text-slate-900 dark:text-white ml-4">
                    {t('bible:paste_into')}
                </Text>
            </View>

            <View className="px-6 pt-5">
                <Text
                    numberOfLines={3}
                    className="font-lexend text-sm text-slate-500 dark:text-slate-400 italic"
                >
                    {markdown}
                </Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator />
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}>
                    {sermons.map((sermon) => (
                        <PasteTarget
                            key={sermon.id}
                            id={sermon.id}
                            title={sermon.title}
                            markdown={markdown ?? ''}
                            onDone={() => router.back()}
                        />
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

function PasteTarget({
    id,
    title,
    markdown,
    onDone,
}: {
    id: string;
    title: string;
    markdown: string;
    onDone: () => void;
}) {
    const { data: sermon } = useSermon(id);
    const update = useUpdateSermon(id);

    return (
        <TouchableOpacity
            onPress={() => {
                if (!sermon) return;
                update.mutate({
                    title: sermon.title,
                    content: `${sermon.content ?? ''}\n\n${markdown}`.trim(),
                });
                onDone();
            }}
            accessibilityRole="button"
            accessibilityLabel={title}
            className="py-4 border-b border-slate-100 dark:border-slate-800"
        >
            <Text className="font-lexend text-base text-slate-800 dark:text-slate-200">{title}</Text>
        </TouchableOpacity>
    );
}
