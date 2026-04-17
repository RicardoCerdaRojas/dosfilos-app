import type { IDetectiveSessionRepository, DetectiveSession, VerbDetectiveSession, DetectivePhaseResult } from '@dosfilos/domain';
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
 * Each document stores one complete investigation by a student (verbal or nominal).
 * Used for pedagogical analytics: identifying which words / binyanim cause most errors.
 *
 * Backward compatibility: legacy documents stored `verbText` instead of `wordText`.
 * The mapper reads `wordText ?? verbText` so old documents continue to work.
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

        // Determine session type — legacy documents have no 'type' field
        const sessionType: 'verb' | 'nominal' = data.type ?? 'verb';

        if (sessionType === 'nominal') {
          sessions.push({
            id: docSnap.id,
            type: 'nominal',
            userId: data.userId,
            tenantId: data.tenantId,
            wordText: data.wordText ?? data.verbText ?? '',
            verseReference: data.verseReference,
            expectedCategory: data.expectedCategory,
            expectedGender: data.expectedGender,
            expectedNumber: data.expectedNumber,
            expectedState: data.expectedState,
            phases: this.mapPhases(data),
            totalCorrect: data.totalCorrect ?? 0,
            completed: data.completed ?? false,
            completedAt: data.completedAt ?? '',
          });
        } else {
          // Default to 'verb' for new and legacy documents
          sessions.push({
            id: docSnap.id,
            type: 'verb',
            userId: data.userId,
            tenantId: data.tenantId,
            // Backward compat: prefer wordText, fall back to legacy verbText
            wordText: data.wordText ?? data.verbText ?? '',
            verseReference: data.verseReference,
            expectedBinyan: data.expectedBinyan,
            expectedVerbType: data.expectedVerbType,
            phases: this.mapPhases(data),
            totalCorrect: data.totalCorrect ?? 0,
            completed: data.completed ?? false,
            completedAt: data.completedAt ?? '',
          } satisfies VerbDetectiveSession);
        }
      });

      return sessions;
    } catch (error) {
      console.error('[FirestoreDetectiveSessionRepository] Error fetching sessions:', error);
      return [];
    }
  }

  private mapPhases(data: Record<string, any>): readonly DetectivePhaseResult[] {
    return (data.phases ?? []).map((p: any) => ({
      ...p,
      completedAt: p.completedAt?.toDate?.() ?? new Date(p.completedAt),
    })) as DetectivePhaseResult[];
  }
}
