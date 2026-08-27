import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { doc, getDoc } from '@react-native-firebase/firestore';

import { Sermon, SermonSummary } from '@/domain/models/sermon.model';
import { SermonRepository } from '@/domain/repositories/sermon.repository';
import { getFirebaseDb } from '@/data/sources/firebase.source';

/** Item crudo del callable getSermonsListSummary (fechas en milisegundos). */
interface RawSummary {
    id: string;
    title: string;
    status: Sermon['status'];
    bibleReferences?: string[];
    tags?: string[];
    seriesId?: string;
    hasContent?: boolean;
    publishedAt?: number;
    updatedAt?: number;
    versionOf?: string;
}

const toDate = (v: unknown): Date | undefined => {
    if (typeof v === 'number') return new Date(v);
    if (v && typeof (v as any).toDate === 'function') return (v as any).toDate();
    return undefined;
};

export class SermonRepositoryImpl implements SermonRepository {
    async getPublishedSummaries(): Promise<SermonSummary[]> {
        const callable = httpsCallable<{ status: string }, { sermons: RawSummary[] }>(
            getFunctions(getApp()),
            'getSermonsListSummary',
        );
        const res = await callable({ status: 'published' });
        return (res.data.sermons ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            bibleReferences: s.bibleReferences ?? [],
            tags: s.tags ?? [],
            seriesId: s.seriesId,
            hasContent: Boolean(s.hasContent),
            publishedAt: toDate(s.publishedAt),
            updatedAt: toDate(s.updatedAt),
            versionOf: s.versionOf,
        }));
    }

    async getSeriesTitles(seriesIds: string[]): Promise<Record<string, string>> {
        const db = getFirebaseDb();
        const unique = [...new Set(seriesIds)];
        const titles: Record<string, string> = {};
        await Promise.all(
            unique.map(async (id) => {
                try {
                    const snap = await getDoc(doc(db, 'series', id));
                    const title = snap.exists() ? (snap.data()?.title as string | undefined) : undefined;
                    if (title) titles[id] = title;
                } catch (error) {
                    // Una serie ilegible no tumba la lista: el grupo cae a "sin serie".
                    console.warn(`[sermons] series ${id} unreadable:`, error);
                }
            }),
        );
        return titles;
    }

    async getSermonById(id: string): Promise<Sermon | null> {
        const snap = await getDoc(doc(getFirebaseDb(), 'sermons', id));
        if (!snap.exists()) return null;
        const d = snap.data() as any;
        return {
            ...d,
            id: snap.id,
            bibleReferences: d.bibleReferences ?? [],
            tags: d.tags ?? [],
            createdAt: toDate(d.createdAt) ?? new Date(),
            updatedAt: toDate(d.updatedAt) ?? new Date(),
            publishedAt: toDate(d.publishedAt),
            scheduledDate: toDate(d.scheduledDate),
            preachingHistory: (d.preachingHistory ?? []).map((p: any) => ({
                ...p,
                date: toDate(p.date) ?? new Date(),
            })),
        } as Sermon;
    }
}
