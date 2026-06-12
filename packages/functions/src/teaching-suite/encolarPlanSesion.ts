import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Teaching Suite F3 (Slice B) — encola la generación de un plan de SESIÓN.
 *
 * Callable rápido (sin IA): valida la propiedad del estudio + la marca y escribe
 * un job en `teachingPlanJobs/{jobId}` (estado 'generando'). La generación corre
 * en el trigger `generarPlanJob` (onDocumentCreated), que escribe el plan y el
 * estado final en el mismo doc. La web escucha por onSnapshot → sin timeout de
 * cliente para generaciones largas.
 *
 * El `alcance` (sesión dentro de un curso, Eje 2) es opcional: en sesión suelta
 * va vacío y el plan cubre el estudio como una sola sesión.
 */

const GENEROS_SOPORTADOS = ['exegesis', 'doctrina'];

interface EncolarInput {
  estudioId?: string;
  genero?: string;
  marcaId?: string;
  alcance?: string;
  serie?: string;
  cursoId?: string;
}

export const encolarPlanSesion = onCall(appCheckCallableOptions(), async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const ownerId = request.auth.uid;
  const input = (request.data ?? {}) as EncolarInput;

  const estudioId = String(input.estudioId ?? '').trim();
  const marcaId = String(input.marcaId ?? '').trim();
  const genero = String(input.genero ?? '').trim();
  if (!estudioId) throw new HttpsError('invalid-argument', 'estudioId requerido');
  if (!marcaId) throw new HttpsError('invalid-argument', 'marcaId requerido');
  if (!GENEROS_SOPORTADOS.includes(genero)) {
    throw new HttpsError('invalid-argument', 'genero no soportado (exegesis | doctrina)');
  }

  const db = getFirestore();

  // Estudio (origen) — owner-scoped + con contenido.
  const estudioSnap = await db.collection('extractions').doc(estudioId).get();
  if (!estudioSnap.exists) throw new HttpsError('not-found', 'Estudio no encontrado');
  const estudio = estudioSnap.data() as { userId?: string; title?: string; markdown?: string };
  if (estudio.userId && estudio.userId !== ownerId) {
    throw new HttpsError('permission-denied', 'El estudio no es tuyo');
  }
  if (String(estudio.markdown ?? '').trim().length < 40) {
    throw new HttpsError('failed-precondition', 'El estudio no tiene contenido suficiente');
  }

  // Marca — confirmar propiedad.
  const marcaSnap = await db.collection('teachingBrands').doc(marcaId).get();
  if (!marcaSnap.exists || marcaSnap.data()?.ownerId !== ownerId) {
    throw new HttpsError('permission-denied', 'Marca no encontrada o no es tuya');
  }

  const jobRef = db.collection('teachingPlanJobs').doc();
  await jobRef.set({
    ownerId,
    estudioId,
    estudioTitulo: estudio.title ?? '',
    genero,
    marcaId,
    alcance: input.alcance ? String(input.alcance) : null,
    serie: input.serie ? String(input.serie) : null,
    cursoId: input.cursoId ? String(input.cursoId) : null,
    estado: 'generando',
    intentos: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { jobId: jobRef.id };
});
