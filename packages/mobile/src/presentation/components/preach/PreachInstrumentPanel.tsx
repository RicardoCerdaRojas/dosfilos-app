import React from 'react';
import { Text, View } from 'react-native';
import type { MovementBudget } from '@dosfilos/domain';
import { totalBudget } from '@dosfilos/domain';

import { ReadingModeTokens } from '@/core/theme/readingModes';
import { TYPE_SCALE } from '@/core/theme/typography';

interface Props {
    tokens: ReadingModeTokens;
    fontSize: number;
    budgets: MovementBudget[];
    elapsedSeconds: number;
    /** Movimiento que se está LEYENDO (puede no ser el que dicta el reloj). */
    readingIndex: number;
    /** Página dentro del movimiento, para el punto de avance fino. */
    pageIndex: number;
    pageCount: number;
    height: number;
}

const formatTime = (seconds: number): string => {
    const abs = Math.abs(Math.round(seconds));
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return `${seconds < 0 ? '+' : ''}${m}:${String(s).padStart(2, '0')}`;
};

/**
 * El tercio inferior de la pantalla (P7).
 *
 * La técnica de atril reserva el tercio de abajo porque leerlo obliga a bajar
 * el mentón y la cara sale de la congregación — en una tablet además es el
 * ángulo más lavado del LCD. En papel ese tercio se pierde; acá se convierte
 * en el tablero, con los dos datos que se consultan de reojo y que hoy están
 * mal ubicados: el timer (D5) y el avance (D2).
 *
 * EL RIEL responde una sola pregunta: ¿voy a tiempo? Cada segmento es un
 * movimiento y su ancho es su PRESUPUESTO DE TIEMPO, no su cantidad de texto.
 * El cursor es el reloj real. Si el cursor pasa el final del segmento que
 * estás predicando, vas tarde — y se ve sin leer un número.
 *
 * El estado se distingue por FORMA además de por color (borde grueso, cursor,
 * relleno), para que siga funcionando en tinta electrónica, donde el color no
 * existe.
 */
export function PreachInstrumentPanel({
    tokens,
    fontSize,
    budgets,
    elapsedSeconds,
    readingIndex,
    pageIndex,
    pageCount,
    height,
}: Props) {
    const total = totalBudget(budgets);

    // El veredicto se mide contra el movimiento que se está LEYENDO: lo que
    // importa no es dónde debería estar el reloj, sino cuánto le queda a este
    // movimiento según el presupuesto.
    const reading = budgets[readingIndex];
    const endsAtReading = budgets
        .slice(0, readingIndex + 1)
        .reduce((sum, b) => sum + b.seconds, 0);
    const remaining = endsAtReading - elapsedSeconds;
    const late = remaining < 0;

    const timerColor = late
        ? tokens.timerOver
        : remaining < (reading?.seconds ?? 0) * 0.2
          ? tokens.timerWarn
          : tokens.timerOk;

    return (
        <View
            style={{
                height,
                borderTopWidth: 1,
                borderTopColor: tokens.border,
                paddingHorizontal: 28,
                paddingTop: fontSize * 0.5,
                justifyContent: 'center',
            }}
        >
            <View className="flex-row items-baseline">
                <Text
                    style={{
                        color: timerColor,
                        fontSize: fontSize * TYPE_SCALE.timer,
                        fontVariant: ['tabular-nums'],
                    }}
                    className="font-lexend-semibold"
                >
                    {formatTime(remaining)}
                </Text>
                <Text
                    style={{
                        color: tokens.textSecondary,
                        fontSize: fontSize * 0.5,
                        marginLeft: fontSize * 0.5,
                        flex: 1,
                    }}
                    numberOfLines={1}
                    className="font-lexend"
                >
                    {reading?.title ?? ''}
                </Text>
                <Text
                    style={{
                        color: tokens.textSecondary,
                        fontSize: fontSize * 0.5,
                        fontVariant: ['tabular-nums'],
                    }}
                    className="font-lexend"
                >
                    {pageIndex + 1}/{pageCount}
                </Text>
            </View>

            {/* Riel: un segmento por movimiento, ancho = presupuesto */}
            <View className="flex-row" style={{ height: 14, marginTop: fontSize * 0.45 }}>
                {budgets.map((budget, index) => {
                    const isReading = index === readingIndex;
                    return (
                        <View
                            key={budget.slug}
                            style={{
                                flex: budget.seconds,
                                marginRight: index === budgets.length - 1 ? 0 : 3,
                                borderRadius: 2,
                                borderWidth: isReading ? 2 : 1,
                                borderColor: isReading
                                    ? late
                                        ? tokens.timerOver
                                        : tokens.accent
                                    : tokens.border,
                                backgroundColor:
                                    index < readingIndex ? tokens.border : 'transparent',
                            }}
                        />
                    );
                })}
            </View>

            {/* Cursor del reloj sobre el riel, en escala del total */}
            <View style={{ height: 10, marginTop: 2 }}>
                <View
                    style={{
                        position: 'absolute',
                        left: `${Math.min(100, total > 0 ? (elapsedSeconds / total) * 100 : 0)}%`,
                        width: 2,
                        height: 10,
                        backgroundColor: tokens.textPrimary,
                    }}
                />
            </View>
        </View>
    );
}
