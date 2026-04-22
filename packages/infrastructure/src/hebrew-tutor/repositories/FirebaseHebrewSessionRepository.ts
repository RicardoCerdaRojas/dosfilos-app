import type { IHebrewSessionRepository, VerseAnalysis } from '@dosfilos/domain';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

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

export class FirebaseHebrewSessionRepository implements IHebrewSessionRepository {
    private readonly cacheCollection = 'hebrew_analysis_cache';

    async getCachedAnalysis(reference: string): Promise<VerseAnalysis | null> {
        try {
            const cacheKey = reference.replace(/\./g, '_') + '_v2'; // e.g. Jonah.2.3 -> Jonah_2_3_v2
            const docRef = doc(db, this.cacheCollection, cacheKey);
            const snapshot = await getDoc(docRef);

            if (!snapshot.exists()) {
                return null;
            }

            console.log(`[FirebaseHebrewSessionRepository] Cache hit for ${reference}`);
            return snapshot.data().analysis as VerseAnalysis;
        } catch (error) {
            console.error('[FirebaseHebrewSessionRepository] Error reading cache:', error);
            // Non-critical, return null to proceed with fresh analysis
            return null;
        }
    }

    async cacheAnalysis(reference: string, analysis: VerseAnalysis): Promise<void> {
        try {
            const cacheKey = reference.replace(/\./g, '_') + '_v2';
            const docRef = doc(db, this.cacheCollection, cacheKey);

            await setDoc(docRef, removeUndefined({
                reference,
                analysis,
                cachedAt: new Date(),
                usageCount: 1 // We can increment this later if we update the doc on read
            }));

            console.log(`[FirebaseHebrewSessionRepository] Cached analysis for ${reference}`);
        } catch (error) {
            console.error('[FirebaseHebrewSessionRepository] Error caching analysis:', error);
            // Non-critical, just won't cache
        }
    }

    async getSavedAnalyses(): Promise<VerseAnalysis[]> {
        // For MVP, just return the most recently cached global analyses
        // If we want user-specific history, we would need a user_id filter
        try {
            const cacheRef = collection(db, this.cacheCollection);
            const snapshot = await getDocs(cacheRef);
            
            const analyses: VerseAnalysis[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.analysis) {
                    analyses.push(data.analysis as VerseAnalysis);
                }
            });

            return analyses;
        } catch (error) {
            console.error('[FirebaseHebrewSessionRepository] Error reading saved analyses:', error);
            return [];
        }
    }

    async updateTranslation(
        reference: string,
        updates: { literalTranslation?: string; fluidTranslation?: string },
    ): Promise<void> {
        try {
            const cacheKey = reference.replace(/\./g, '_') + '_v2';
            const docRef = doc(db, this.cacheCollection, cacheKey);

            // Build a partial update using Firestore dot-notation paths so that
            // only the patched translation fields are overwritten.
            const patch: Record<string, string> = {};
            if (updates.literalTranslation !== undefined) {
                patch['analysis.literalTranslation'] = updates.literalTranslation;
            }
            if (updates.fluidTranslation !== undefined) {
                patch['analysis.fluidTranslation'] = updates.fluidTranslation;
            }

            if (Object.keys(patch).length === 0) return;

            await updateDoc(docRef, patch);
            console.log(`[FirebaseHebrewSessionRepository] Updated translation for ${reference}`);
        } catch (error) {
            console.error('[FirebaseHebrewSessionRepository] Error updating translation:', error);
            throw error; // Surface to the UI so the user knows it failed
        }
    }
}
