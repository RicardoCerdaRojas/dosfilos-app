import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/core/theme/appTheme';
import { SermonSummary } from '@/domain/models/sermon.model';

interface SermonCardProps {
    sermon: SermonSummary;
    /** En panel dividido, la tarjeta abierta se marca en vez de navegar. */
    active?: boolean;
    onPress?: () => void;
}

/**
 * La tarjeta de un sermón.
 *
 * ORDEN DE LECTURA: primero la REFERENCIA, después el título. Un pastor no
 * busca "El buen pastor", busca Juan 10 — el pasaje es lo que recuerda y lo
 * que organiza su año. Antes la referencia iba abajo, en azul, del tamaño de
 * un pie de foto.
 *
 * Se fue el galón `>` de la derecha: toda la fila es tocable y la flecha sólo
 * ocupaba el lugar donde ahora entra el estado. Y la fecha pasa a tenue: es
 * dato de archivo, no jerarquía.
 */
export const SermonCard: React.FC<SermonCardProps> = ({ sermon, active, onPress }) => {
    const router = useRouter();
    const theme = useAppTheme();
    const { i18n } = useTranslation();

    const formattedDate = sermon.publishedAt
        ? sermon.publishedAt.toLocaleDateString(i18n.language, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          })
        : '';

    return (
        <TouchableOpacity
            onPress={onPress ?? (() => router.push(`/sermon/${sermon.id}`))}
            accessibilityRole="button"
            activeOpacity={0.75}
            className="px-5 py-4 mb-2.5"
            style={{
                backgroundColor: active ? theme.accentSoft : theme.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: active ? theme.accent : theme.border,
            }}
        >
            {sermon.bibleReferences.length > 0 ? (
                <Text
                    style={{ color: theme.accent, fontSize: 12, letterSpacing: 0.6 }}
                    className="font-lexend-semibold"
                    numberOfLines={1}
                >
                    {sermon.bibleReferences.join(' · ').toUpperCase()}
                </Text>
            ) : null}

            <Text
                style={{ color: theme.textPrimary, fontSize: 17, lineHeight: 23, marginTop: 3 }}
                className="font-lexend-semibold"
                numberOfLines={2}
            >
                {sermon.title}
            </Text>

            <View className="flex-row items-center mt-2">
                {formattedDate ? (
                    <Text style={{ color: theme.textMuted, fontSize: 12 }} className="font-lexend">
                        {formattedDate}
                    </Text>
                ) : null}
                {sermon.seriesId ? (
                    <>
                        <Text
                            style={{ color: theme.textMuted, fontSize: 12 }}
                            className="font-lexend mx-1.5"
                        >
                            ·
                        </Text>
                        <MaterialIcons name="layers" size={13} color={theme.textMuted} />
                    </>
                ) : null}
            </View>
        </TouchableOpacity>
    );
};
