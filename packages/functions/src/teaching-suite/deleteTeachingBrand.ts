import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Teaching Suite F2 — elimina una marca del usuario.
 * Bloquea si alguna clase la referencia (evita dejar clases sin marca renderizable).
 */
export const deleteTeachingBrand = onCall(appCheckCallableOptions(), async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const ownerId = request.auth.uid;
  const marcaId = (request.data?.marcaId as string | undefined) ?? '';
  if (!marcaId) throw new HttpsError('invalid-argument', 'marcaId requerido');

  const db = getFirestore();
  const ref = db.collection('teachingBrands').doc(marcaId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.ownerId !== ownerId) {
    throw new HttpsError('permission-denied', 'Marca no encontrada o no es tuya');
  }

  const usada = await db
    .collection('teachingClasses')
    .where('ownerId', '==', ownerId)
    .where('marcaId', '==', marcaId)
    .limit(1)
    .get();
  if (!usada.empty) {
    throw new HttpsError(
      'failed-precondition',
      'La marca está en uso por una o más clases. Elimina o reasigna esas clases primero.',
    );
  }

  await ref.delete();
  return { deleted: true };
});
