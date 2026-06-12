import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Teaching Suite F1 — siembra una clase demo para el usuario que llama.
 *
 * Escribe, para el `ownerId` del caller: una marca (copia de la semilla
 * `sebex`), un plan demo (`plan_demo_v4_sebex`) y una clase que los enlaza.
 * Sin IA, sin Storage: los binarios de la marca semilla viven embebidos en el
 * bundle web (render client-side por `assetKey`). Idempotente por-usuario: si ya
 * sembró, devuelve la clase existente.
 *
 * Functions NO depende de `@dosfilos/domain` (decoupling intencional), por eso
 * el plan se persiste como JSON opaco; el render (que sí usa domain) vive en web.
 */

function readAsset(rel: string): string {
  // En runtime: dist/teaching-suite/seedTeachingDemo.js → assets copiados por copy-assets.
  return readFileSync(join(__dirname, 'assets', rel), 'utf-8');
}

export const seedTeachingDemo = onCall(appCheckCallableOptions(), async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const ownerId = request.auth.uid;
  const db = getFirestore();

  // Idempotencia: ¿ya tiene la clase demo?
  const existing = await db
    .collection('teachingClasses')
    .where('ownerId', '==', ownerId)
    .where('seedKey', '==', 'demo_v4_sebex')
    .limit(1)
    .get();
  if (!existing.empty) {
    return { claseId: existing.docs[0].id, created: false };
  }

  const plan = JSON.parse(readAsset('planes/plan_demo_v4_sebex.json')) as Record<string, unknown>;
  const marca = JSON.parse(readAsset('marcas/sebex/marca.json')) as Record<string, unknown>;

  const batch = db.batch();

  const marcaRef = db.collection('teachingBrands').doc();
  batch.set(marcaRef, {
    ...marca,
    assetKey: 'sebex', // el render web resuelve los binarios por esta clave
    seedKey: 'sebex',
    ownerId,
    createdAt: FieldValue.serverTimestamp(),
  });

  // El plan referencia la marca por su clave de carpeta original ("sebex"); para
  // la clase guardamos el id real del doc de marca.
  const planRef = db.collection('teachingPlans').doc();
  batch.set(planRef, { ...plan, ownerId, createdAt: FieldValue.serverTimestamp() });

  const claseRef = db.collection('teachingClasses').doc();
  batch.set(claseRef, {
    planId: planRef.id,
    marcaId: marcaRef.id,
    titulo: (plan.titulo as string) ?? 'Clase demo',
    serie: (plan.serie as string) ?? null,
    genero: (plan.genero as string) ?? 'doctrina',
    estado: 'borrador',
    seedKey: 'demo_v4_sebex',
    ownerId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { claseId: claseRef.id, created: true };
});
