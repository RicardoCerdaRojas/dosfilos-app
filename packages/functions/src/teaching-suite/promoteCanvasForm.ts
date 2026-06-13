import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Teaching Suite F4 «trinquete» — promueve una forma de lienzo a la biblioteca de
 * láminas reutilizables del docente (`teachingCanvasComponents`).
 *
 * Entrada: el `fingerprint` de la forma (lo devuelve `crearClaseDesdePlan` como
 * candidata) + un nombre. El callable localiza una ocurrencia de esa forma en
 * `teachingCanvasForms`, carga la diapositiva real desde su plan y guarda el
 * payload (html/css/alt/titulo) como componente. Idempotente por
 * (ownerId, fingerprint): si ya existe, actualiza nombre + payload.
 *
 * `teachingCanvasForms` y `teachingPlans` solo se leen aquí (Admin SDK); el
 * componente resultante sí lo lee el cliente para reusarlo.
 */

interface PromoteInput {
  fingerprint?: string;
  nombre?: string;
}

export const promoteCanvasForm = onCall(appCheckCallableOptions(), async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const ownerId = request.auth.uid;
  const input = (request.data ?? {}) as PromoteInput;

  const fingerprint = String(input.fingerprint ?? '').trim();
  const nombre = String(input.nombre ?? '').trim();
  if (!fingerprint) throw new HttpsError('invalid-argument', 'fingerprint requerido');
  if (!nombre) throw new HttpsError('invalid-argument', 'nombre requerido');

  const db = getFirestore();

  // Una ocurrencia de esta forma (dos filtros de igualdad ⇒ sin índice compuesto).
  const ocurrenciaSnap = await db
    .collection('teachingCanvasForms')
    .where('ownerId', '==', ownerId)
    .where('fingerprint', '==', fingerprint)
    .limit(1)
    .get();
  if (ocurrenciaSnap.empty) {
    throw new HttpsError('not-found', 'No se encontró la forma de lienzo a promover');
  }
  const ocurrencia = ocurrenciaSnap.docs[0].data();
  const planId = String(ocurrencia.planId ?? '');
  const diapoN = Number(ocurrencia.diapoN);
  if (!planId || !Number.isFinite(diapoN)) {
    throw new HttpsError('failed-precondition', 'La forma no apunta a una diapositiva válida');
  }

  // Carga la diapositiva real desde el plan (verificando dueño).
  const planSnap = await db.collection('teachingPlans').doc(planId).get();
  if (!planSnap.exists || planSnap.data()?.ownerId !== ownerId) {
    throw new HttpsError('permission-denied', 'Plan no encontrado o no es tuyo');
  }
  const diapositivas = planSnap.data()?.diapositivas;
  const diapo = (Array.isArray(diapositivas) ? diapositivas : []).find(
    (d) => d && d.tipo === 'lienzo' && Number(d.n) === diapoN,
  ) as Record<string, unknown> | undefined;
  if (!diapo || typeof diapo.html !== 'string' || diapo.html.trim() === '') {
    throw new HttpsError('failed-precondition', 'La lámina de lienzo ya no existe en el plan');
  }

  const payload = {
    nombre,
    fingerprint,
    html: diapo.html,
    ...(typeof diapo.css === 'string' && diapo.css ? { css: diapo.css } : {}),
    alt: typeof diapo.alt === 'string' && diapo.alt ? diapo.alt : nombre,
    ...(typeof diapo.titulo === 'string' && diapo.titulo ? { titulo: diapo.titulo } : {}),
    ownerId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Idempotente por (ownerId, fingerprint): actualiza si ya existe.
  const existenteSnap = await db
    .collection('teachingCanvasComponents')
    .where('ownerId', '==', ownerId)
    .where('fingerprint', '==', fingerprint)
    .limit(1)
    .get();

  if (!existenteSnap.empty) {
    const ref = existenteSnap.docs[0].ref;
    await ref.set(payload, { merge: true });
    return { componentId: ref.id };
  }

  const ref = await db.collection('teachingCanvasComponents').add({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { componentId: ref.id };
});
