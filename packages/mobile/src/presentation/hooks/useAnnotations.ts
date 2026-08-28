import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HighlightColor, SermonAnnotation, SermonAnnotationAnchor } from '@dosfilos/domain';

import { AnnotationRepositoryImpl } from '@/data/repositories/annotation.repository.impl';

const repository = new AnnotationRepositoryImpl();

const keyOf = (sermonId: string) => ['annotations', sermonId];

/** Marcas del predicador sobre un sermón (plan Púlpito M-05). */
export const useAnnotations = (sermonId: string) =>
    useQuery({
        queryKey: keyOf(sermonId),
        queryFn: () => repository.list(sermonId),
        enabled: !!sermonId,
        // El púlpito no vuelve a la red a mitad de sermón: la caché del SDK
        // ya es la fuente y la lista se actualiza por mutación.
        staleTime: Infinity,
    });

/**
 * Alta, cambio de color y borrado de resaltados. Las tres mutaciones
 * escriben en la caché de react-query PRIMERO: en el púlpito el resaltado
 * tiene que aparecer bajo el dedo, no cuando conteste Firestore.
 */
export const useHighlightMutations = (sermonId: string) => {
    const queryClient = useQueryClient();
    const key = keyOf(sermonId);

    const write = (updater: (current: SermonAnnotation[]) => SermonAnnotation[]) =>
        queryClient.setQueryData<SermonAnnotation[]>(key, (current) => updater(current ?? []));

    const create = useMutation({
        mutationFn: ({ anchor, color }: { anchor: SermonAnnotationAnchor; color: HighlightColor }) =>
            repository.createHighlight(sermonId, anchor, color),
        onSuccess: (created) => write((current) => [...current, created]),
    });

    const recolor = useMutation({
        mutationFn: ({ id, color }: { id: string; color: HighlightColor }) =>
            repository.updateColor(sermonId, id, color),
        onMutate: ({ id, color }) => {
            write((current) => current.map((a) => (a.id === id ? { ...a, color } : a)));
        },
    });

    const remove = useMutation({
        mutationFn: (id: string) => repository.remove(sermonId, id),
        onMutate: (id) => {
            write((current) => current.filter((a) => a.id !== id));
        },
    });

    return { create, recolor, remove };
};
