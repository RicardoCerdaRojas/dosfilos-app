import React, { useState } from 'react';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAppTheme, type AppTheme } from '@/core/theme/appTheme';
import { STUDY_COLUMN, useLayout } from '@/core/theme/layout';
import { usePublishedSermons } from '@/presentation/hooks/useSermons';
import {
    useSeriesPlans,
    type PlannedSermonItem,
    type SeriesPlan,
} from '@/presentation/hooks/useSeriesPlans';
import { SermonSummary } from '@/domain/models/sermon.model';
import { Card, Chip, EmptyState, SectionLabel, Skeleton } from '@/presentation/components/ui/kit';

/** Dónde termina de escribirse un sermón: la tablet no genera, acompaña. */
const WEB_PLAN_URL = 'https://app.preach.dosfilos.com/dashboard/plans';

/** Ancho de la lista de planes en panel dividido. */
const LIST_PANE = 300;

/**
 * Los planes de predicación.
 *
 * EL TABLERO RESPONDE "QUÉ PREDICO AHORA"; ESTA PANTALLA, "DÓNDE VOY". Son
 * preguntas distintas y hasta ahora sólo estaba contestada la primera: el
 * pastor que predica ocho domingos sobre Jonás no tenía forma de ver el
 * recorrido desde la tablet.
 *
 * QUÉ SE PUEDE HACER CON CADA SERMÓN, Y POR QUÉ. El que ya está publicado se
 * abre en el atril. El que está a medio escribir o sólo planeado NO se apaga
 * en silencio: lleva a terminarlo en la web, que es donde se escribe. Un botón
 * deshabilitado sin explicación se lee como una falla de la app; uno que dice
 * dónde seguir es una indicación.
 */
export default function PlansScreen() {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { isSplit, gutter } = useLayout();

    const { data: plans, isLoading } = useSeriesPlans();
    const { data: groups } = usePublishedSermons();
    const [openId, setOpenId] = useState<string | null>(null);

    const published = new Map<string, SermonSummary>();
    for (const group of groups ?? []) {
        for (const sermon of group.sermons) published.set(sermon.id, sermon);
    }

    const selectedId = openId ?? plans?.[0]?.id ?? null;
    const selected = plans?.find((p) => p.id === selectedId) ?? null;

    const header = (
        <View style={{ paddingHorizontal: isSplit ? 16 : gutter, paddingTop: 8, paddingBottom: 12 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 26 }} className="font-lexend-bold">
                {t('plans:title')}
            </Text>
        </View>
    );

    if (isLoading) {
        return (
            <View
                className="flex-1"
                style={{ backgroundColor: theme.background, paddingTop: insets.top }}
            >
                {header}
                <View style={{ paddingHorizontal: gutter }}>
                    {[0, 1, 2].map((i) => (
                        <Skeleton theme={theme} key={i} height={78} style={{ marginTop: 12 }} />
                    ))}
                </View>
            </View>
        );
    }

    if (!plans?.length) {
        return (
            <View
                className="flex-1 justify-center"
                style={{ backgroundColor: theme.background, paddingTop: insets.top }}
            >
                <EmptyState
                    theme={theme}
                    title={t('plans:empty_title')}
                    hint={t('plans:empty_hint')}
                    action={
                        <TouchableOpacity
                            onPress={() => Linking.openURL(WEB_PLAN_URL)}
                            accessibilityRole="button"
                            className="px-6 py-3 rounded-full active:opacity-85"
                            style={{ backgroundColor: theme.accent }}
                        >
                            <Text
                                style={{ color: theme.onAccent }}
                                className="font-lexend-semibold"
                            >
                                {t('plans:open_web')}
                            </Text>
                        </TouchableOpacity>
                    }
                />
            </View>
        );
    }

    const list = (
        <View
            className="flex-1"
            style={{
                backgroundColor: theme.background,
                paddingTop: insets.top,
                width: isSplit ? LIST_PANE : undefined,
                borderRightWidth: isSplit ? 1 : 0,
                borderRightColor: theme.border,
            }}
        >
            {header}
            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: isSplit ? 16 : gutter,
                    paddingBottom: insets.bottom + 24,
                }}
            >
                {plans.map((plan) => (
                    <PlanRow
                        key={plan.id}
                        plan={plan}
                        theme={theme}
                        active={isSplit && plan.id === selectedId}
                        onPress={() => setOpenId(plan.id)}
                        published={published}
                    />
                ))}
            </ScrollView>
        </View>
    );

    const detail = selected ? (
        <PlanDetail plan={selected} published={published} standalone={!isSplit} />
    ) : null;

    if (!isSplit) {
        // En pantalla angosta el plan elegido va debajo de la lista: son pocos
        // planes, y partir esto en dos pantallas agregaría un viaje por nada.
        return (
            <View className="flex-1" style={{ backgroundColor: theme.background }}>
                <ScrollView>
                    {list}
                    {detail}
                </ScrollView>
            </View>
        );
    }

    return (
        <View className="flex-1 flex-row" style={{ backgroundColor: theme.background }}>
            {list}
            <View className="flex-1">{detail}</View>
        </View>
    );
}

