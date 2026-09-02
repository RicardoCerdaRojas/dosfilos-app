import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { embedQuery } from './retrieveChunks';
import { sanitizeExtractedTextOnly } from './sanitizeExtractedText';

/**
 * Ranking dentro del corpus curado de un trabajo.
 *
 * La diferencia con `retrieveChunks` no es el algoritmo —es el mismo índice
 * vectorial— sino el ALCANCE: acá el resultado se recorta a las hojas que el
 * usuario admitió en cada fuente. Firestore devuelve lo más cercano de todo el
 * libro; de eso solo sirve lo que la receta declara, porque el resto son
 * páginas que el usuario decidió dejar afuera.
 *
 * Por qué existe en vez de ampliar `retrieveChunks`: esa callable sirve al
 * tutor, a Faculty y al proponente de tramos, todos con alcance "biblioteca" o
 * "recurso". Meterle un filtro por rangos de hoja la obligaría a hablar del
 * modelo de exégesis, que es justo lo que no sabe.
 *
 * NO trae los tramos fijados. Esos entran completos y sin competir, así que se
 * leen con `getDocumentChunks` —que ya sabe lotear— desde la capa que arma el
 * prompt. Mezclarlos acá volvería esta callable responsable de dos políticas
 * distintas.
 */

const CHUNK_COLLECTION = 'document_chunks';

/**
 * Fuentes por consulta. El `IN` de Firestore corta en 30; el tope real de
 * corpus que se diseñó son doce fuentes, así que hay margen y el error llega
 * como mensaje claro en vez de como fallo de la consulta.
 */
const MAX_SOURCES = 25;

/**
 * Cuántos candidatos pedirle al índice POR FUENTE.
 *
 * Por fuente y no en una consulta única, aunque una sola sería más barata. Con
 * un pool compartido las fuentes grandes se lo comen: medido sobre tres
 * comentarios reales, un `IN` con topK=200 devolvió 36 fragmentos de Bruce, 38
 * de Sasson y CERO de Stuart — una fuente que el usuario eligió a propósito
 * quedaba muda. Consultando por separado, las tres aportan (16 / 37 / 29) y
 * tarda 2,2 s en paralelo.
 *
 * Es la misma lección que `retrieveChunks` ya había aprendido con
 * `perResourceTopK`, por si hiciera falta una segunda confirmación.
 *
 * El pool es más grande de lo que va a entrar al prompt porque el filtro por
 * receta descarta después: la selección curada de una fuente es ~14% de sus
 * fragmentos.
 */
const DEFAULT_POOL = 60;
const MAX_POOL = 200;

interface SheetRange {
    start: number;
    end: number;
}

interface SourceScope {
    resourceId: string;
    /** Hojas que el usuario admitió para esta fuente. */
    sheetRanges: SheetRange[];
}

interface RetrieveRequest {
    userId: string;
    query: string;
    sources: SourceScope[];
    pool?: number;
}

function withinRanges(sheet: unknown, ranges: SheetRange[]): boolean {
    if (typeof sheet !== 'number') return false;
    return ranges.some(r => sheet >= r.start && sheet <= r.end);
}

