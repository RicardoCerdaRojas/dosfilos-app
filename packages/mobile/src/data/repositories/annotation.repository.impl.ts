import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp,
    setDoc,
    updateDoc,
} from '@react-native-firebase/firestore';
import { HIGHLIGHT_COLORS } from '@dosfilos/domain';
import type { HighlightColor, SermonAnnotation, SermonAnnotationAnchor } from '@dosfilos/domain';

import { AnnotationRepository } from '@/domain/repositories/annotation.repository';
import { getFirebaseAuth, getFirebaseDb } from '@/data/sources/firebase.source';

/**
 * `sermons/{sermonId}/annotations` — las reglas ya restringen la
 * subcolección al dueño del sermón (firestore.rules), así que la tablet
 * escribe directo sin callable.
 *
 * Todo pasa por la caché de disco del SDK nativo: en el púlpito, sin señal,
 * el resaltado aparece igual y la escritura sale de la cola al reconectar
 * (M-02). Por eso las lecturas NO fuerzan `source: 'server'`.
 *
 * TRAMPA DEL SDK: sin red, la promesa de una escritura NO se resuelve hasta
 * que el servidor confirma — puede tardar horas. Esperarla congelaría el
 * púlpito justo cuando más importa. Por eso las tres escrituras aplican en
 * la caché local (efecto inmediato) y la promesa se observa aparte para
 * registrar el fallo, no para bloquear al predicador. El id se genera en el
 * cliente para no depender del ack.
 */
const annotationsRef = (sermonId: string) =>
    collection(getFirebaseDb(), 'sermons', sermonId, 'annotations');

const toDate = (value: unknown): Date => {
    if (value && typeof (value as any).toDate === 'function') return (value as any).toDate();
    if (typeof value === 'number') return new Date(value);
    return new Date();
};

const isHighlightColor = (value: unknown): value is HighlightColor =>
    HIGHLIGHT_COLORS.includes(value as HighlightColor);

export class AnnotationRepositoryImpl implements AnnotationRepository {
    async list(sermonId: string): Promise<SermonAnnotation[]> {
        const snap = await getDocs(annotationsRef(sermonId));
        return snap.docs
            .map((d) => {
                const data = d.data() as any;
                // F2 escribirá tinta y glifos en la misma colección: lo que no
                // sea un resaltado se ignora en vez de romper la pantalla.
                if (data?.type !== 'highlight' || !isHighlightColor(data.color)) return null;
                return {
                    id: d.id,
                    type: 'highlight' as const,
                    sectionSlug: String(data.sectionSlug ?? ''),
                    offset: Number(data.offset ?? 0),
                    length: Number(data.length ?? 0),
                    exact: String(data.exact ?? ''),
                    prefix: String(data.prefix ?? ''),
                    suffix: String(data.suffix ?? ''),
                    color: data.color,
                    createdAt: toDate(data.createdAt),
                    updatedAt: toDate(data.updatedAt),
                    updatedBy: data.updatedBy === 'web' ? ('web' as const) : ('mobile' as const),
                } satisfies SermonAnnotation;
            })
            .filter((a): a is SermonAnnotation => a !== null && a.exact.length > 0);
    }

    async createHighlight(
        sermonId: string,
        anchor: SermonAnnotationAnchor,
        color: HighlightColor,
    ): Promise<SermonAnnotation> {
        const now = new Date();
        const ref = doc(annotationsRef(sermonId));
        settleOffline(
            setDoc(ref, {
                ...anchor,
                type: 'highlight',
                color,
                userId: getFirebaseAuth().currentUser?.uid ?? null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                updatedBy: 'mobile',
            }),
            `create ${ref.id}`,
        );
        return {
            ...anchor,
            id: ref.id,
            type: 'highlight',
            color,
            createdAt: now,
            updatedAt: now,
            updatedBy: 'mobile',
        };
    }

    async updateColor(sermonId: string, annotationId: string, color: HighlightColor): Promise<void> {
        settleOffline(
            updateDoc(doc(annotationsRef(sermonId), annotationId), {
                color,
                updatedAt: serverTimestamp(),
                updatedBy: 'mobile',
            }),
            `updateColor ${annotationId}`,
        );
    }

    async remove(sermonId: string, annotationId: string): Promise<void> {
        settleOffline(deleteDoc(doc(annotationsRef(sermonId), annotationId)), `remove ${annotationId}`);
    }
}

/**
 * Observa una escritura sin esperarla: la caché local ya aplicó el cambio y
 * el SDK reintenta solo. Un fallo real (permisos, doc inexistente) queda en
 * el log en vez de perderse en silencio.
 */
function settleOffline(write: Promise<unknown>, label: string): void {
    write.catch((error) => console.warn(`[annotations] ${label} failed:`, error));
}
