import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import PreachModeScreen from '@/presentation/screens/sermons/PreachModeScreen';
import { PREVIEW_SERMON_ID } from '@/core/dev/previewSermon';

/**
 * Vista previa del modo púlpito con un sermón de prueba. Monta LA PANTALLA
 * REAL — no una copia — para que lo que se mira acá sea lo que se predica.
 *
 * `?section=N` abre directo en un movimiento, para revisar un caso concreto
 * sin ir tocando la pantalla.
 */
export default function PreachPreviewRoute() {
    const { section } = useLocalSearchParams<{ section?: string }>();
    const index = Number.parseInt(section ?? '0', 10);
    return (
        <PreachModeScreen
            sermonId={PREVIEW_SERMON_ID}
            initialSectionIndex={Number.isFinite(index) && index > 0 ? index : 0}
        />
    );
}
