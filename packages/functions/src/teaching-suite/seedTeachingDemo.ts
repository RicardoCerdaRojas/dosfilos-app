import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Teaching Suite F1 — siembra las clases demo para el usuario que llama.
 *
 * Dos demos: `demo_v4_sebex` (solo presentación, marca sebex) y `clase4`
 * (presentación + notas + hoja, marca iglesia-1ra-concepcion). Escribe, para el
 * `ownerId` del caller: marca + plan + clase. Sin IA, sin Storage: los binarios
 * de las marcas semilla viven embebidos en el bundle web (render client-side por
 * `assetKey` = clave de la marca). Idempotente por (ownerId, seedKey).
 *
 * Functions NO depende de `@dosfilos/domain`; el plan se persiste como JSON opaco.
 */

function readAsset(rel: string): string {
  return readFileSync(join(__dirname, 'assets', rel), 'utf-8');
}

interface DemoSpec {
  seedKey: string;
  planFile: string;
  marcaFile: string;
  assetKey: string; // clave de marca usada por el render web
}

const DEMOS: DemoSpec[] = [
  {
    seedKey: 'demo_v4_sebex',
    planFile: 'planes/plan_demo_v4_sebex.json',
    marcaFile: 'marcas/sebex/marca.json',
    assetKey: 'sebex',
  },
  {
    seedKey: 'clase4',
    planFile: 'planes/plan_clase4.json',
    marcaFile: 'marcas/iglesia-1ra-concepcion/marca.json',
    assetKey: 'iglesia-1ra-concepcion',
  },
];

export const seedTeachingDemo = onCall(appCheckCallableOptions(), async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const ownerId = request.auth.uid;
  const db = getFirestore();

  const results: { seedKey: string; claseId: string; created: boolean }[] = [];

  for (const demo of DEMOS) {
    const existing = await db
      .collection('teachingClasses')
      .where('ownerId', '==', ownerId)
      .where('seedKey', '==', demo.seedKey)
      .limit(1)
      .get();
    if (!existing.empty) {
      results.push({ seedKey: demo.seedKey, claseId: existing.docs[0].id, created: false });
      continue;
    }

    const plan = JSON.parse(readAsset(demo.planFile)) as Record<string, unknown>;
    const marca = JSON.parse(readAsset(demo.marcaFile)) as Record<string, unknown>;
    const artefactos = Array.isArray(plan.artefactos) ? plan.artefactos : ['presentacion'];

    const batch = db.batch();

    const marcaRef = db.collection('teachingBrands').doc();
    batch.set(marcaRef, {
      ...marca,
      assetKey: demo.assetKey,
      seedKey: demo.assetKey,
      ownerId,
      createdAt: FieldValue.serverTimestamp(),
    });

    const planRef = db.collection('teachingPlans').doc();
    batch.set(planRef, { ...plan, ownerId, createdAt: FieldValue.serverTimestamp() });

    const claseRef = db.collection('teachingClasses').doc();
    batch.set(claseRef, {
      planId: planRef.id,
      marcaId: marcaRef.id,
      titulo: (plan.titulo as string) ?? 'Clase demo',
      serie: (plan.serie as string) ?? null,
      genero: (plan.genero as string) ?? 'doctrina',
      artefactos,
      estado: 'borrador',
      seedKey: demo.seedKey,
      ownerId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    results.push({ seedKey: demo.seedKey, claseId: claseRef.id, created: true });
  }

  return { demos: results };
});
