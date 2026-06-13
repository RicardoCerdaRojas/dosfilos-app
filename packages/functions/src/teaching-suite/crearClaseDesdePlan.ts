import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { extractCanvasForms } from './canvasForm';

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
  /** Curso (Eje 2): agrupa varias clases bajo una serie. */
  serie?: string;
  cursoId?: string;
  /** Índice de la sesión dentro del curso (para ordenar la serie). */
  orden?: number;
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

  // Curso: la serie/cursoId del input mandan (agrupan las clases); si no vienen,
  // se cae a la serie del propio plan (clase suelta).
  const serie =
    typeof input.serie === 'string' && input.serie.trim()
      ? input.serie.trim()
      : typeof plan.serie === 'string'
        ? plan.serie
        : null;
  const cursoId = typeof input.cursoId === 'string' && input.cursoId.trim() ? input.cursoId.trim() : null;
  const orden = Number.isFinite(Number(input.orden)) ? Math.round(Number(input.orden)) : null;

  const artefactos = sanitizeArtefactos(plan.artefactos);
  const batch = db.batch();

  const planRef = db.collection('teachingPlans').doc();
  batch.set(planRef, {
    ...plan,
    marca: marcaId,
    ...(serie ? { serie } : {}),
    ownerId,
    createdAt: FieldValue.serverTimestamp(),
  });

  const claseRef = db.collection('teachingClasses').doc();
  batch.set(claseRef, {
    planId: planRef.id,
    marcaId,
    titulo: typeof plan.titulo === 'string' ? plan.titulo : 'Clase',
    serie,
    cursoId,
    orden,
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

  // F4 «trinquete»: registra las formas de lienzo de esta clase y detecta las que
  // ya aparecían en OTRA clase del docente (candidatas a componente reutilizable).
  // Es best-effort: jamás debe tumbar la creación de la clase.
  const canvasCandidatas = await registrarFormasLienzo(db, plan, {
    ownerId,
    claseId: claseRef.id,
    planId: planRef.id,
  });

  return { claseId: claseRef.id, planId: planRef.id, canvasCandidatas };
});

interface CanvasCandidata {
  fingerprint: string;
  alt?: string;
  titulo?: string;
  /** Total de clases (incl. esta) que comparten la forma. */
  vecesUsada: number;
}

/**
 * Persiste cada forma de lienzo del plan en `teachingCanvasForms` y devuelve las
 * que ya estaban en otra clase del mismo dueño. La colección es server-internal:
 * solo la escribe/consulta este callable (Admin SDK), el cliente recibe las
 * candidatas en la respuesta y no lee la colección directamente.
 */
async function registrarFormasLienzo(
  db: FirebaseFirestore.Firestore,
  plan: Record<string, unknown>,
  ref: { ownerId: string; claseId: string; planId: string },
): Promise<CanvasCandidata[]> {
  try {
    const formas = extractCanvasForms(plan as { diapositivas?: unknown });
    if (formas.length === 0) return [];

    const col = db.collection('teachingCanvasForms');
    const candidatas: CanvasCandidata[] = [];
    const batch = db.batch();

    for (const forma of formas) {
      // Clases ANTERIORES del dueño con esta misma forma (la nueva aún no está
      // escrita). Dos filtros de igualdad ⇒ sin índice compuesto requerido.
      const prevSnap = await col
        .where('ownerId', '==', ref.ownerId)
        .where('fingerprint', '==', forma.fingerprint)
        .get();
      const clasesPrevias = new Set(
        prevSnap.docs.map((d) => d.data()?.claseId).filter((c): c is string => typeof c === 'string'),
      );
      clasesPrevias.delete(ref.claseId);
      const repetida = clasesPrevias.size > 0;

      batch.set(col.doc(), {
        fingerprint: forma.fingerprint,
        claseId: ref.claseId,
        planId: ref.planId,
        diapoN: forma.diapoN,
        ...(forma.alt ? { alt: forma.alt } : {}),
        ...(forma.titulo ? { titulo: forma.titulo } : {}),
        estado: repetida ? 'candidata' : 'unica',
        ownerId: ref.ownerId,
        createdAt: FieldValue.serverTimestamp(),
      });

      if (repetida) {
        candidatas.push({
          fingerprint: forma.fingerprint,
          ...(forma.alt ? { alt: forma.alt } : {}),
          ...(forma.titulo ? { titulo: forma.titulo } : {}),
          vecesUsada: clasesPrevias.size + 1,
        });
      }
    }

    await batch.commit();
    return candidatas;
  } catch (e) {
    logger.warn('trinquete: no se pudieron registrar las formas de lienzo', {
      claseId: ref.claseId,
      error: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}
