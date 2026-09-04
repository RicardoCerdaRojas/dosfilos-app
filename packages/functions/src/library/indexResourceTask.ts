import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { indexResourceChunks } from './indexStructuredDocument';

/**
 * El indexado pesado, fuera del techo de 540 s.
 *
 * Los disparadores de Firestore están topados en 540 s por la
 * plataforma, y ese tope no es negociable. Un libro grande no cabe: la
 * gramática de Wallace produce 959 chunks y el propio comentario del
 * disparador ya advertía que por encima de ~500 el indexado puede no
 * entrar. Cuando no entraba, la función moría, el recurso quedaba en
 * `indexingStatus: 'failed'` y la única salida era que el usuario
 * pulsara «Procesar» para usar el callable de 900 s.
 *
 * O sea: el sistema sabía cómo terminar el trabajo y le pedía al
 * usuario que se lo pidiera.
 *
 * Acá el trabajo corre en una cola de tareas con 900 s y reintentos
 * propios. El disparador sólo decide y encola, que es lo que sí cabe
 * en su presupuesto.
 */
export const indexResourceTask = onTaskDispatched(
    {
        region: 'us-central1',
        memory: '2GiB',
        timeoutSeconds: 900,
        secrets: ['GEMINI_API_KEY'],
        retryConfig: {
            // Tres intentos con espera creciente. Los fallos que se
            // arreglan solos acá son de cuota de embeddings; los que no,
            // ya quedan escritos como `indexingStatus: 'failed'` por el
            // indexador, con su motivo.
            maxAttempts: 3,
            minBackoffSeconds: 60,
        },
        rateLimits: {
            // Tres libros a la vez. Más que eso pelea contra la cuota de
            // embeddings y convierte un problema de tiempo en uno de
            // límite de tasa.
            maxConcurrentDispatches: 3,
        },
    },
    async (req) => {
        const resourceId = (req.data as { resourceId?: string })?.resourceId;
        if (!resourceId) {
            console.error('[IndexTask] tarea sin resourceId; se descarta');
            return;
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            console.error(`[IndexTask] ${resourceId}: falta GEMINI_API_KEY; no se puede indexar`);
            return;
        }

        console.log(`[IndexTask] ${resourceId}: indexando (hasta 900 s)`);
        const result = await indexResourceChunks(resourceId, { force: false, geminiKey });
        if ('skipped' in result && result.skipped) {
            console.log(`[IndexTask] ${resourceId}: omitido (${result.reason})`);
        } else if ('chunkCount' in result) {
            console.log(`[IndexTask] ✅ ${resourceId}: ${result.chunkCount} chunks indexados`);
        }
        // Un error se propaga a propósito: es lo que hace que Cloud
        // Tasks reintente. El indexador ya dejó escrito el estado y el
        // motivo antes de lanzar.
    },
);
