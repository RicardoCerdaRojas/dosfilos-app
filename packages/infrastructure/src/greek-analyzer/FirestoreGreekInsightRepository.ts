import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { GreekVerseInsight } from '@dosfilos/domain';

/**
 * Caché GLOBAL de análisis por versículo — el patrón de
 * `hebrew_analysis_cache`: el texto griego es el mismo para todos, así que un
 * análisis pagado una vez sirve a todos los usuarios. Lectura y escritura
 * autenticadas, borrado prohibido (reglas de Firestore).
 */
export class FirestoreGreekInsightRepository {
    private readonly collection = 'greek_insight_cache';

    /** "JAS 1:2" → "JAS_1_2" — los ids de documento no admiten «/». */
    private key(reference: string): string {
        return reference.replace(/[\s:]+/g, '_');
    }

    async get(reference: string): Promise<GreekVerseInsight | null> {
        try {
            const snap = await getDoc(doc(db, this.collection, this.key(reference)));
            return snap.exists() ? (snap.data() as GreekVerseInsight) : null;
        } catch (err) {
            // El caché nunca bloquea el análisis: sin él, se paga de nuevo.
            console.warn('[greek-insight] cache read failed', err);
            return null;
        }
    }

    async save(insight: GreekVerseInsight): Promise<void> {
        try {
            await setDoc(doc(db, this.collection, this.key(insight.reference)), {
                ...insight,
                cachedAt: new Date(),
            });
        } catch (err) {
            console.warn('[greek-insight] cache write failed', err);
        }
    }
}
