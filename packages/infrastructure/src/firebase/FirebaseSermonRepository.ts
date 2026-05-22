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
    limit,
    QueryConstraint,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { ISermonRepository, FindOptions } from '@dosfilos/domain';
import { SermonEntity } from '@dosfilos/domain';
import { db } from '../config/firebase';

export class FirebaseSermonRepository implements ISermonRepository {
    private collectionName = 'sermons';

    async create(sermon: SermonEntity): Promise<SermonEntity> {
        const sermonRef = doc(db, this.collectionName, sermon.id);
        const firestoreData = this.sermonToFirestore(sermon);


        try {
            await setDoc(sermonRef, firestoreData);

            return sermon;
        } catch (error: any) {
            console.error('❌ Firestore setDoc error:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            throw error;
        }
    }

    async update(sermon: SermonEntity): Promise<SermonEntity> {
        const sermonRef = doc(db, this.collectionName, sermon.id);
        await setDoc(sermonRef, this.sermonToFirestore(sermon), { merge: true });
        return sermon;
    }

    async delete(id: string): Promise<void> {
        const sermonRef = doc(db, this.collectionName, id);
        await deleteDoc(sermonRef);
    }

    async findById(id: string): Promise<SermonEntity | null> {


        try {
            const sermonRef = doc(db, this.collectionName, id);
            const snapshot = await getDoc(sermonRef);

            if (!snapshot.exists()) {

                return null;
            }


            return this.firestoreToSermon(snapshot.id, snapshot.data());
        } catch (error: any) {
            // Only log unexpected errors, not permission-denied (common when doc was deleted)
            if (error.code !== 'permission-denied') {
                console.error('❌ FirebaseSermonRepository.findById error:', error);
                console.error('❌ Error code:', error.code);
                console.error('❌ Error message:', error.message);
            }
            throw error;
        }
    }

    async findByShareToken(token: string): Promise<SermonEntity | null> {
        const q = query(
            collection(db, this.collectionName),
            where('shareToken', '==', token),
            where('isShared', '==', true),
            limit(1)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0]!;
        return this.firestoreToSermon(doc.id, doc.data());
    }

    async findByUserId(userId: string, options?: FindOptions): Promise<SermonEntity[]> {
        const constraints: QueryConstraint[] = [where('userId', '==', userId)];

        if (options?.status) {
            constraints.push(where('status', '==', options.status));
        }

        if (options?.category) {
            constraints.push(where('category', '==', options.category));
        }

        if (options?.tags && options.tags.length > 0) {
            constraints.push(where('tags', 'array-contains-any', options.tags));
        }

        const orderByField = options?.orderBy ?? 'createdAt';
        const orderDirection = options?.order ?? 'desc';
        constraints.push(orderBy(orderByField, orderDirection));

        if (options?.limit) {
            constraints.push(limit(options.limit));
        }

        const q = query(collection(db, this.collectionName), ...constraints);
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => this.firestoreToSermon(doc.id, doc.data()));
    }

