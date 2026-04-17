import type { IDetectiveSessionRepository, DetectiveSession } from '@dosfilos/domain';
import { db } from '../../config/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

// Helper to recursively remove undefined fields (Firestore doesn't accept undefined)
function removeUndefined<T>(obj: T): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => removeUndefined(item));
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj as object)) {
      if (value !== undefined) cleaned[key] = removeUndefined(value);
    }
    return cleaned;
  }
  return obj;
}

/**
 * Firestore implementation of the detective session repository.
 *
 * Collection: hebrewDetectiveSessions
 *
 * Each document stores one complete 6-phase investigation by a student.
 * Used for pedagogical analytics: identifying which verbs / binyanim
 * cause the most errors across the student population.
 */
export class FirestoreDetectiveSessionRepository implements IDetectiveSessionRepository {
  private readonly COLLECTION = 'hebrewDetectiveSessions';

  async saveSession(session: Omit<DetectiveSession, 'id'>): Promise<string> {
    try {
      const payload = removeUndefined({
        ...session,
        // Convert Date objects in PhaseResult to Firestore Timestamps
        phases: session.phases.map(p => ({
          ...p,
          completedAt: Timestamp.fromDate(
            p.completedAt instanceof Date ? p.completedAt : new Date(p.completedAt),
          ),
        })),
        storedAt: Timestamp.now(),
      });

      const docRef = await addDoc(collection(db, this.COLLECTION), payload);
      console.log(`[FirestoreDetectiveSessionRepository] Saved session ${docRef.id} for user ${session.userId}`);
      return docRef.id;
    } catch (error) {
      console.error('[FirestoreDetectiveSessionRepository] Error saving session:', error);
      throw error;
    }
  }

  async getSessionsByUser(userId: string, maxResults = 20): Promise<DetectiveSession[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        orderBy('completedAt', 'desc'),
        firestoreLimit(maxResults),
      );

      const snapshot = await getDocs(q);
      const sessions: DetectiveSession[] = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        sessions.push({
          id: docSnap.id,
          userId: data.userId,
          tenantId: data.tenantId,
          verbText: data.verbText,
          verseReference: data.verseReference,
          expectedBinyan: data.expectedBinyan,
          expectedVerbType: data.expectedVerbType,
          phases: (data.phases ?? []).map((p: any) => ({
            ...p,
            completedAt: p.completedAt?.toDate?.() ?? new Date(p.completedAt),
          })),
          totalCorrect: data.totalCorrect ?? 0,
          completed: data.completed ?? false,
          completedAt: data.completedAt ?? '',
        });
      });

      return sessions;
    } catch (error) {
      console.error('[FirestoreDetectiveSessionRepository] Error fetching sessions:', error);
      return [];
    }
  }
}
