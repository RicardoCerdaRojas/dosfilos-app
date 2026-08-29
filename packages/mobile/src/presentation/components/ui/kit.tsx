import React from 'react';
import { Text, TextProps, View, ViewProps } from 'react-native';

import { AppTheme } from '@/core/theme/appTheme';

/**
 * Las piezas que se repiten en todas las pantallas del escritorio.
 *
 * No es una librería de componentes: es el mínimo para que seis pantallas
 * dejen de inventar su propia tarjeta, su propio rótulo y su propio vacío. Lo
 * que estaba antes era el mismo bloque copiado con medidas apenas distintas —
 * y las diferencias no eran decisiones, eran accidentes.
 */

interface Themed {
    theme: AppTheme;
}

/** Tarjeta: lo que se levanta del fondo. Un solo radio, una sola sombra. */
export function Card({
    theme,
    style,
    children,
    ...rest
}: Themed & ViewProps & { children?: React.ReactNode }) {
    return (
        <View
            style={[
                {
                    backgroundColor: theme.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                    shadowColor: theme.shadow,
                    shadowOpacity: theme.isDark ? 0 : 1,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 2 },
                },
                style,
            ]}
            {...rest}
        >
            {children}
        </View>
    );
}

/**
 * Rótulo de sección: versalita espaciada, tenue.
 *
 * Ordena sin competir con los títulos. Es el único lugar donde se usa
 * mayúscula sostenida — en cualquier otro lado se lee peor y grita.
 */
export function SectionLabel({
    theme,
    style,
    children,
    ...rest
}: Themed & TextProps & { children?: React.ReactNode }) {
    return (
        <Text
            style={[
                {
                    color: theme.textMuted,
                    fontSize: 11,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                    flexShrink: 1,
                },
                style,
            ]}
            className="font-lexend-semibold"
            // El rótulo lleva espaciado entre letras y RN no lo cuenta al
            // medir: el ancho calculado queda corto y la última letra se
            // corta. Con `flexShrink: 1` y una sola línea, encoge en vez de
            // mutilarse — se veía como "KEEP READIN(".
            numberOfLines={1}
            {...rest}
        >
            {children}
        </Text>
    );
}

/**
 * Vacío con salida.
 *
 * Un vacío que sólo informa deja al pastor mirando una pantalla gris. Los que
 * tienen algo que hacer llevan acción; los que no —una búsqueda sin
 * resultados— llevan sólo la frase, que es la respuesta honesta.
 */
export function EmptyState({
    theme,
    title,
    hint,
    action,
}: Themed & { title: string; hint?: string; action?: React.ReactNode }) {
    return (
        <View className="items-center px-8" style={{ paddingVertical: 56 }}>
            <Text
                style={{ color: theme.textPrimary, fontSize: 17 }}
                className="font-lexend-semibold text-center"
            >
                {title}
            </Text>
            {hint ? (
                <Text
                    style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}
                    className="font-lexend text-center mt-2"
                >
                    {hint}
                </Text>
            ) : null}
            {action ? <View className="mt-5">{action}</View> : null}
        </View>
    );
}

/**
 * Bloque gris mientras carga.
 *
 * Reemplaza al spinner centrado: un spinner no dice cuánto viene ni qué forma
 * tiene, y la pantalla salta cuando llega. El esqueleto ya tiene la forma de
 * lo que va a aparecer, así que el contenido entra en su lugar.
 */
export function Skeleton({
    theme,
    height,
    width,
    style,
}: Themed & { height: number; width?: number | string; style?: ViewProps['style'] }) {
    return (
        <View
            style={[
                {
                    height,
                    width: (width as number | undefined) ?? '100%',
                    borderRadius: 8,
                    backgroundColor: theme.surfaceSunken,
                },
                style,
            ]}
        />
    );
}

/** Chip de estado: un dato corto con color propio (listo, aviso, plan). */
export function Chip({
    theme,
    label,
    tone = 'neutral',
    icon,
}: Themed & {
    label: string;
    tone?: 'neutral' | 'accent' | 'positive';
    icon?: React.ReactNode;
}) {
    const color =
        tone === 'positive' ? theme.positive : tone === 'accent' ? theme.accent : theme.textSecondary;
    const background =
        tone === 'positive'
            ? theme.positiveSoft
            : tone === 'accent'
              ? theme.accentSoft
              : theme.surfaceSunken;
    return (
        <View
            className="flex-row items-center px-3 py-1.5 rounded-full"
            style={{ backgroundColor: background }}
        >
            {icon ? <View className="mr-1.5">{icon}</View> : null}
            <Text style={{ color, fontSize: 12 }} className="font-lexend-semibold">
                {label}
            </Text>
        </View>
    );
}