    async findAll(options?: FindOptions): Promise<SermonEntity[]> {
        const constraints: QueryConstraint[] = [];

        if (options?.status) {
            constraints.push(where('status', '==', options.status));
        }

        const orderByField = options?.orderBy ?? 'createdAt';
        const orderDirection = options?.order ?? 'desc';
        constraints.push(orderBy(orderByField, orderDirection));

        if (options?.limit) {
            constraints.push(limit(options.limit));
        }

        const q = query(collection(db, this.collectionName), ...constraints);
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => this.firestoreToSermon(doc.id, doc.data()));
    }

    async findByDraftId(draftId: string, userId: string): Promise<SermonEntity[]> {
        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            where('sourceSermonId', '==', draftId),
            where('status', '==', 'published'),
            orderBy('publishedAt', 'desc')
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => this.firestoreToSermon(doc.id, doc.data()));
    }

    async findBySourcePaperId(userId: string, paperId: string): Promise<SermonEntity[]> {
        // Composite index requirement: (userId asc, sourcePaperId asc,
        // createdAt desc). Firestore prompts to auto-create on first
        // query if missing. See `firestore.indexes.json` in the
        // infrastructure package for the declarative definition.
        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            where('sourcePaperId', '==', paperId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => this.firestoreToSermon(doc.id, doc.data()));
    }

    private sermonToFirestore(sermon: SermonEntity): any {
        return {
            userId: sermon.userId,
            title: sermon.title,
            content: sermon.content,
            bibleReferences: sermon.bibleReferences,
            tags: sermon.tags,
            category: sermon.category ?? null,
            status: sermon.status,
            createdAt: Timestamp.fromDate(sermon.createdAt),
            updatedAt: serverTimestamp(),
            publishedAt: sermon.publishedAt ? Timestamp.fromDate(sermon.publishedAt) : null,
            shareToken: sermon.shareToken ?? null,
            isShared: sermon.isShared,
            authorName: sermon.authorName,
            seriesId: sermon.seriesId ?? null,
            scheduledDate: sermon.scheduledDate ? Timestamp.fromDate(sermon.scheduledDate) : null,
            preachingHistory: sermon.preachingHistory.map(log => ({
                ...log,
                date: Timestamp.fromDate(log.date)
            })),
            wizardProgress: sermon.wizardProgress ? {
                ...sermon.wizardProgress,
                lastSaved: Timestamp.fromDate(sermon.wizardProgress.lastSaved),
                // Convert nested Date inside derivedContext so
                // Firestore stores it as a Timestamp and the
                // deserializer can restore it consistently with all
                // other Date fields. The discriminated union shape is
                // shallow-copied — only `generatedAt` needs Timestamp
                // coercion regardless of kind.
                ...(sermon.wizardProgress.derivedContext ? {
                    derivedContext: {
                        ...sermon.wizardProgress.derivedContext,
                        generatedAt: Timestamp.fromDate(sermon.wizardProgress.derivedContext.generatedAt),
                    },
                } : {}),
            } : null,
            sourceSermonId: sermon.sourceSermonId ?? null,
            sourceFacultySessionId: sermon.sourceFacultySessionId ?? null,
            projectId: sermon.projectId ?? null,
            sourcePaperId: sermon.sourcePaperId ?? null,
            bibliography: sermon.bibliography ?? null,
        };
    }

    private firestoreToSermon(id: string, data: any): SermonEntity {
        const d = data as any;
        return SermonEntity.create({
            id,
            userId: data.userId,
            title: data.title,
            content: data.content,
            bibleReferences: data.bibleReferences ?? [],
            tags: data.tags ?? [],
            category: data.category,
            status: data.status,
            // Preserve the persisted dates instead of stamping `now`
            // on every read — the dashboard sorts by these and shows
            // them inline. Fallback to `now` when the doc is missing
            // them entirely (legacy docs from before the field was
            // populated).
            createdAt: d.createdAt?.toDate?.() ?? d.createdAt ?? new Date(),
            updatedAt: d.updatedAt?.toDate?.() ?? d.updatedAt ?? new Date(),
            publishedAt: d.publishedAt?.toDate(),
            shareToken: d.shareToken,
            isShared: d.isShared,
            authorName: d.authorName,
            seriesId: d.seriesId,
            scheduledDate: d.scheduledDate?.toDate(),
            preachingHistory: (d.preachingHistory ?? []).map((log: any) => ({
                ...log,
                date: log.date?.toDate() || new Date()
            })),
            wizardProgress: d.wizardProgress ? {
                ...d.wizardProgress,
                lastSaved: d.wizardProgress.lastSaved?.toDate() || new Date(),
                ...(d.wizardProgress.derivedContext ? {
                    derivedContext: {
                        ...d.wizardProgress.derivedContext,
                        generatedAt: d.wizardProgress.derivedContext.generatedAt?.toDate?.()
                            ?? d.wizardProgress.derivedContext.generatedAt
                            ?? new Date(),
                    },
                } : d.wizardProgress.paperContext ? {
                    // Legacy back-compat (#213 used `paperContext`
                    // directly). Migrate transparently on read so
                    // pre-this-PR sermons keep working without a
                    // backfill job. Writers always use derivedContext.
                    derivedContext: {
                        kind: 'paper' as const,
                        ...d.wizardProgress.paperContext,
                        generatedAt: d.wizardProgress.paperContext.generatedAt?.toDate?.()
                            ?? d.wizardProgress.paperContext.generatedAt
                            ?? new Date(),
                    },
                } : {}),
            } : undefined,
            sourceSermonId: d.sourceSermonId,
            sourceFacultySessionId: d.sourceFacultySessionId ?? undefined,
            projectId: d.projectId ?? undefined,
            sourcePaperId: d.sourcePaperId ?? undefined,
            bibliography: Array.isArray(d.bibliography) ? d.bibliography : undefined,
        });
    }
}
