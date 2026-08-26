import { addDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Un hallazgo del analizador griego que el pastor guardó PARA SU SERMÓN.
 * El formato de `formatted` es EXACTAMENTE el de las palabras clave del
 * taller ("*lema* (translit) — significancia"): el puente entero es que la
 * sección de palabras clave lo ofrezca como propuesta sin traducción alguna.
 */
export interface GreekFinding {
    reference: string;
    lemma: string;
    formatted: string;
    createdAt: Date;
}

/**
 * Hallazgos POR USUARIO, no por sermón: desde el analizador no se sabe en
 * qué sermón se va a usar, y obligar a elegirlo rompería el flujo de
 * estudio. El taller los ofrece como propuestas en CUALQUIER sermón del
 * usuario; decidir cuál pertenece a qué punto ya es su gesto de siempre
 * (usar / descartar).
 */
export class FirestoreGreekFindingsRepository {
    private coleccion(uid: string) {
        return collection(db, 'users', uid, 'greekFindings');
    }

    async save(uid: string, finding: Omit<GreekFinding, 'createdAt'>): Promise<void> {
        await addDoc(this.coleccion(uid), { ...finding, createdAt: new Date() });
    }

    async list(uid: string): Promise<GreekFinding[]> {
        const snap = await getDocs(query(this.coleccion(uid), orderBy('createdAt', 'desc')));
        return snap.docs.map((d) => d.data() as GreekFinding);
    }
}
