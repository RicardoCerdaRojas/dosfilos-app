import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Teaching Suite F3 (Slice A) — persiste un `plan` aprobado y crea la clase.
 *
 * Se llama tras la pantalla de revisión, cuando el docente aprueba el plan
 * propuesto (ya validado client-side con validatePlan). Escribe, para el caller:
 * el plan en `teachingPlans` y la clase en `teachingClasses` (apuntando a la
 * marca elegida). El render de los artefactos es client-side y doc-driven
 * (resuelve la marca por `clase.marcaId`), igual que para las clases semilla.
 *
 * functions NO depende de @dosfilos/domain: el plan se persiste como JSON opaco;
 * la validación fuerte ya ocurrió en el cliente.
 */

const ARTEFACTOS_VALIDOS = ['presentacion', 'notas', 'hoja', 'guia_sesion'];

interface CrearClaseInput {
  plan?: Record<string, unknown>;
  marcaId?: string;
}

function sanitizeArtefactos(value: unknown): string[] {
  const arr = Array.isArray(value) ? value : [];
  const limpio = arr.filter((a): a is string => typeof a === 'string' && ARTEFACTOS_VALIDOS.includes(a));
  return limpio.length > 0 ? limpio : ['presentacion'];
}

export const crearClaseDesdePlan = onCall(appCheckCallableOptions(), async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const ownerId = request.auth.uid;
  const input = (request.data ?? {}) as CrearClaseInput;

  const plan = input.plan;
  const marcaId = String(input.marcaId ?? '').trim();
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new HttpsError('invalid-argument', 'plan requerido');
  }
  if (!Array.isArray(plan.diapositivas) || !Array.isArray(plan.bloques)) {
    throw new HttpsError('invalid-argument', 'el plan no tiene la forma esperada');
  }
  if (!marcaId) throw new HttpsError('invalid-argument', 'marcaId requerido');

  const db = getFirestore();

  // La marca debe existir y ser del caller (la clase la referencia para render).
  const marcaSnap = await db.collection('teachingBrands').doc(marcaId).get();
  if (!marcaSnap.exists || marcaSnap.data()?.ownerId !== ownerId) {
    throw new HttpsError('permission-denied', 'Marca no encontrada o no es tuya');
  }

  const artefactos = sanitizeArtefactos(plan.artefactos);
  const batch = db.batch();

  const planRef = db.collection('teachingPlans').doc();
  batch.set(planRef, { ...plan, marca: marcaId, ownerId, createdAt: FieldValue.serverTimestamp() });

  const claseRef = db.collection('teachingClasses').doc();
  batch.set(claseRef, {
    planId: planRef.id,
    marcaId,
    titulo: typeof plan.titulo === 'string' ? plan.titulo : 'Clase',
    serie: typeof plan.serie === 'string' ? plan.serie : null,
    genero: typeof plan.genero === 'string' ? plan.genero : 'exegesis',
    modalidad: typeof plan.modalidad === 'string' ? plan.modalidad : null,
    artefactos,
    estado: 'aprobado',
    origen: 'ia',
    ownerId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { claseId: claseRef.id, planId: planRef.id };
});
