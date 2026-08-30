import { getFunctions, httpsCallable } from 'firebase/functions';
import type { DocumentChunk, IDocumentChunkReader } from '@dosfilos/domain';

/**
 * Lee fragmentos por índice a través de `getDocumentChunks`.
 *
 * La misma callable que usa la selección estructural: el selector de páginas no
 * necesitó una ruta propia porque, una vez traducidas las hojas a rangos de
 * fragmentos, la pregunta al servidor es idéntica.
 *
 * La lectura va en LOTES. El servidor rechaza una petición que cubra más de 200
 * fragmentos o más de 50 tramos, y esos topes están bien —protegen contra una
 * petición degenerada— pero el cliente no tiene por qué chocarlos: una
 * selección de cincuenta páginas de un comentario denso los pasa sin nada raro,
 * y el usuario recibía un 400 y perdía el guardado entero.
 */

interface ChunkRange {
    start: number;
    end: number;
}

interface ChunksResponse {
    chunks: Array<{ chunkIndex: number; text: string; page: number | null; section: string | null }>;
}

const TIMEOUT_MS = 30_000;

/**
 * Topes por petición. Deben quedar POR DEBAJO de los del servidor
 * (`documentStructure.ts`), no iguales: si alguna vez se bajan allá, el cliente
 * sigue entrando en vez de empezar a fallar.
 */
const MAX_CHUNKS_PER_BATCH = 180;
const MAX_RANGES_PER_BATCH = 40;

export class CallableDocumentChunkReader implements IDocumentChunkReader {
    async readChunks(
        resourceId: string,
        chunkRanges: ReadonlyArray<ChunkRange>,
    ): Promise<ReadonlyArray<DocumentChunk>> {
        if (chunkRanges.length === 0) return [];

        const batches = batchRanges(chunkRanges, MAX_CHUNKS_PER_BATCH, MAX_RANGES_PER_BATCH);
        const callable = httpsCallable<
            { resourceId: string; ranges: ChunkRange[] },
            ChunksResponse
        >(getFunctions(), 'getDocumentChunks', { timeout: TIMEOUT_MS });

        const out: DocumentChunk[] = [];
        // Secuencial: son pocas vueltas y en paralelo multiplicarían el pico de
        // lecturas de un usuario contra el rate-limit compartido.
        for (const batch of batches) {
            const response = await callable({ resourceId, ranges: batch.map(r => ({ ...r })) });
            out.push(...(response.data?.chunks ?? []));
        }

        if (batches.length > 1) {
            console.log('[DocumentChunkReader] lectura en lotes', {
                resourceId,
                batches: batches.length,
                chunks: out.length,
            });
        }
        return out;
    }
}

/**
 * Parte una lista de tramos en lotes que respeten los dos topes.
 *
 * Un tramo que por sí solo pase el tope de fragmentos se corta en pedazos: el
 * comentario de 425 páginas produce tramos de cientos de fragmentos seguidos, y
 * negarse a partirlos dejaría exactamente el caso que rompe sin resolver.
 */
export function batchRanges(
    ranges: ReadonlyArray<ChunkRange>,
    maxChunks: number,
    maxRanges: number,
): ChunkRange[][] {
    const batches: ChunkRange[][] = [];
    let current: ChunkRange[] = [];
    let currentChunks = 0;

    const flush = () => {
        if (current.length > 0) batches.push(current);
        current = [];
        currentChunks = 0;
    };

    for (const range of ranges) {
        let cursor = range.start;
        while (cursor <= range.end) {
            if (currentChunks >= maxChunks || current.length >= maxRanges) flush();
            const room = maxChunks - currentChunks;
            const end = Math.min(range.end, cursor + room - 1);
            current.push({ start: cursor, end });
            currentChunks += end - cursor + 1;
            cursor = end + 1;
        }
    }
    flush();
    return batches;
}
