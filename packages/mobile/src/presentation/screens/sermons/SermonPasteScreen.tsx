import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/core/theme/appTheme';
import { STUDY_COLUMN } from '@/core/theme/layout';
import { usePublishedSermons, useSermon, useUpdateSermon } from '@/presentation/hooks/useSermons';
import { Card, EmptyState, SectionLabel, Skeleton } from '@/presentation/components/ui/kit';

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
    const theme = useAppTheme();
    const { data: groups, isLoading } = usePublishedSermons();

    const sermons = (groups ?? []).flatMap((group) => group.sermons);

    return (
        <View className="flex-1" style={{ backgroundColor: theme.background }}>
            <View
                className="flex-row items-center px-5 pb-3"
                style={{
                    paddingTop: insets.top + 8,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel={t('common:cancel')}
                >
                    <MaterialIcons name="close" size={23} color={theme.textSecondary} />
                </TouchableOpacity>
                <Text
                    style={{ color: theme.textPrimary, fontSize: 16 }}
                    className="font-lexend-semibold ml-4"
                >
                    {t('bible:paste_into')}
                </Text>
            </View>

            {/* El pasaje que viaja, citado tal como va a quedar: se pega a
                ciegas si no se ve antes. */}
            <View
                style={{
                    paddingHorizontal: 24,
                    paddingTop: 20,
                    width: '100%',
                    maxWidth: STUDY_COLUMN,
                    alignSelf: 'center',
                }}
            >
                <Card theme={theme} className="p-4">
                    <Text
                        numberOfLines={4}
                        style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 24 }}
                        className="font-literata italic"
                    >
                        {markdown}
                    </Text>
                </Card>
                <SectionLabel theme={theme} style={{ marginTop: 24 }}>
                    {t('bible:paste_into')}
                </SectionLabel>
            </View>

            {isLoading ? (
                <View style={{ padding: 24, maxWidth: STUDY_COLUMN, width: '100%', alignSelf: 'center' }}>
                    {[0, 1, 2].map((i) => (
                        <Skeleton theme={theme} key={i} height={20} style={{ marginTop: 18 }} />
                    ))}
                </View>
            ) : sermons.length === 0 ? (
                <EmptyState theme={theme} title={t('home:no_sermons_title')} />
            ) : (
                <ScrollView
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingTop: 8,
                        paddingBottom: insets.bottom + 40,
                        width: '100%',
                        maxWidth: STUDY_COLUMN,
                        alignSelf: 'center',
                    }}
                >
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
    const theme = useAppTheme();
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
            className="flex-row items-center py-4"
            style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}
        >
            <Text
                style={{ color: theme.textPrimary, fontSize: 16 }}
                className="flex-1 font-lexend"
                numberOfLines={2}
            >
                {title}
            </Text>
            <MaterialIcons name="add" size={20} color={theme.textMuted} />
        </TouchableOpacity>
    );
}
