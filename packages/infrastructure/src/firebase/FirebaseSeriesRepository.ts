import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { ISeriesRepository, SermonSeriesEntity } from '@dosfilos/domain';
import { db } from '../config/firebase';

export class FirebaseSeriesRepository implements ISeriesRepository {
    private collectionName = 'series';

    async create(series: SermonSeriesEntity): Promise<SermonSeriesEntity> {
        const seriesRef = doc(db, this.collectionName, series.id);
        await setDoc(seriesRef, this.seriesToFirestore(series));
        return series;
    }

    async update(series: SermonSeriesEntity): Promise<SermonSeriesEntity> {
        const seriesRef = doc(db, this.collectionName, series.id);
        await setDoc(seriesRef, this.seriesToFirestore(series), { merge: true });
        return series;
    }

    async delete(id: string): Promise<void> {
        const seriesRef = doc(db, this.collectionName, id);
        await deleteDoc(seriesRef);
    }

    async findById(id: string): Promise<SermonSeriesEntity | null> {
        const seriesRef = doc(db, this.collectionName, id);
        const snapshot = await getDoc(seriesRef);

        if (!snapshot.exists()) {
            return null;
        }

        return this.firestoreToSeries(snapshot.id, snapshot.data());
    }

    async findByUserId(userId: string): Promise<SermonSeriesEntity[]> {
        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => this.firestoreToSeries(doc.id, doc.data()));
    }

    private seriesToFirestore(series: SermonSeriesEntity): any {
        // Serialize plannedSermons dates to Timestamps
        let metadata = series.metadata || null;
        if (metadata && metadata.plannedSermons) {
            metadata = {
                ...metadata,
                plannedSermons: metadata.plannedSermons.map(ps => ({
                    ...ps,
                    scheduledDate: ps.scheduledDate ? Timestamp.fromDate(new Date(ps.scheduledDate)) : null
                }))
            };
        }

        return {
            userId: series.userId,
            title: series.title,
            description: series.description,
            coverUrl: series.coverUrl ?? null,
            startDate: series.startDate ? Timestamp.fromDate(series.startDate) : null,
            endDate: series.endDate ? Timestamp.fromDate(series.endDate) : null,
            sermonIds: series.sermonIds,
            draftIds: series.draftIds,
            createdAt: Timestamp.fromDate(series.createdAt),
            updatedAt: serverTimestamp(),
            type: series.type || 'manual',
            metadata: metadata,
            resourceIds: series.resourceIds || [],
        };
    }

    private firestoreToSeries(id: string, data: any): SermonSeriesEntity {
        // Deserialize plannedSermons dates from Timestamps
        let metadata = data.metadata || undefined;
        if (metadata && metadata.plannedSermons) {
            metadata = {
                ...metadata,
                plannedSermons: metadata.plannedSermons.map((ps: any) => ({
                    ...ps,
                    scheduledDate: ps.scheduledDate?.toDate ? ps.scheduledDate.toDate() : ps.scheduledDate
                }))
            };
        }

        return SermonSeriesEntity.create({
            id,
            userId: data.userId,
            title: data.title,
            description: data.description,
            coverUrl: data.coverUrl,
            startDate: data.startDate?.toDate ? data.startDate.toDate() : undefined,
            endDate: data.endDate?.toDate(),
            sermonIds: data.sermonIds ?? [],
            draftIds: data.draftIds ?? [],
            type: data.type || 'manual',
            metadata: metadata,
            resourceIds: data.resourceIds || [],
        });
    }
}
