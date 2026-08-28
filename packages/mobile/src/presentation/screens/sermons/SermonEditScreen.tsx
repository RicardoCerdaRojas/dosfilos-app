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
            <View className="flex-1 items-center justify-center bg-white dark:bg-slate-900">
                <ActivityIndicator />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-white dark:bg-slate-900"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View
                className="flex-row items-center justify-between px-5 pb-3 border-b border-slate-200 dark:border-slate-700"
                style={{ paddingTop: insets.top + 8 }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel={t('common:cancel')}
                    className="flex-row items-center"
                >
                    <MaterialIcons name="close" size={24} className="text-slate-500" />
                </TouchableOpacity>

                <Text className="font-lexend-semibold text-base text-slate-900 dark:text-white">
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
                    <Text className="font-lexend-semibold text-base text-blue-600 dark:text-blue-400">
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
                <View style={{ maxWidth: 720, alignSelf: 'center', width: '100%' }}>
                    <Text className="font-lexend text-xs uppercase tracking-widest text-slate-500 mb-2">
                        {t('sermons:field_title')}
                    </Text>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        multiline
                        className="font-lexend-semibold text-2xl text-slate-900 dark:text-white pb-3 border-b border-slate-200 dark:border-slate-700"
                        placeholder={t('sermons:field_title')}
                        placeholderTextColor="#94a3b8"
                    />
                    {!titleValid ? (
                        <Text className="font-lexend text-xs text-amber-600 mt-2">
                            {t('sermons:title_length')}
                        </Text>
                    ) : null}

                    <Text className="font-lexend text-xs uppercase tracking-widest text-slate-500 mt-8 mb-2">
                        {t('sermons:field_content')}
                    </Text>
                    <Text className="font-lexend text-xs text-slate-500 mb-3">
                        {t('sermons:content_hint')}
                    </Text>
                    <TextInput
                        value={content}
                        onChangeText={setContent}
                        multiline
                        textAlignVertical="top"
                        className="font-lexend text-base leading-7 text-slate-800 dark:text-slate-200"
                        style={{ minHeight: 420 }}
                        placeholder={t('sermons:field_content')}
                        placeholderTextColor="#94a3b8"
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
