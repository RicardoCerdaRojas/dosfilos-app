import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { SermonSummary } from '@/domain/models/sermon.model';

interface SermonCardProps {
    sermon: SermonSummary;
}

export const SermonCard: React.FC<SermonCardProps> = ({ sermon }) => {
    const router = useRouter();
    const { i18n } = useTranslation();

    const formattedDate = sermon.publishedAt
        ? sermon.publishedAt.toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })
        : '';

    return (
        <TouchableOpacity
            onPress={() => router.push(`/sermon/${sermon.id}`)}
            className="bg-white dark:bg-surface-primary px-5 py-4 rounded-xl border border-slate-100 dark:border-border-primary/30 shadow-sm mb-3 active:scale-[0.98]"
            activeOpacity={0.7}
        >
            <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                    <Text
                        className="text-lg font-lexend-semibold leading-tight text-slate-900 dark:text-white"
                        numberOfLines={2}
                    >
                        {sermon.title}
                    </Text>
                    <View className="flex-row items-center mt-1">
                        {sermon.bibleReferences.length > 0 && (
                            <Text className="text-primary font-lexend text-sm" numberOfLines={1}>
                                {sermon.bibleReferences.join(' · ')}
                            </Text>
                        )}
                    </View>
                    {formattedDate ? (
                        <Text className="text-xs text-slate-400 font-lexend mt-1">{formattedDate}</Text>
                    ) : null}
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
            </View>
        </TouchableOpacity>
    );
};