export const retrieveCuratedCorpus = onCall<RetrieveRequest>(
    {
        ...appCheckCallableOptions(),
        region: 'us-central1',
        memory: '512MiB',
        secrets: ['GEMINI_API_KEY'],
        timeoutSeconds: 120,
    },
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret not configured');

        const data = request.data ?? ({} as RetrieveRequest);
        const query = typeof data.query === 'string' ? data.query.trim() : '';
        if (!query) throw new HttpsError('invalid-argument', 'query is required');

        // Mismo criterio que `retrieveChunks`: el userId que llega tiene que ser
        // el del llamador, para que un cliente comprometido no lea la
        // biblioteca de otro.
        if (data.userId && data.userId !== request.auth.uid) {
            throw new HttpsError('permission-denied', 'userId must match authenticated user');
        }
        const uid = request.auth.uid;

        const sources = Array.isArray(data.sources) ? data.sources : [];
        if (sources.length === 0) return { chunks: [], sourcesQueried: 0 };
        if (sources.length > MAX_SOURCES) {
            throw new HttpsError('invalid-argument', `sources excede ${MAX_SOURCES} fuentes`);
        }

        const byResource = new Map<string, SheetRange[]>();
        for (const source of sources) {
            const id = typeof source?.resourceId === 'string' ? source.resourceId : '';
            const ranges = Array.isArray(source?.sheetRanges) ? source.sheetRanges : [];
            if (!id || ranges.length === 0) continue;
            byResource.set(id, ranges);
        }
        if (byResource.size === 0) return { chunks: [], sourcesQueried: 0 };

        const pool = Math.min(
            MAX_POOL,
            Math.max(1, Number.isFinite(data.pool) ? Number(data.pool) : DEFAULT_POOL),
        );

        const db = getFirestore();
        const vector = await embedQuery(query, apiKey);
        const queryVector = FieldValue.vector(vector);

        // Una consulta por fuente, en paralelo. El orden de las cláusulas NO es
        // cosmético: el índice vectorial se eligió con el prefijo
        // `userId → resourceId` y consultarlo de otra forma falla con
        // "Missing vector index configuration". `retrieveChunks` lo documenta
        // por el mismo motivo.
        const perSource = await Promise.all(
            [...byResource.entries()].map(async ([resourceId, ranges]) => {
                try {
                    const snapshot = await db
                        .collection(CHUNK_COLLECTION)
                        .where('userId', '==', uid)
                        .where('resourceId', '==', resourceId)
                        .findNearest({
                            vectorField: 'embedding',
                            queryVector,
                            limit: pool,
                            distanceMeasure: 'COSINE',
                            distanceResultField: '_distance',
                        })
                        .get();

                    const kept = snapshot.docs
                        .map(doc => doc.data())
                        // Acá manda la curaduría: lo que el usuario no admitió
                        // no entra, por cerca que haya quedado.
                        .filter(d => withinRanges(d.metadata?.page, ranges))
                        .map(d => ({
                            resourceId,
                            chunkIndex: typeof d.chunkIndex === 'number' ? d.chunkIndex : 0,
                            text: sanitizeExtractedTextOnly(typeof d.text === 'string' ? d.text : ''),
                            sheet: typeof d.metadata?.page === 'number' ? d.metadata.page : null,
                            section: typeof d.metadata?.section === 'string' ? d.metadata.section : null,
                            // `COSINE` devuelve DISTANCIA: 0 es idéntico. Se
                            // invierte para que quien reciba esto ordene por
                            // "más grande es mejor", como el resto del sistema.
                            score: Math.max(0, Math.min(1, 1 - (typeof d._distance === 'number' ? d._distance : 1))),
                        }));

                    return { resourceId, pool: snapshot.size, kept, failed: false };
                } catch (err) {
                    // Una fuente rota no puede llevarse puesto el corpus entero:
                    // el paso se genera con las demás y se informa cuál faltó.
                    console.warn('[CuratedCorpus] fuente sin resultados', {
                        resourceId,
                        error: (err as Error).message,
                    });
                    return { resourceId, pool: 0, kept: [], failed: true };
                }
            }),
        );

        const chunks = perSource.flatMap(r => r.kept);
        const failedSources = perSource.filter(r => r.failed).map(r => r.resourceId);
        const emptySources = perSource
            .filter(r => !r.failed && r.kept.length === 0)
            .map(r => r.resourceId);

        console.log('[CuratedCorpus] ranking', {
            sources: byResource.size,
            poolPerSource: pool,
            afterRecipeFilter: chunks.length,
            failed: failedSources.length,
            empty: emptySources.length,
        });

        return {
            chunks,
            sourcesQueried: byResource.size,
            failedSources,
            emptySources,
        };
    },
);
