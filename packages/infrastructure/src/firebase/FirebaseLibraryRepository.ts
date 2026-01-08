import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { LibraryResourceEntity } from '@dosfilos/domain';

export interface ILibraryRepository {
    create(resource: LibraryResourceEntity): Promise<void>;
    findById(id: string): Promise<LibraryResourceEntity | null>;
    findByUserId(userId: string): Promise<LibraryResourceEntity[]>;
    subscribeToUserResources(userId: string, callback: (resources: LibraryResourceEntity[]) => void): () => void;
    update(id: string, updates: Partial<LibraryResourceEntity>): Promise<void>;
    delete(id: string): Promise<void>;
    findCoreResources(): Promise<LibraryResourceEntity[]>;
}

export class FirebaseLibraryRepository implements ILibraryRepository {
    private collectionName = 'library_resources';

    async create(resource: LibraryResourceEntity): Promise<void> {
        const ref = doc(db, this.collectionName, resource.id);
        await setDoc(ref, this.resourceToFirestore(resource));
    }

    async findById(id: string): Promise<LibraryResourceEntity | null> {
        const ref = doc(db, this.collectionName, id);
        const snap = await getDoc(ref);

        if (!snap.exists()) return null;

        return this.firestoreToResource(snap.id, snap.data());
    }

    async findByUserId(userId: string): Promise<LibraryResourceEntity[]> {
        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => this.firestoreToResource(doc.id, doc.data()));
    }

    async findCoreResources(): Promise<LibraryResourceEntity[]> {
        // Core resources are those where coreStores includes 'global' OR some specific store
        // For simplicity, we assume any resource with isCore=true or in 'global' store
        // Since isCore is not a top-level field in the entity but coreStores is, we check coreStores
        const q = query(
            collection(db, this.collectionName),
            where('coreStores', 'array-contains', 'global'),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => this.firestoreToResource(doc.id, doc.data()));
    }

    subscribeToUserResources(
        userId: string,
        callback: (resources: LibraryResourceEntity[]) => void,
        onError?: (error: Error) => void
    ): () => void {
        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const resources = snapshot.docs.map(doc =>
                    this.firestoreToResource(doc.id, doc.data())
                );
                callback(resources);
            },
            (error) => {
                console.error("Error in subscribeToUserResources:", error);
                if (onError) onError(error);
            }
        );

        return unsubscribe;
    }

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, id));
    }

    async update(id: string, updates: Partial<LibraryResourceEntity>): Promise<void> {
        const ref = doc(db, this.collectionName, id);
        const firestoreUpdates: any = {};

        if (updates.title !== undefined) firestoreUpdates.title = updates.title;
        if (updates.author !== undefined) firestoreUpdates.author = updates.author;
        if (updates.type !== undefined) firestoreUpdates.type = updates.type;
        if (updates.preferredForPhases !== undefined) firestoreUpdates.preferredForPhases = updates.preferredForPhases;
        if (updates.updatedAt !== undefined) firestoreUpdates.updatedAt = Timestamp.fromDate(updates.updatedAt);

        // 🎯 Core Library stores
        if (updates.coreStores !== undefined) firestoreUpdates.coreStores = updates.coreStores;

        await updateDoc(ref, firestoreUpdates);
    }

    private resourceToFirestore(resource: LibraryResourceEntity): any {
        return {
            userId: resource.userId,
            title: resource.title,
            author: resource.author,
            type: resource.type,
            storageUrl: resource.storageUrl,
            mimeType: resource.mimeType,
            sizeBytes: resource.sizeBytes,
            textExtractionStatus: resource.textExtractionStatus || 'pending',
            textContent: resource.textContent || null,
            textContentUrl: (resource as any).textContentUrl || null,
            characterCount: (resource as any).characterCount || null,
            pageCount: resource.pageCount || null,
            preferredForPhases: resource.preferredForPhases || [],
            metadata: resource.metadata || {},
            // 🎯 Core Library stores
            coreStores: resource.coreStores || [],
            createdAt: Timestamp.fromDate(resource.createdAt),
            updatedAt: Timestamp.fromDate(resource.updatedAt)
        };
    }

    private firestoreToResource(id: string, data: any): LibraryResourceEntity {
        const resource = new LibraryResourceEntity(
            id,
            data.userId,
            data.title,
            data.author,
            data.type,
            data.storageUrl,
            data.mimeType,
            data.sizeBytes,
            data.textExtractionStatus || 'pending',
            data.textContent || undefined,
            data.createdAt?.toDate() || new Date(),
            data.updatedAt?.toDate() || new Date(),
            data.preferredForPhases || undefined,
            data.metadata || undefined,
            data.pageCount || undefined
        );
        // Add new fields directly
        (resource as any).textContentUrl = data.textContentUrl || undefined;
        (resource as any).characterCount = data.characterCount || undefined;
        // 🎯 Core Library stores
        (resource as any).coreStores = data.coreStores || [];
        return resource;
    }
}
