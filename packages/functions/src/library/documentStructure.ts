import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Lectura ESTRUCTURAL del índice de un documento.
 *
 * `retrieveChunks` responde "qué se parece a esta consulta". Estas dos
 * callables responden otra pregunta, que para exégesis es la que importa:
 * "qué parte de este libro trata este pasaje".
 *
 *   - `getDocumentOutline` devuelve la tabla de contenidos: los encabezados
 *     que el indexador ya guardó por chunk, agrupados en tramos. El cliente
 *     los convierte en referencias bíblicas (`documentOutline` en
 *     `@dosfilos/domain`) y decide qué tramos pedir.
 *   - `getDocumentChunks` devuelve el texto de esos tramos, en orden.
 *
 * Ninguna de las dos embebe nada ni llama al modelo: son consultas planas
 * sobre `document_chunks`. Por eso el camino estructural es más barato que
 * el semántico, además de más exacto.
 *
 * Por qué el parseo de referencias NO vive acá: `packages/functions` no
 * puede importar `@dosfilos/domain` (corren en runtimes distintos y el
 * paquete no está en sus dependencias), y la tabla del canon con sus alias
 * vive en domain. Duplicarla acá sería una tercera copia que se desincroniza
 * en silencio. El servidor entrega estructura cruda; quien la interpreta es
 * el cliente, que sí puede importar el canon.
 */

const CHUNK_COLLECTION = 'document_chunks';

/**
 * Tope de chunks que `getDocumentChunks` devuelve en una llamada. Un
 * comentario denso sobre una pericopa larga puede caer en una sección de
 * cientos de chunks; el prompt no los va a poder usar igual, y devolverlos
 * solo sirve para acercarse al tope de 10 MB del transporte.
 */
const MAX_CHUNKS_PER_REQUEST = 200;

/** Tope de tramos por petición. Protege contra una lista degenerada. */
const MAX_RANGES_PER_REQUEST = 50;

interface OutlineRequest {
    resourceId: string;
}

interface ChunkRangeInput {
    start: number;
    end: number;
}

interface ChunksRequest {
    resourceId: string;
    ranges: ChunkRangeInput[];
}

/**
 * Un tramo de chunks consecutivos que comparten encabezado.
 *
 * Se agrupa a propósito: un libro de 425 páginas indexa ~1.200 chunks y la
 * enorme mayoría de los consecutivos comparte `section` y `sectionPath`.
 * Mandar una entrada por chunk multiplica por seis el payload sin agregar
 * un solo dato.
 */
interface OutlineSection {
    startChunk: number;
    endChunk: number;
    /** Página donde arranca el tramo. */
    page: number;
    section: string | null;
    sectionPath: string[];
}

/**
 * Verifica que el llamador pueda leer los chunks de un recurso.
 *
 * Se valida sobre los CHUNKS, no sobre `library_resources`: son los chunks
 * los que se devuelven, y son ellos los que llevan el `userId` del dueño y
 * los `stores` de la biblioteca compartida. Un recurso personal de otro
 * usuario no pasa este filtro aunque el llamador conozca su id.
 */
function isReadable(data: FirebaseFirestore.DocumentData, uid: string): boolean {
    if (data.userId === uid) return true;
    // Biblioteca CORE: contenido curado y compartido, marcado por pertenecer
    // a uno o más stores. No tiene dueño individual.
    return Array.isArray(data.stores) && data.stores.length > 0;
}

function requireResourceId(value: unknown): string {
    const resourceId = typeof value === 'string' ? value.trim() : '';
    if (!resourceId) {
        throw new HttpsError('invalid-argument', 'resourceId is required');
    }
    return resourceId;
}

/**
 * Devuelve la tabla de contenidos de un documento indexado.
 *
 * Sin embeddings y sin texto: solo dónde empieza y termina cada sección.
 * Para el comentario más grande de la prueba (1.185 chunks) esto colapsa a
 * unos cientos de tramos.
 */
