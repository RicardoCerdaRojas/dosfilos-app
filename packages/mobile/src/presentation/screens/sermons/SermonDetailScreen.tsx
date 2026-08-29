import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { SermonDetailView } from '@/presentation/screens/sermons/SermonDetailView';

/** La ruta. Todo el detalle vive en la vista, que también se usa en panel. */
export default function SermonDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    return <SermonDetailView sermonId={id ?? ''} />;
}
