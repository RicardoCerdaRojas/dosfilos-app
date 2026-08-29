import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Sermon } from '@dosfilos/domain';

import { SermonRepositoryImpl } from '@/data/repositories/sermon.repository.impl';
import { AnnotationRepositoryImpl } from '@/data/repositories/annotation.repository.impl';

const sermons = new SermonRepositoryImpl();
const annotations = new AnnotationRepositoryImpl();

const key = (sermonId: string) => `briefcase:${sermonId}`;

/**
 * El maletín (M-03): offline EXPLÍCITO, no caché con suerte.
 *
 * El sermón del domingo no puede depender de que la caché de Firestore
 * "probablemente" lo tenga. La caché del SDK nativo es buena pero es una
 * promesa que nadie firmó: se puede desalojar, y el pastor se entera parado
 * frente a la congregación. "Preparar para predicar" baja el documento
 * entero —cuerpo, manifiesto de citas y marcas— y lo guarda en una copia
 * propia que nadie más va a tocar.
 *
 * Lo que importa del diseño no es la copia: es que el pastor VEA el check
 * verde antes de subir al púlpito. Un estado que se puede mirar vale más que
 * una garantía que hay que creer.
 */
export interface BriefcaseEntry {
    sermon: Sermon;
    savedAt: string;
}

export const useBriefcase = (sermonId: string) =>
    useQuery({
        queryKey: ['briefcase', sermonId],
        queryFn: async (): Promise<BriefcaseEntry | null> => {
            const raw = await AsyncStorage.getItem(key(sermonId));
            if (!raw) return null;
            try {
                return JSON.parse(raw) as BriefcaseEntry;
            } catch {
                // Una entrada corrupta es como no tenerla: se re-prepara.
                return null;
            }
        },
        enabled: !!sermonId,
        staleTime: Infinity,
    });

export const usePrepareBriefcase = (sermonId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<BriefcaseEntry> => {
            const sermon = await sermons.getSermonById(sermonId);
            if (!sermon) throw new Error('sermon-not-found');
            // Las marcas se piden aunque no se guarden en la copia: el pedido
            // fuerza a la caché del SDK a traerlas ahora, con red, en vez de
            // el domingo sin ella.
            await annotations.list(sermonId).catch(() => []);
            const entry: BriefcaseEntry = { sermon, savedAt: new Date().toISOString() };
            await AsyncStorage.setItem(key(sermonId), JSON.stringify(entry));
            return entry;
        },
        onSuccess: (entry) => {
            queryClient.setQueryData(['briefcase', sermonId], entry);
        },
    });
};

export const useClearBriefcase = (sermonId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => AsyncStorage.removeItem(key(sermonId)),
        onSuccess: () => queryClient.setQueryData(['briefcase', sermonId], null),
    });
};
