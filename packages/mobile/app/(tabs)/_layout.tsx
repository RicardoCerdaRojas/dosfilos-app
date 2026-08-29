import React, { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import type { Href } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAppTheme, type AppTheme } from '@/core/theme/appTheme';
import { useLayout } from '@/core/theme/layout';
import { UserAvatar } from '@/presentation/components/UserAvatar';

/**
 * Las tres puertas: inicio, Biblia, sermones.
 *
 * EN TABLET LA BARRA SE PARA DE COSTADO. Una barra abajo es una convención de
 * teléfono: el pulgar llega al borde inferior porque el aparato se sostiene con
 * una mano. Una tablet se usa apoyada, con las dos manos o con el lápiz, y ese
 * borde queda lejos — además de comerle 85 puntos de alto a una pantalla que
 * los usa para leer. De costado, el rail cuesta ancho, que es lo que sobra.
 *
 * Se arma con las pestañas sin cabeza de Expo Router (`expo-router/ui`) en vez
 * de la barra de siempre: es la misma navegación, pero el rail es nuestro y
 * puede ser una columna con el perfil al pie.
 *
 * En teléfono vuelve abajo. Es la misma navegación con dos formas, no dos
 * navegaciones.
 */
export default function TabLayout() {
    const theme = useAppTheme();
    const { isTablet } = useLayout();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const items: {
        name: string;
        href: Href;
        icon: keyof typeof MaterialIcons.glyphMap;
        label: string;
    }[] = [
        { name: 'index', href: '/', icon: 'home', label: t('common:home_tab') },
        { name: 'bible', href: '/(tabs)/bible', icon: 'book', label: t('common:bible_tab') },
        {
            name: 'sermons',
            href: '/(tabs)/sermons',
            icon: 'history-edu',
            label: t('common:sermons_tab'),
        },
    ];

    const triggers = items.map((item) => (
        <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
            <TabButton theme={theme} icon={item.icon} label={item.label} rail={isTablet} />
        </TabTrigger>
    ));

    if (isTablet) {
        return (
            <Tabs style={{ flex: 1, flexDirection: 'row' }}>
                <TabList
                    style={{
                        width: 132,
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingTop: insets.top + 18,
                        paddingBottom: insets.bottom + 16,
                        backgroundColor: theme.surface,
                        borderRightWidth: 1,
                        borderRightColor: theme.border,
                    }}
                >
                    {triggers}
                    {/* El perfil al pie: no es un destino del mismo orden que
                        los tres anteriores, y en el rail hay lugar para que
                        deje de esconderse en la esquina del inicio. */}
                    <View className="flex-1" />
                    <UserAvatar />
                </TabList>
                {/* `flex: 1` explícito: sin esto el contenedor de pantallas no
                    se estira y la pantalla queda cortada a la altura de su
                    primer bloque, con el resto en negro. */}
                <TabSlot style={{ flex: 1 }} />
            </Tabs>
        );
    }

    return (
        <Tabs style={{ flex: 1 }}>
            <TabSlot style={{ flex: 1 }} />
            <TabList
                style={{
                    flexDirection: 'row',
                    paddingTop: 8,
                    paddingBottom: insets.bottom || 10,
                    backgroundColor: theme.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                }}
            >
                {triggers}
            </TabList>
        </Tabs>
    );
}

interface TabButtonProps extends TabTriggerSlotProps {
    theme: AppTheme;
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    /** De costado el botón es alto y angosto; abajo, ancho y bajo. */
    rail: boolean;
}

/**
 * Un destino.
 *
 * El elegido se marca con FONDO, no sólo con color de ícono. En el atril el
 * pastor mira la pantalla de reojo y a un metro: un azul contra un gris no se
 * distingue, una pastilla sí.
 */
const TabButton = forwardRef<View, TabButtonProps>(
    ({ theme, icon, label, rail, isFocused, ...props }, ref) => {
        const color = isFocused ? theme.accent : theme.textMuted;
        return (
            <Pressable
                ref={ref}
                {...props}
                accessibilityRole="tab"
                accessibilityState={{ selected: !!isFocused }}
                // `Pressable` y no `TouchableOpacity`: el slot de Expo Router
                // tipa media docena de props como `T | null`, que es lo que
                // `Pressable` acepta y `TouchableOpacity` no.
                // TODO EL ESTILO EN UN OBJETO PLANO, sin `className` y sin
                // función. Con las dos cosas juntas el ancho no llegaba a
                // aplicarse —el botón terminaba midiendo lo que mide el
                // ícono— y la etiqueta se cortaba contra ese borde
                // invisible: era el "Inici(" de la captura, no un problema
                // de rail angosto.
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: rail ? 116 : undefined,
                    flex: rail ? undefined : 1,
                    // 44 pt es el mínimo de un blanco de toque cómodo; con el
                    // ícono y la etiqueta esto queda en unos 70.
                    paddingVertical: rail ? 14 : 6,
                    paddingHorizontal: rail ? 4 : 0,
                    // Aire entre destinos: pegados se tocan por error.
                    marginBottom: rail ? 14 : 0,
                    borderRadius: 16,
                    backgroundColor: isFocused ? theme.accentSoft : 'transparent',
                }}
            >
                <MaterialIcons name={icon} size={rail ? 25 : 23} color={color} />
                <Text
                    // Dos renglones antes que una palabra mutilada.
                    numberOfLines={2}
                    style={{
                        color,
                        fontSize: rail ? 11 : 10,
                        marginTop: 4,
                        textAlign: 'center',
                        width: '100%',
                    }}
                    className="font-lexend-semibold"
                >
                    {label}
                </Text>
            </Pressable>
        );
    },
);
TabButton.displayName = 'TabButton';
