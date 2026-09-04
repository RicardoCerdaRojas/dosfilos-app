import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { indexResourceChunks } from './indexStructuredDocument';
import { shouldAutoIndex } from './shouldAutoIndex';

/**
 * Disparador de Firestore: cuando la extracción de un recurso queda
 * lista, se arma solo su índice RAG (chunks + embeddings).
 *
 * Es `onDocumentWritten` y no `onDocumentUpdated` a propósito. El
 * anterior exigía una TRANSICIÓN de `textExtractionStatus` a `ready`:
 * la subida normal la produce, pero un documento que NACE en `ready`
 * no produce ninguna — y ese es el caso de la biblioteca clonada de la
 * cuenta embajador, cuyos libros nunca se indexaron. La condición vive
 * ahora en `shouldAutoIndex`, con pruebas.
 *
 * El trabajo NO corre acá. Los disparadores de Firestore tienen 540 s
 * de tope duro y un libro grande no cabe —Wallace produce 959 chunks—,
 * así que el disparador decide y encola, y `indexResourceTask` indexa
 * con 900 s y reintentos. Lo que sí cabe en 540 s es tomar la decisión.
 */
export const autoIndexOnExtractionReady = onDocumentWritten(
    {
        document: 'library_resources/{resourceId}',
        region: 'us-central1',
        // Este disparador ya no hace el trabajo pesado: decide, encola y
        // sale. La memoria alta y los 540 s quedan por el camino de
        // respaldo de abajo, que sí indexa en línea cuando la cola no
        // está disponible.
        memory: '2GiB',
        timeoutSeconds: 540,
        secrets: ['GEMINI_API_KEY'],
    },
    async (event) => {
        const resourceId = event.params.resourceId;
        const decision = shouldAutoIndex(
            event.data?.before.data(),
            event.data?.after.data(),
        );

        if (!decision.index) {
            // Sólo se registran los motivos que dicen algo. «No está
            // lista» y «ya estaba lista» ocurren en cada tecleo sobre el
            // documento y llenarían el log de ruido.
            if (decision.reason !== 'not-ready' && decision.reason !== 'already-was-ready' && decision.reason !== 'deleted') {
                console.log(`[AutoIndex] ${resourceId}: omitido (${decision.reason})`);
            }
            return;
        }

        try {
            await getFunctions()
                .taskQueue('locations/us-central1/functions/indexResourceTask')
                .enqueue({ resourceId }, { dispatchDeadlineSeconds: 900 });
            console.log(`[AutoIndex] ${resourceId}: encolado para indexar`);
            return;
        } catch (err: any) {
            // La cola es la que quita el techo de 540 s, pero no puede
            // ser un punto único de fallo: si no se pudo encolar, se
            // indexa acá mismo. Un libro chico entra sin problema y uno
            // grande queda como estaba antes de este cambio — nunca
            // peor. Y se dice, porque un encolado que falla en silencio
            // volvería a dejar libros sin indexar sin que nadie lo note.
            console.error(`[AutoIndex] ${resourceId}: no se pudo encolar (${err?.message ?? err}); se indexa en línea`);
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            console.error(`[AutoIndex] ${resourceId}: falta GEMINI_API_KEY; no se puede indexar`);
            return;
        }

        try {
            const result = await indexResourceChunks(resourceId, { force: false, geminiKey });
            if ('skipped' in result && result.skipped) {
                console.log(`[AutoIndex] ${resourceId}: omitido (${result.reason})`);
            } else if ('chunkCount' in result) {
                console.log(`[AutoIndex] ✅ ${resourceId}: ${result.chunkCount} chunks indexados en línea`);
            }
        } catch (err: any) {
            // El indexador ya dejó escrito `indexingStatus: 'failed'` con
            // su motivo. Acá se registra de nuevo para poder verlo desde
            // el disparador.
            console.error(`[AutoIndex] ❌ ${resourceId}: ${err?.message ?? err}`);
        }
    },
);
