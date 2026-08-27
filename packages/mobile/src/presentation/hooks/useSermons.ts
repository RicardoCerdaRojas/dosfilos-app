import { useQuery } from '@tanstack/react-query';

import { SermonListGroup, SermonSummary } from '@/domain/models/sermon.model';
import { SermonRepositoryImpl } from '@/data/repositories/sermon.repository.impl';

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
    return useQuery({
        queryKey: ['sermon', id],
        queryFn: () => repository.getSermonById(id),
        enabled: !!id,
    });
};
