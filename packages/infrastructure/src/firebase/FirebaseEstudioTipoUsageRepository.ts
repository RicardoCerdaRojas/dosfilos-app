import { doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Frecuencia de uso de cada tipo de elemento al promover, por usuario, para la
 * sección "Más usados" del picker — cross-device. Vive en la subcolección de
 * settings del usuario (`users/{uid}/settings/estudioTipoUsage`), owner-scoped
 * por reglas. Mismo patrón que `FirebaseLibraryCategoryRepository`.
 */
export class FirebaseEstudioTipoUsageRepository {
    private getRef(userId: string) {
        return doc(db, 'users', userId, 'settings', 'estudioTipoUsage');
    }

    async getUsage(userId: string): Promise<Record<string, number>> {
        const snap = await getDoc(this.getRef(userId));
        if (!snap.exists()) return {};
        const counts = (snap.data().counts ?? {}) as Record<string, number>;
        return counts && typeof counts === 'object' ? counts : {};
    }

    /** Incrementa el contador del tipo. Crea el doc/campo si no existe. */
    async recordUsage(userId: string, tipo: string): Promise<void> {
        await setDoc(
            this.getRef(userId),
            { counts: { [tipo]: increment(1) }, updatedAt: serverTimestamp() },
            { merge: true },
        );
    }
}
