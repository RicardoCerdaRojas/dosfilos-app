
import { ISessionRepository, StudySession, ExegeticalInsight } from '@dosfilos/domain';
import { db } from '../../config/firebase';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

// Helper to recursively remove undefined fields (Firestore doesn't accept undefined)
function removeUndefined<T>(obj: T): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = removeUndefined(value);
            }
        }
        return cleaned;
    }

    return obj;
}

export class FirestoreGreekSessionRepository implements ISessionRepository {
    private sessionsCollection = 'greek_sessions';
    private syntaxAnalysisCacheCollection = 'syntax_analysis_cache'; // New for Phase 4B

    async createSession(session: StudySession): Promise<void> {
        const docRef = doc(db, this.sessionsCollection, session.id);
        const { id, ...data } = session; // Firestore doc ID is session.id
        await setDoc(docRef, removeUndefined(data));
    }

    async getSession(sessionId: string): Promise<StudySession | null> {
        const docRef = doc(db, this.sessionsCollection, sessionId);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) return null;

        // Flatten data back into domain entity
        return {
            id: snapshot.id,
            ...snapshot.data()
        } as StudySession;
    }

    /**
     * Retrieves all sessions for a specific user
     * Uses Firestore query with where clause for proper permissions
     */
    async getAllSessions(userId: string): Promise<StudySession[]> {
        const sessionsRef = collection(db, this.sessionsCollection);
        const q = query(sessionsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);

        const sessions: StudySession[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            sessions.push({
                id: doc.id, // Use doc.id for the document ID
                userId: data.userId,
                passage: data.passage,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                status: data.status,
                units: data.units || [],
                responses: data.responses || {},
                sessionProgress: data.sessionProgress
            });
        });

        return sessions;
    }

    async updateSession(session: StudySession): Promise<void> {
        const docRef = doc(db, this.sessionsCollection, session.id);
        // We only update specific fields to avoid overwriting (though for MVP full rewrite might be okay)
        // Let's rewrite for now as session object is authoritative in this architecture
        const { id, ...data } = session;
        await setDoc(docRef, removeUndefined(data), { merge: true });
    }

    async saveInsight(insight: ExegeticalInsight): Promise<void> {
        // Save as subcollection of session or root collection?
        // Data Model spec says: sessions/{sessionId}/insights/{insightId}
        // But standard practice might be root collection with sessionRef.
        // Let's follow Data Model spec: sessions/{sessionId}/insights/{insightId}

        // Wait, StudySession entity usually contains the list of insights?
        // Let's check StudySession entity definition. For now assuming standalone.
        // Spec: `sessions/{sessionId}/insights/{insightId}`

        // However, I Configured simple root collection `greek_insights` above.
        // Let's align with Spec: Subcollection.

        const insightsRef = collection(db, this.sessionsCollection, insight.sessionId, 'insights');
        const docRef = doc(insightsRef, insight.id);
        const { id, ...data } = insight;
        await setDoc(docRef, removeUndefined(data));
    }

    async getInsightsBySession(sessionId: string): Promise<ExegeticalInsight[]> {
        const insightsRef = collection(db, this.sessionsCollection, sessionId, 'insights');
        const snapshot = await getDocs(insightsRef);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as ExegeticalInsight[];
    }

    // ========== Phase 3A: Progress Tracking Methods ==========

    /**
     * Updates progress for a specific training unit within a session.
     * Finds the unit and updates its progress field.
     */
    async updateUnitProgress(
        sessionId: string,
        unitId: string,
        progress: import('@dosfilos/domain').UnitProgress
    ): Promise<void> {
        const sessionRef = doc(db, this.sessionsCollection, sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const session = sessionSnap.data() as any;

        // Update the specific unit's progress
        const updatedUnits = (session.units || []).map((unit: any) =>
            unit.id === unitId
                ? { ...unit, progress: removeUndefined(progress) }
                : unit
        );

        await setDoc(sessionRef, {
            units: updatedUnits,
            updatedAt: new Date()
        }, { merge: true });
    }

    /**
     * Saves a quiz attempt to Firestore.
     * Stored as subcollection for queryability and analytics.
     */
    async saveQuizAttempt(
        sessionId: string,
        attempt: import('@dosfilos/domain').QuizAttempt
    ): Promise<void> {
        const attemptsRef = collection(db, this.sessionsCollection, sessionId, 'quiz_attempts');
        const docRef = doc(attemptsRef, attempt.id);

        await setDoc(docRef, removeUndefined(attempt));
    }

    /**
     * Retrieves session-level progress information.
     */
    async getSessionProgress(sessionId: string): Promise<import('@dosfilos/domain').SessionProgress | null> {
        const sessionRef = doc(db, this.sessionsCollection, sessionId);
        const snapshot = await getDoc(sessionRef);

        if (!snapshot.exists()) return null;

        return snapshot.data().sessionProgress as import('@dosfilos/domain').SessionProgress || null;
    }

    // ========== Phase 3A: Quiz Caching Methods ==========

    /**
     * Retrieves cached quiz questions from global quiz cache collection.
     * Enables hybrid quiz generation strategy (cache first, then Gemini).
     */
    async getCachedQuiz(cacheKey: string): Promise<import('@dosfilos/domain').QuizQuestion[]> {
        try {
            const cacheRef = doc(db, 'quiz_cache', cacheKey);
            const snapshot = await getDoc(cacheRef);

            if (!snapshot.exists()) {
                return [];
            }

            const data = snapshot.data();
            return data.questions || [];
        } catch (error) {
            console.error('[FirestoreGreekSessionRepository] getCachedQuiz error:', error);
            return [];
        }
    }

    /**
     * Stores quiz questions in global cache for future reuse.
     * Reduces Gemini API costs and improves latency.
     */
    async cacheQuiz(
        cacheKey: string,
        questions: import('@dosfilos/domain').QuizQuestion[]
    ): Promise<void> {
        try {
            const cacheRef = doc(db, 'quiz_cache', cacheKey);

            await setDoc(cacheRef, {
                cacheKey,
                questions: questions.map(q => removeUndefined(q)),
                createdAt: new Date(),
                lastUsedAt: new Date(),
                usageCount: 1
            });
        } catch (error) {
            console.error('[FirestoreGreekSessionRepository] cacheQuiz error:', error);
            // Non-critical - don't throw
        }
    }

    // ========== Phase 3C: Morphology Persistence ==========

    /**
     * Updates the morphology breakdown for a specific training unit.
     * Persists to Firestore to avoid regenerating with Gemini.
     */
    async updateUnitMorphology(
        sessionId: string,
        unitId: string,
        morphology: import('@dosfilos/domain').MorphologyBreakdown
    ): Promise<void> {
        const sessionRef = doc(db, this.sessionsCollection, sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const sessionData = sessionSnap.data();
        const units = sessionData.units || [];

        const unitIndex = units.findIndex((u: any) => u.id === unitId);
        if (unitIndex === -1) {
            throw new Error(`Unit ${unitId} not found in session ${sessionId}`);
        }

        // Update the specific unit's morphology
        units[unitIndex].morphologyBreakdown = removeUndefined(morphology);

        await updateDoc(sessionRef, {
            units,
            updatedAt: new Date()
        });

        console.log(`[FirestoreGreekSessionRepository] Updated morphology for unit ${unitId}`);
    }

    // ========== Phase 3D: Passage Caching (Global) ==========

    private passageCacheCollection = 'passage_cache';

    /**
     * Normalizes a biblical reference to use as cache key
     * E.g., "Romanos 12:1-2" → "romanos_12_1_2"
     */
    private normalizeReference(reference: string): string {
        return reference.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/:/g, '_')
            .replace(/-/g, '_')
            .replace(/[^a-z0-9_]/g, '');
    }

    /**
     * Retrieves a cached passage from Firestore by reference.
     * Returns null if not cached.
     */
    async getCachedPassage(reference: string): Promise<import('@dosfilos/domain').BiblicalPassage | null> {
        try {
            const cacheKey = this.normalizeReference(reference);
            const cacheRef = doc(db, this.passageCacheCollection, cacheKey);
            const cacheSnap = await getDoc(cacheRef);

            if (!cacheSnap.exists()) {
                console.log(`[FirestoreGreekSessionRepository] Passage cache MISS for: ${reference}`);
                return null;
            }

            const data = cacheSnap.data();

            // Update usage stats
            await updateDoc(cacheRef, {
                lastUsedAt: new Date(),
                usageCount: (data.usageCount || 0) + 1
            });

            console.log(`[FirestoreGreekSessionRepository] Passage cache HIT for: ${reference} (used ${data.usageCount || 0} times)`);

            return {
                reference: data.reference,
                rv60Text: data.rv60Text,
                greekText: data.greekText,
                transliteration: data.transliteration,
                words: data.words || []
            };
        } catch (error) {
            console.error('[FirestoreGreekSessionRepository] getCachedPassage error:', error);
            return null; // Non-critical - proceed without cache
        }
    }

    /**
     * Caches a passage in Firestore for reuse
     * Non-critical: If caching fails (e.g., permissions), feature still works without cache
     */
    async cachePassage(passage: import('@dosfilos/domain').BiblicalPassage): Promise<void> {
        try {
            const cacheKey = this.normalizeReference(passage.reference);
            const cacheRef = doc(db, this.passageCacheCollection, cacheKey);

            await setDoc(cacheRef, {
                reference: passage.reference,
                rv60Text: passage.rv60Text,
                greekText: passage.greekText,
                transliteration: passage.transliteration,
                words: passage.words,
                createdAt: new Date(),
                lastUsedAt: new Date(),
                usageCount: 1
            });

            console.log(`[FirestoreGreekSessionRepository] Cached passage: ${passage.reference}`);
        } catch (error) {
            // Non-critical error - feature works without cache
            console.warn('[FirestoreGreekSessionRepository] Could not cache passage (permissions or other issue). Feature will work but won\'t benefit from caching:', error);
        }
    }

    // ========== Phase 4A: Session Management ==========

    /**
     * Deletes a session from Firestore
     */
    async deleteSession(sessionId: string): Promise<void> {
        try {
            const sessionRef = doc(db, this.sessionsCollection, sessionId);
            await deleteDoc(sessionRef);
            console.log(`[FirestoreGreekSessionRepository] Deleted session: ${sessionId}`);
        } catch (error) {
            console.error('[FirestoreGreekSessionRepository] deleteSession error:', error);
            throw new Error(`Failed to delete session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // ========== Phase 4B: Syntax Analysis Caching (Global) ==========

    /**
     * Retrieves cached syntax analysis from Firestore by passage reference.
     * Returns null if not cached.
     * 
     * Caching strategy:
     * - Global cache (not per-user, not per-session)
     * - Cache key: normalized passage reference
     * - Significantly reduces Gemini API calls for common passages
     */
    async getCachedSyntaxAnalysis(
        reference: string
    ): Promise<import('@dosfilos/domain').PassageSyntaxAnalysis | null> {
        try {
            const normalizedRef = this.normalizeReference(reference);
            const cacheRef = doc(db, this.syntaxAnalysisCacheCollection, normalizedRef);
            const cacheSnap = await getDoc(cacheRef);

            if (cacheSnap.exists()) {
                const data = cacheSnap.data();
                console.log(`[FirestoreGreekSessionRepository] Syntax analysis cache hit for: ${reference}`);

                // Reconstruct the domain entity from Firestore data
                return {
                    passageReference: data.passageReference,
                    clauses: data.clauses,
                    rootClauseId: data.rootClauseId,
                    structureDescription: data.structureDescription,
                    analyzedAt: data.analyzedAt?.toDate() || new Date()
                } as import('@dosfilos/domain').PassageSyntaxAnalysis;
            }

            console.log(`[FirestoreGreekSessionRepository] No cached syntax analysis for: ${reference}`);
            return null;
        } catch (error) {
            console.error('[FirestoreGreekSessionRepository] getCachedSyntaxAnalysis error:', error);
            // Non-critical: return null if cache read fails
            return null;
        }
    }

    /**
     * Caches syntax analysis in Firestore for reuse
     * 
     * Non-critical operation:
     * - If caching fails (e.g., permissions), the feature still works
     * - The next request will just regenerate with Gemini
     * 
     * Document structure:
     * - Collection: syntax_analysis_cache
     * - Document ID: {normalized_reference} (e.g., "romanos_12_1_2")
     * - Fields: passageReference, clauses, rootClauseId, structureDescription, analyzedAt, usageCount
     */
    async cacheSyntaxAnalysis(
        analysis: import('@dosfilos/domain').PassageSyntaxAnalysis
    ): Promise<void> {
        try {
            const normalizedRef = this.normalizeReference(analysis.passageReference);
            const cacheRef = doc(db, this.syntaxAnalysisCacheCollection, normalizedRef);

            // Check if already exists to increment usage count
            const existingSnap = await getDoc(cacheRef);
            const usageCount = existingSnap.exists()
                ? (existingSnap.data()?.usageCount || 0) + 1
                : 1;

            const cacheData = {
                passageReference: analysis.passageReference,
                clauses: analysis.clauses,
                rootClauseId: analysis.rootClauseId,
                structureDescription: analysis.structureDescription,
                analyzedAt: analysis.analyzedAt,
                usageCount,
                lastAccessedAt: new Date()
            };

            await setDoc(cacheRef, removeUndefined(cacheData));
            console.log(
                `[FirestoreGreekSessionRepository] Cached syntax analysis for: ${analysis.passageReference} ` +
                `(usage: ${usageCount})`
            );
        } catch (error) {
            console.error('[FirestoreGreekSessionRepository] cacheSyntaxAnalysis error:', error);
            // Non-critical: don't throw, just log the error
            // The feature works fine without caching, just slower
        }
    }
}

