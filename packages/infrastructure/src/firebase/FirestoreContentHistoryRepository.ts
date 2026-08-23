import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
    trimContentHistory,
    type ContentHistoryDoc,
    type IContentHistoryRepository,
    type StoredSectionVersion,
} from '@dosfilos/domain';

/**
 * Historial de versiones en `sermons/{sermonId}/contentHistory/{contentType}`.
 *
 * UN DOCUMENTO POR TIPO DE CONTENIDO, no uno por versión. El historial se lee y
 * se escribe siempre entero —el hook mantiene el mapa completo en memoria—, así
 * que una subcolección de versiones sueltas multiplicaría las lecturas sin
 * ganar nada. El tope de `trimContentHistory` mantiene el documento lejos del
 * máximo de 1 MB.
 *
 * Subcolección del sermón y no colección aparte: hereda la propiedad del
 * documento, así la regla de seguridad es la misma que ya usan `annotations` y
 * `wizardProgress` — el dueño del sermón, y nadie más.
 */
export class FirestoreContentHistoryRepository implements IContentHistoryRepository {
    private ref(sermonId: string, contentType: string) {
        return doc(db, 'sermons', sermonId, 'contentHistory', contentType);
    }

    async load(sermonId: string, contentType: string): Promise<ContentHistoryDoc | null> {
        const snap = await getDoc(this.ref(sermonId, contentType));
        if (!snap.exists()) return null;
        const data = snap.data() as Record<string, unknown>;
        const sections = (data.sections ?? {}) as Record<string, StoredSectionVersion[]>;
        return { contentType, sections };
    }

    async save(sermonId: string, docData: ContentHistoryDoc): Promise<void> {
        const sections = trimContentHistory(docData.sections);
        await setDoc(
            this.ref(sermonId, docData.contentType),
            { contentType: docData.contentType, sections, updatedAt: serverTimestamp() },
            // `merge: false` a propósito: el mapa recortado es la verdad
            // completa. Con merge, una sección eliminada por el tope sobreviviría
            // para siempre porque merge conserva las claves que no viajan.
            { merge: false },
        );
    }
}
