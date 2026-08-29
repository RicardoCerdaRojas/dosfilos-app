import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';
import { useAppTheme } from '@/core/theme/appTheme';
import { useLayout } from '@/core/theme/layout';

/**
 * Las tres puertas: inicio, Biblia, sermones.
 *
 * La barra tomaba sus colores de constantes sueltas (`#1754cf`, `#0b1120`) que
 * ya no coincidían con ninguna pantalla. Ahora sale del tema, así que cambiar
 * un neutro cambia la app entera y no cinco archivos a mano.
 *
 * En tablet crece: los blancos de toque de un teléfono, en una pantalla que se
 * usa apoyada y a distancia de brazo, quedan chicos.
 */
export default function TabLayout() {
    const theme = useAppTheme();
    const { isTablet } = useLayout();
    const { t } = useTranslation();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.accent,
                tabBarInactiveTintColor: theme.textMuted,
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarStyle: {
                    backgroundColor: theme.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                    paddingTop: isTablet ? 12 : 8,
                    height: isTablet ? 92 : 85,
                },
                tabBarLabelStyle: {
                    fontSize: isTablet ? 12 : 10,
                    fontWeight: '600',
                    marginTop: isTablet ? 0 : -4,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t('common:home_tab'),
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons size={isTablet ? 27 : 24} name="home" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="bible"
                options={{
                    title: t('common:bible_tab'),
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons size={isTablet ? 27 : 24} name="book" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="sermons"
                options={{
                    title: t('common:sermons_tab'),
                    tabBarIcon: ({ color }) => (
                        <MaterialIcons size={isTablet ? 27 : 24} name="history-edu" color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