/** Una fila de plan, con su avance. */
function PlanRow({
    plan,
    theme,
    active,
    onPress,
    published,
}: {
    plan: SeriesPlan;
    theme: AppTheme;
    active: boolean;
    onPress: () => void;
    published: Map<string, SermonSummary>;
}) {
    const { t } = useTranslation();
    const ready = plan.items.filter((item) => isReady(item, published)).length;

    return (
        <TouchableOpacity
            onPress={onPress}
            accessibilityRole="button"
            activeOpacity={0.75}
            className="px-4 py-3.5 mb-2.5"
            style={{
                backgroundColor: active ? theme.accentSoft : theme.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: active ? theme.accent : theme.border,
            }}
        >
            <Text
                style={{ color: theme.textPrimary, fontSize: 16, lineHeight: 22 }}
                className="font-lexend-semibold"
                numberOfLines={2}
            >
                {plan.title}
            </Text>
            <Text
                style={{ color: theme.textMuted, fontSize: 12, marginTop: 5 }}
                className="font-lexend"
            >
                {t('plans:ready_of_total', { ready, total: plan.items.length })}
            </Text>
        </TouchableOpacity>
    );
}

/** El plan abierto: sus sermones en orden, con lo que se puede hacer con cada uno. */
function PlanDetail({
    plan,
    published,
    standalone,
}: {
    plan: SeriesPlan;
    published: Map<string, SermonSummary>;
    standalone: boolean;
}) {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { gutter } = useLayout();

    return (
        <ScrollView
            style={{ backgroundColor: theme.background }}
            contentContainerStyle={{
                paddingHorizontal: gutter,
                paddingTop: standalone ? 8 : insets.top + 24,
                paddingBottom: insets.bottom + 40,
            }}
        >
            <View style={{ width: '100%', maxWidth: STUDY_COLUMN, alignSelf: 'center' }}>
                <Text
                    style={{ color: theme.textPrimary, fontSize: 24, lineHeight: 31 }}
                    className="font-lexend-bold"
                >
                    {plan.title}
                </Text>
                {plan.description ? (
                    <Text
                        style={{
                            color: theme.textSecondary,
                            fontSize: 15,
                            lineHeight: 23,
                            marginTop: 8,
                        }}
                        className="font-lexend"
                    >
                        {plan.description}
                    </Text>
                ) : null}

                <SectionLabel theme={theme} style={{ marginTop: 26, marginBottom: 10 }}>
                    {t('plans:sermons')}
                </SectionLabel>

                {plan.items.length === 0 ? (
                    <EmptyState
                        theme={theme}
                        title={t('plans:no_items')}
                        hint={t('plans:no_items_hint')}
                    />
                ) : (
                    plan.items.map((item) => {
                        const sermon = item.draftId ? published.get(item.draftId) : undefined;
                        const date = item.scheduledDate
                            ? item.scheduledDate.toLocaleDateString(i18n.language, {
                                  month: 'short',
                                  day: 'numeric',
                              })
                            : null;
                        return (
                            <Card
                                key={item.id}
                                theme={theme}
                                style={{ padding: 16, marginBottom: 10 }}
                            >
                                <View className="flex-row items-center">
                                    <Text
                                        style={{ color: theme.textMuted, fontSize: 12 }}
                                        className="font-lexend-semibold"
                                    >
                                        {t('plans:week', { week: item.week })}
                                    </Text>
                                    {date ? (
                                        <Text
                                            style={{ color: theme.textMuted, fontSize: 12 }}
                                            className="font-lexend ml-2"
                                        >
                                            · {date}
                                        </Text>
                                    ) : null}
                                    <View className="flex-1" />
                                    {sermon && sermon.timesPreached > 0 ? (
                                        <Chip
                                            theme={theme}
                                            tone="positive"
                                            label={t('sermons:preached')}
                                            icon={
                                                <MaterialIcons
                                                    name="check-circle"
                                                    size={13}
                                                    color={theme.positive}
                                                />
                                            }
                                        />
                                    ) : null}
                                </View>

                                <Text
                                    style={{
                                        color: theme.textPrimary,
                                        fontSize: 17,
                                        lineHeight: 23,
                                        marginTop: 6,
                                    }}
                                    className="font-lexend-semibold"
                                >
                                    {item.title}
                                </Text>
                                {item.passage ? (
                                    <Text
                                        style={{ color: theme.accent, fontSize: 12, marginTop: 3 }}
                                        className="font-lexend-semibold"
                                    >
                                        {item.passage.toUpperCase()}
                                    </Text>
                                ) : null}

                                <View className="flex-row items-center mt-4">
                                    {sermon ? (
                                        <>
                                            <TouchableOpacity
                                                onPress={() => router.push(`/preach/${sermon.id}`)}
                                                accessibilityRole="button"
                                                className="flex-row items-center px-5 py-2.5 rounded-full active:opacity-85"
                                                style={{ backgroundColor: theme.accent }}
                                            >
                                                <MaterialIcons
                                                    name="record-voice-over"
                                                    size={17}
                                                    color={theme.onAccent}
                                                />
                                                <Text
                                                    style={{ color: theme.onAccent, fontSize: 14 }}
                                                    className="font-lexend-semibold ml-2"
                                                >
                                                    {t('home:open_pulpit')}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => router.push(`/sermon/${sermon.id}`)}
                                                accessibilityRole="button"
                                                className="px-4 py-2.5 ml-1"
                                            >
                                                <Text
                                                    style={{
                                                        color: theme.textSecondary,
                                                        fontSize: 14,
                                                    }}
                                                    className="font-lexend-semibold"
                                                >
                                                    {t('sermons:read')}
                                                </Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        // No se apaga y se calla: se dice dónde
                                        // se termina. La tablet no escribe
                                        // sermones, los predica.
                                        <TouchableOpacity
                                            onPress={() =>
                                                Linking.openURL(`${WEB_PLAN_URL}/${plan.id}`)
                                            }
                                            accessibilityRole="button"
                                            className="flex-row items-center px-5 py-2.5 rounded-full"
                                            style={{
                                                borderWidth: 1,
                                                borderColor: theme.borderStrong,
                                            }}
                                        >
                                            <MaterialIcons
                                                name="open-in-new"
                                                size={16}
                                                color={theme.textSecondary}
                                            />
                                            <Text
                                                style={{ color: theme.textSecondary, fontSize: 14 }}
                                                className="font-lexend-semibold ml-2"
                                            >
                                                {item.status === 'in_progress'
                                                    ? t('plans:finish_on_web')
                                                    : t('plans:start_on_web')}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </Card>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

/** Listo = hay un sermón publicado detrás. Lo demás todavía se escribe. */
function isReady(item: PlannedSermonItem, published: Map<string, SermonSummary>): boolean {
    return !!item.draftId && published.has(item.draftId);
}
