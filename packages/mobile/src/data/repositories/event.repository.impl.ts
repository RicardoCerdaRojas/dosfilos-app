import { Event } from '@/domain/models/event.model';
import { EventRepository } from '@/domain/repositories/event.repository';
import { getFirebaseDb } from '../sources/firebase.source';
import { collection, getDocs, query, orderBy, limit as firestoreLimit, where, doc, getDoc } from 'firebase/firestore';

export class EventRepositoryImpl implements EventRepository {
    private get collection() {
        return collection(getFirebaseDb(), 'events');
    }

    async getUpcomingEvents(churchId: string, limit = 10): Promise<Event[]> {
        try {
            const now = new Date();
            const q = query(
                this.collection,
                where('churchId', '==', churchId),
                where('startDate', '>=', now),
                orderBy('startDate', 'asc'),
                firestoreLimit(limit)
            );
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate?.toDate() || new Date(),
                endDate: doc.data().endDate?.toDate(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            } as Event));
        } catch (error) {
            console.error('Error fetching upcoming events:', error);
            throw error;
        }
    }

    async getEventById(id: string): Promise<Event | null> {
        try {
            const docRef = doc(this.collection, id);
            const snapshot = await getDoc(docRef);

            if (!snapshot.exists()) return null;

            return {
                id: snapshot.id,
                ...snapshot.data(),
                startDate: snapshot.data().startDate?.toDate() || new Date(),
                endDate: snapshot.data().endDate?.toDate(),
                createdAt: snapshot.data().createdAt?.toDate() || new Date(),
                updatedAt: snapshot.data().updatedAt?.toDate() || new Date(),
            } as Event;
        } catch (error) {
            console.error('Error fetching event:', error);
            throw error;
        }
    }

    async getPastEvents(churchId: string, limit = 10, offset = 0): Promise<Event[]> {
        try {
            const now = new Date();
            const q = query(
                this.collection,
                where('churchId', '==', churchId),
                where('startDate', '<', now),
                orderBy('startDate', 'desc'),
                firestoreLimit(limit)
            );
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate?.toDate() || new Date(),
                endDate: doc.data().endDate?.toDate(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            } as Event));
        } catch (error) {
            console.error('Error fetching past events:', error);
            throw error;
        }
    }
}
