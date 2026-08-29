import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/core/theme/appTheme';
import { useLayout } from '@/core/theme/layout';
import { SermonSummary } from '@/domain/models/sermon.model';
import { useAuthStore } from '@/presentation/state/auth.store';
import { usePublishedSermons } from '@/presentation/hooks/useSermons';
import { useBriefcase } from '@/presentation/hooks/useSermonBriefcase';
import { SermonCard } from '@/presentation/components/SermonCard';
import { UserAvatar } from '@/presentation/components/UserAvatar';
import { Card, Chip, EmptyState, SectionLabel, Skeleton } from '@/presentation/components/ui/kit';

/**
 * El inicio responde UNA pregunta: qué predico ahora.
 *
 * Antes eran dos botones grandes —"Predicar" y "Abrir Biblia"— que duplicaban
 * la barra de pestañas y no decían nada que el pastor no supiera. En su lugar
 * va el sermón más próximo, entero y accionable: referencia, título, si está
 * garantizado sin conexión, y la puerta al atril. Lo demás es archivo.
 */
export default function HomeScreen() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const theme = useAppTheme();
    const { gutter, isTablet } = useLayout();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { data: groups, isLoading } = usePublishedSermons();

    const recent = (groups ?? [])
        .flatMap((g) => g.sermons)
        .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));

    const next = recent[0];
    const rest = recent.slice(1, 5);

    return (
        <View className="flex-1" style={{ backgroundColor: theme.background, paddingTop: insets.top }}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: gutter,
                    paddingBottom: insets.bottom + 32,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-row items-center justify-between py-6">
                    <View className="flex-1 pr-4">
                        <SectionLabel theme={theme}>Dos Filos Preach</SectionLabel>
                        <Text
                            style={{ color: theme.textPrimary, fontSize: isTablet ? 30 : 25 }}
                            className="font-lexend-bold mt-1"
                            numberOfLines={1}
                        >
                            {t('home:welcome')} {user?.firstName ?? ''}
                        </Text>
                    </View>
                    <UserAvatar />
                </View>

                {isLoading ? (
                    <Card theme={theme} className="p-6">
                        <Skeleton theme={theme} height={12} width={120} />
                        <Skeleton theme={theme} height={26} style={{ marginTop: 14 }} />
                        <Skeleton theme={theme} height={26} width="70%" style={{ marginTop: 8 }} />
                        <Skeleton theme={theme} height={44} width={180} style={{ marginTop: 24 }} />
                    </Card>
                ) : next ? (
                    <NextSermon sermon={next} />
                ) : (
                    <Card theme={theme}>
                        <EmptyState
                            theme={theme}
                            title={t('home:no_sermons_title')}
                            hint={t('home:no_sermons_hint')}
                        />
                    </Card>
                )}

                {rest.length > 0 ? (
                    <>
                        <View className="flex-row items-center justify-between mt-9 mb-3">
                            <SectionLabel theme={theme}>{t('home:recent_sermons')}</SectionLabel>
                            <TouchableOpacity
                                onPress={() => router.push('/(tabs)/sermons')}
                                accessibilityRole="button"
                            >
                                <Text
                                    style={{ color: theme.accent, fontSize: 13 }}
                                    className="font-lexend-semibold"
                                >
                                    {t('home:view_all')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {rest.map((sermon) => (
                            <SermonCard key={sermon.id} sermon={sermon} />
                        ))}
                    </>
                ) : null}
            </ScrollView>
        </View>
    );
}

/**
 * El sermón próximo, con todo lo que se necesita antes de subir.
 *
 * El estado del maletín se muestra ACÁ y no sólo en el detalle: enterarse de
 * que el sermón no está garantizado sin conexión mientras se camina al atril
 * es tarde.
 */
function NextSermon({ sermon }: { sermon: SermonSummary }) {
    const theme = useAppTheme();
    const router = useRouter();
    const { t } = useTranslation();
    const { data: briefcase } = useBriefcase(sermon.id);

    return (
        <Card theme={theme} className="p-6">
            <View className="flex-row items-center justify-between">
                <SectionLabel theme={theme}>{t('home:next_to_preach')}</SectionLabel>
                {briefcase ? (
                    <Chip
                        theme={theme}
                        tone="positive"
                        label={t('home:ready_offline_short')}
                        icon={
                            <MaterialIcons name="offline-pin" size={13} color={theme.positive} />
                        }
                    />
                ) : null}
            </View>

            {sermon.bibleReferences.length > 0 ? (
                <Text
                    style={{ color: theme.accent, fontSize: 13, letterSpacing: 0.6, marginTop: 14 }}
                    className="font-lexend-semibold"
                >
                    {sermon.bibleReferences.join(' · ').toUpperCase()}
                </Text>
            ) : null}

            <Text
                style={{ color: theme.textPrimary, fontSize: 26, lineHeight: 33, marginTop: 4 }}
                className="font-lexend-bold"
                numberOfLines={3}
            >
                {sermon.title}
            </Text>

            <View className="flex-row items-center mt-6">
                <TouchableOpacity
                    onPress={() => router.push(`/preach/${sermon.id}`)}
                    accessibilityRole="button"
                    className="flex-row items-center px-6 py-3.5 rounded-full active:opacity-85"
                    style={{ backgroundColor: theme.accent }}
                >
                    <MaterialIcons name="record-voice-over" size={19} color={theme.onAccent} />
                    <Text
                        style={{ color: theme.onAccent, fontSize: 15 }}
                        className="font-lexend-semibold ml-2"
                    >
                        {t('home:open_pulpit')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push(`/sermon/${sermon.id}`)}
                    accessibilityRole="button"
                    className="px-5 py-3.5 ml-2"
                >
                    <Text
                        style={{ color: theme.textSecondary, fontSize: 15 }}
                        className="font-lexend-semibold"
                    >
                        {t('sermons:read')}
                    </Text>
                </TouchableOpacity>
            </View>
        </Card>
    );
}
