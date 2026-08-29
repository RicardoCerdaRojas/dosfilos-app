import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from '@react-native-firebase/firestore';

import { getFirebaseAuth, getFirebaseDb } from '@/data/sources/firebase.source';

/** Un sermón del plan, tal como lo dejó el planificador en la web. */
export interface PlannedSermonItem {
    id: string;
    week: number;
    title: string;
    passage: string;
    scheduledDate?: Date;
    status: 'planned' | 'in_progress' | 'complete';
    /** Sermón real, si ya se empezó a escribir. */
    draftId?: string;
}

export interface SeriesPlan {
    id: string;
    title: string;
    description: string;
    startDate?: Date;
    /** Sermones ya publicados de esta serie. */
    sermonIds: string[];
    items: PlannedSermonItem[];
}

const toDate = (v: any): Date | undefined => {
    if (!v) return undefined;
    if (typeof v.toDate === 'function') return v.toDate();
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') {
        const parsed = new Date(v);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
};

/**
 * Los planes de predicación del pastor.
 *
 * SE LEEN DE `series`, QUE ES DONDE ESCRIBE EL PLANIFICADOR de la web
 * (`createSeriesFromPlan`). La ruta de la web se llama `/plans` y el dominio
 * lo llama serie: son la misma cosa con dos nombres, y acá se usa el que ve el
 * pastor. Existen además `sermon_series` y `preaching_plans`, que hoy sólo
 * alimentan analítica y no llevan estos datos.
 *
 * El plan vive en `metadata.plannedSermons`: cada entrada trae su semana, su
 * pasaje, su estado y —cuando ya se empezó a escribir— el sermón al que
 * apunta. Con eso alcanza para saber qué se puede predicar hoy y qué falta.
 */
export function useSeriesPlans() {
    return useQuery({
        queryKey: ['seriesPlans'],
        queryFn: async (): Promise<SeriesPlan[]> => {
            const uid = getFirebaseAuth().currentUser?.uid;
            if (!uid) return [];
            const snap = await getDocs(
                query(collection(getFirebaseDb(), 'series'), where('userId', '==', uid)),
            );

            const plans = snap.docs.map((doc) => {
                const d = doc.data() as any;
                const planned = Array.isArray(d.metadata?.plannedSermons)
                    ? d.metadata.plannedSermons
                    : [];
                return {
                    id: doc.id,
                    title: String(d.title ?? ''),
                    description: String(d.description ?? ''),
                    startDate: toDate(d.startDate),
                    sermonIds: Array.isArray(d.sermonIds) ? d.sermonIds : [],
                    items: planned
                        .map((p: any, index: number) => ({
                            id: String(p.id ?? index),
                            week: typeof p.week === 'number' ? p.week : index + 1,
                            title: String(p.title ?? ''),
                            passage: String(p.passage ?? ''),
                            scheduledDate: toDate(p.scheduledDate),
                            status: (p.status ?? 'planned') as PlannedSermonItem['status'],
                            draftId: p.draftId ? String(p.draftId) : undefined,
                        }))
                        // Por semana: el plan tiene un orden y no es el de
                        // escritura en Firestore.
                        .sort((a: PlannedSermonItem, b: PlannedSermonItem) => a.week - b.week),
                };
            });

            // Los planes con fecha de inicio más reciente primero; los que no
            // tienen fecha, al final: son plantillas o planes sin arrancar.
            return plans.sort(
                (a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0),
            );
        },
        staleTime: 5 * 60 * 1000,
    });
}
