import { getFunctions, httpsCallable } from 'firebase/functions';
import type { DocumentChunk, IDocumentChunkReader } from '@dosfilos/domain';

/**
 * Lee fragmentos por índice a través de `getDocumentChunks`.
 *
 * La misma callable que usa la selección estructural: el selector de páginas no
 * necesitó una ruta propia porque, una vez traducidas las hojas a rangos de
 * fragmentos, la pregunta al servidor es idéntica.
 */

interface ChunksResponse {
    chunks: Array<{ chunkIndex: number; text: string; page: number | null; section: string | null }>;
}

const TIMEOUT_MS = 30_000;

export class CallableDocumentChunkReader implements IDocumentChunkReader {
    async readChunks(
        resourceId: string,
        chunkRanges: ReadonlyArray<{ start: number; end: number }>,
    ): Promise<ReadonlyArray<DocumentChunk>> {
        if (chunkRanges.length === 0) return [];

        const callable = httpsCallable<
            { resourceId: string; ranges: Array<{ start: number; end: number }> },
            ChunksResponse
        >(getFunctions(), 'getDocumentChunks', { timeout: TIMEOUT_MS });

        const response = await callable({ resourceId, ranges: chunkRanges.map(r => ({ ...r })) });
        return response.data?.chunks ?? [];
    }
}
