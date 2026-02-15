import { Sermon } from '@/domain/models/sermon.model';
import { SermonRepository } from '@/domain/repositories/sermon.repository';
import { getFirebaseDb } from '../sources/firebase.source';
import { collection, getDocs, query, orderBy, limit as firestoreLimit, doc, getDoc, startAfter } from 'firebase/firestore';

export class SermonRepositoryImpl implements SermonRepository {
    private get collection() {
        return collection(getFirebaseDb(), 'sermons');
    }

    async getSermons(limit = 10, offset = 0): Promise<Sermon[]> {
        try {
            // Note: Firestore offset is tricky, usually requires cursor. 
            // For now, we'll just get latest. 
            // In a real app with infinite scroll, we'd pass a cursor doc.
            const q = query(this.collection, orderBy('date', 'desc'), firestoreLimit(limit));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate() || new Date(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            } as Sermon));
        } catch (error) {
            console.error('Error fetching sermons:', error);
            throw error;
        }
    }

    async getSermonById(id: string): Promise<Sermon | null> {
        try {
            const docRef = doc(this.collection, id);
            const snapshot = await getDoc(docRef);

            if (!snapshot.exists()) return null;

            return {
                id: snapshot.id,
                ...snapshot.data(),
                date: snapshot.data().date?.toDate() || new Date(),
                createdAt: snapshot.data().createdAt?.toDate() || new Date(),
                updatedAt: snapshot.data().updatedAt?.toDate() || new Date(),
            } as Sermon;
        } catch (error) {
            console.error('Error fetching sermon:', error);
            throw error;
        }
    }

    async getLatestSermon(): Promise<Sermon | null> {
        try {
            const q = query(this.collection, orderBy('date', 'desc'), firestoreLimit(1));
            const snapshot = await getDocs(q);

            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate() || new Date(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            } as Sermon;
        } catch (error) {
            console.error('Error fetching latest sermon:', error);
            throw error;
        }
    }
}
