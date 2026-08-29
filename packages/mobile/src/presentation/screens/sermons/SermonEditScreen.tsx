import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/core/theme/appTheme';
import { STUDY_COLUMN } from '@/core/theme/layout';
import { SectionLabel } from '@/presentation/components/ui/kit';

import { useSermon, useUpdateSermon } from '@/presentation/hooks/useSermons';


/**
 * Editor del sermón — el Redactor mínimo (M-07).
 *
 * ALCANCE DELIBERADAMENTE ACOTADO. Edita `content` y `title`, y nada más. El
 * wizard de ocho pasos NO se porta: la espina pastoral (semilla, voz del
 * pastor, gate de fidelidad, verificador de citas) depende de callables
 * pesados y de política que ya costó des-duplicar. El estudio profundo vive
 * en la web; la tablet edita la prosa.
 *
 * `wizardProgress` no se toca ni por accidente: el repositorio escribe una
 * lista explícita de campos, no un spread del documento.
 *
 * Se edita el markdown en crudo a propósito. El pastor ya escribe `##` para
 * cortar movimientos, y un editor rico que "ayude" acá terminaría peleando
 * con el formato que el púlpito depende de leer.
 */
export default function SermonEditScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const { data: sermon, isLoading } = useSermon(id ?? '');
    const update = useUpdateSermon(id ?? '');

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loadedFor, setLoadedFor] = useState<string | null>(null);

    // Se carga UNA vez por sermón, ajustando estado DURANTE el render: es el
    // patrón de React para reiniciar estado cuando cambia el dato de entrada.
    // En un efecto dispararía renders en cascada, y recargar en cada render
    // pisaría lo que el pastor está escribiendo cada vez que la caché refresca.
    if (sermon && loadedFor !== sermon.id) {
        setLoadedFor(sermon.id);
        setTitle(sermon.title);
        setContent(sermon.content ?? '');
    }

    const dirty =
        sermon !== undefined &&
        sermon !== null &&
        (title !== sermon.title || content !== (sermon.content ?? ''));

    // La regla de Firestore exige título de 5 a 200 caracteres: se avisa acá
    // en vez de dejar que la escritura falle en silencio contra el servidor.
    const titleValid = title.trim().length >= 5 && title.trim().length <= 200;

    const save = () => {
        if (!dirty || !titleValid) return;
        update.mutate({ title: title.trim(), content });
        router.back();
    };

    if (isLoading || !sermon) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator color={theme.textMuted} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            className="flex-1"
            style={{ backgroundColor: theme.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View
                className="flex-row items-center justify-between px-5 pb-3"
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
                    className="flex-row items-center"
                >
                    <MaterialIcons name="close" size={23} color={theme.textSecondary} />
                </TouchableOpacity>

                <Text
                    style={{ color: theme.textPrimary, fontSize: 16 }}
                    className="font-lexend-semibold"
                >
                    {t('sermons:edit_title')}
                </Text>

                <TouchableOpacity
                    onPress={save}
                    disabled={!dirty || !titleValid}
                    accessibilityRole="button"
                    accessibilityLabel={t('sermons:save')}
                    className="px-4 py-2 rounded-full"
                    style={{ opacity: dirty && titleValid ? 1 : 0.4 }}
                >
                    <Text
                        style={{ color: theme.accent, fontSize: 16 }}
                        className="font-lexend-semibold"
                    >
                        {t('sermons:save')}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 120 }}
                keyboardShouldPersistTaps="handled"
            >
                {/* Medida de estudio: se lee sentado, así que puede ser más
                    ancha que la de entrega — pero no todo el ancho de la
                    tablet, que daría renglones ilegibles. */}
                <View style={{ maxWidth: STUDY_COLUMN, alignSelf: 'center', width: '100%' }}>
                    <SectionLabel theme={theme} style={{ marginBottom: 8 }}>
                        {t('sermons:field_title')}
                    </SectionLabel>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        multiline
                        className="font-lexend-semibold pb-3"
                        style={{
                            color: theme.textPrimary,
                            fontSize: 24,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.border,
                        }}
                        placeholder={t('sermons:field_title')}
                        placeholderTextColor={theme.textMuted}
                    />
                    {!titleValid ? (
                        <Text
                            style={{ color: theme.warning, fontSize: 12 }}
                            className="font-lexend mt-2"
                        >
                            {t('sermons:title_length')}
                        </Text>
                    ) : null}

                    <SectionLabel theme={theme} style={{ marginTop: 32, marginBottom: 6 }}>
                        {t('sermons:field_content')}
                    </SectionLabel>
                    <Text
                        style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}
                        className="font-lexend mb-3"
                    >
                        {t('sermons:content_hint')}
                    </Text>
                    <TextInput
                        value={content}
                        onChangeText={setContent}
                        multiline
                        textAlignVertical="top"
                        // Serif para el cuerpo: se escribe y se relee largo,
                        // igual que en el detalle.
                        className="font-literata"
                        style={{
                            minHeight: 420,
                            color: theme.textPrimary,
                            fontSize: 17,
                            lineHeight: 29,
                        }}
                        placeholder={t('sermons:field_content')}
                        placeholderTextColor={theme.textMuted}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
