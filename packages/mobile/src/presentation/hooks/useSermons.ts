import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Sermon, SermonListGroup, SermonSummary } from '@/domain/models/sermon.model';
import type { PreachingLog } from '@dosfilos/domain';
import { SermonRepositoryImpl } from '@/data/repositories/sermon.repository.impl';
import { PREVIEW_SERMON, PREVIEW_SERMON_ID } from '@/core/dev/previewSermon';

const repository = new SermonRepositoryImpl();

const newestFirst = (a: SermonSummary, b: SermonSummary) =>
    (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);

/**
 * Lista de predicación: sermones PUBLICADOS agrupados por serie (plan §8, F1).
 * Grupos ordenados por su sermón más reciente; los sueltos al final.
 */
export const usePublishedSermons = () => {
    return useQuery({
        queryKey: ['sermons', 'published-groups'],
        queryFn: async (): Promise<SermonListGroup[]> => {
            const all = await repository.getPublishedSummaries();
            // Publicar varias veces crea copias — a veces enlazadas
            // (versionOf → raíz), a veces docs independientes idénticos
            // (publicaciones previas a la cadena de versiones). Para predicar
            // interesa solo la más reciente de cada sermón; el historial vive
            // en la web. Identidad de respaldo: serie + título + pasajes.
            const byChain = new Map<string, SermonSummary>();
            for (const s of all) {
                const chain =
                    s.versionOf ?? `${s.seriesId ?? ''}|${s.title}|${s.bibleReferences.join(',')}`;
                const prev = byChain.get(chain);
                if (!prev || (s.publishedAt?.getTime() ?? 0) > (prev.publishedAt?.getTime() ?? 0)) {
                    byChain.set(chain, s);
                }
            }
            const summaries = [...byChain.values()];
            const seriesIds = summaries.map((s) => s.seriesId).filter((id): id is string => !!id);
            const titles = await repository.getSeriesTitles(seriesIds);

            const bySeries = new Map<string | null, SermonSummary[]>();
            for (const s of summaries) {
                const key = s.seriesId && titles[s.seriesId] ? s.seriesId : null;
                const bucket = bySeries.get(key) ?? [];
                bucket.push(s);
                bySeries.set(key, bucket);
            }

            const groups: SermonListGroup[] = [...bySeries.entries()].map(([seriesId, sermons]) => ({
                seriesId,
                seriesTitle: seriesId ? titles[seriesId] : null,
                sermons: sermons.sort(newestFirst),
            }));

            return groups.sort((a, b) => {
                if (a.seriesId === null) return 1;
                if (b.seriesId === null) return -1;
                return newestFirst(a.sermons[0], b.sermons[0]);
            });
        },
    });
};

export const useSermon = (id: string) => {
    // Vista previa del púlpito sin backend: en esta máquina no hay firma, así
    // que no hay login y sin login no hay Firestore. Ver previewSermon.ts.
    const isPreview = __DEV__ && id === PREVIEW_SERMON_ID;
    return useQuery({
        queryKey: ['sermon', id],
        queryFn: () => (isPreview ? PREVIEW_SERMON : repository.getSermonById(id)),
        enabled: !!id,
    });
};

/**
 * Guarda los cambios del editor. Escribe la caché primero: el pastor tiene
 * que ver su texto guardado aunque la iglesia no tenga WiFi.
 */
export const useUpdateSermon = (id: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (patch: { title: string; content: string }) =>
            repository.updateSermonDraft(id, patch),
        onMutate: (patch) => {
            queryClient.setQueryData(['sermon', id], (current: Sermon | null | undefined) =>
                current ? { ...current, ...patch, updatedAt: new Date() } : current,
            );
            queryClient.invalidateQueries({ queryKey: ['sermons', 'published-groups'] });
        },
    });
};

/** Registro post-predicación (F3): cierra el ciclo de vida del sermón. */
export const useAddPreachingLog = (id: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (log: PreachingLog) => repository.addPreachingLog(id, log),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sermon', id] }),
    });
};