export const getDocumentOutline = onCall<OutlineRequest>(
    { ...appCheckCallableOptions(), region: 'us-central1' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign-in required');
        }
        const uid = request.auth.uid;
        const resourceId = requireResourceId(request.data?.resourceId);

        const db = getFirestore();
        const snapshot = await db
            .collection(CHUNK_COLLECTION)
            .where('resourceId', '==', resourceId)
            .select('chunkIndex', 'metadata', 'userId', 'stores')
            .get();

        if (snapshot.empty) {
            return { sections: [], chunkCount: 0 };
        }

        const readable = snapshot.docs
            .map(d => d.data())
            .filter(data => isReadable(data, uid));

        if (readable.length === 0) {
            throw new HttpsError('permission-denied', 'Resource not readable by this user');
        }

        const entries = readable
            .map(data => ({
                chunkIndex: typeof data.chunkIndex === 'number' ? data.chunkIndex : 0,
                page: typeof data.metadata?.page === 'number' ? data.metadata.page : 0,
                section: typeof data.metadata?.section === 'string' ? data.metadata.section : null,
                sectionPath: Array.isArray(data.metadata?.sectionPath)
                    ? data.metadata.sectionPath.filter((s: unknown): s is string => typeof s === 'string')
                    : [],
            }))
            .sort((a, b) => a.chunkIndex - b.chunkIndex);

        const sections: OutlineSection[] = [];
        for (const entry of entries) {
            const last = sections[sections.length - 1];
            const sameHeading = last
                && last.section === entry.section
                && last.sectionPath.length === entry.sectionPath.length
                && last.sectionPath.every((s, i) => s === entry.sectionPath[i]);

            if (sameHeading && entry.chunkIndex === last!.endChunk + 1) {
                last!.endChunk = entry.chunkIndex;
            } else {
                sections.push({
                    startChunk: entry.chunkIndex,
                    endChunk: entry.chunkIndex,
                    page: entry.page,
                    section: entry.section,
                    sectionPath: entry.sectionPath,
                });
            }
        }

        console.log(`[DocumentOutline] ${resourceId}: ${entries.length} chunks → ${sections.length} tramos`);
        return { sections, chunkCount: entries.length };
    },
);

/**
 * Devuelve el TEXTO de tramos concretos, en orden de `chunkIndex`.
 *
 * Los ids de chunk son deterministas (`{resourceId}_chunk_{n}`), así que se
 * leen por `getAll` en vez de con una consulta con rango: una lectura
 * puntual por chunk, sin índice compuesto y sin traer el vector de
 * embeddings de cada documento.
 */
export const getDocumentChunks = onCall<ChunksRequest>(
    { ...appCheckCallableOptions(), region: 'us-central1' },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign-in required');
        }
        const uid = request.auth.uid;
        const resourceId = requireResourceId(request.data?.resourceId);
        const ranges = Array.isArray(request.data?.ranges) ? request.data.ranges : [];

        if (ranges.length === 0) return { chunks: [] };
        if (ranges.length > MAX_RANGES_PER_REQUEST) {
            throw new HttpsError('invalid-argument', `ranges excede ${MAX_RANGES_PER_REQUEST} tramos`);
        }

        const indices: number[] = [];
        for (const range of ranges) {
            const start = Number(range?.start);
            const end = Number(range?.end);
            if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) {
                throw new HttpsError('invalid-argument', 'ranges must be integer {start, end} with end >= start');
            }
            for (let i = start; i <= end; i++) {
                indices.push(i);
                if (indices.length > MAX_CHUNKS_PER_REQUEST) {
                    throw new HttpsError('invalid-argument', `ranges cubren más de ${MAX_CHUNKS_PER_REQUEST} chunks`);
                }
            }
        }

        const db = getFirestore();
        const refs = indices.map(i => db.collection(CHUNK_COLLECTION).doc(`${resourceId}_chunk_${i}`));
        const docs = await db.getAll(...refs, {
            fieldMask: ['chunkIndex', 'text', 'metadata', 'userId', 'stores'],
        });

        const chunks = docs
            .filter(d => d.exists)
            .map(d => d.data()!)
            .filter(data => isReadable(data, uid))
            .map(data => ({
                chunkIndex: typeof data.chunkIndex === 'number' ? data.chunkIndex : 0,
                text: typeof data.text === 'string' ? data.text : '',
                page: typeof data.metadata?.page === 'number' ? data.metadata.page : null,
                section: typeof data.metadata?.section === 'string' ? data.metadata.section : null,
            }))
            .sort((a, b) => a.chunkIndex - b.chunkIndex);

        console.log(`[DocumentChunks] ${resourceId}: pedidos ${indices.length}, devueltos ${chunks.length}`);
        return { chunks };
    },
);
