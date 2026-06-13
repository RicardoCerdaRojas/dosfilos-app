import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Teaching Suite F4 — elimina una lámina guardada de la biblioteca del docente
 * (`teachingCanvasComponents`). No afecta clases ya creadas (el HTML vive en sus
 * planes, no referencia al componente).
 */
export const deleteCanvasComponent = onCall(appCheckCallableOptions(), async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const ownerId = request.auth.uid;
  const componentId = (request.data?.componentId as string | undefined) ?? '';
  if (!componentId) throw new HttpsError('invalid-argument', 'componentId requerido');

  const db = getFirestore();
  const ref = db.collection('teachingCanvasComponents').doc(componentId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.ownerId !== ownerId) {
    throw new HttpsError('permission-denied', 'Lámina no encontrada o no es tuya');
  }

  await ref.delete();
  return { deleted: true };
});
