import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Teaching Suite F2 — persiste una marca creada por el usuario.
 *
 * La validación (contraste WCAG + ΔE) corre client-side contra el núcleo de
 * domain antes de llamar; el callable solo persiste (la marca es del propio
 * usuario). Las fuentes se guardan como CLAVES del catálogo bundled (el render
 * client-side las resuelve); el logo (PNG sin fondo) va inline en base64. Sin
 * Storage. functions NO depende de @dosfilos/domain.
 */

interface SaveBrandInput {
  marcaId?: string; // presente ⇒ actualiza una marca existente del usuario
  nombre: string;
  tokens: Record<string, string>;
  fuenteTitulosKey: string;
  fuenteEscrituraKey: string;
  logoB64: string;
}

const HEX = /^#[0-9A-Fa-f]{6}$/;
const TOKENS_REQ = [
  'oscuro',
  'panel',
  'medio',
  'acento',
  'claro1',
  'claro2',
  'escritura',
  'escritura_tinta',
  'alerta',
];

export const saveTeachingBrand = onCall(appCheckCallableOptions(), async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const ownerId = request.auth.uid;
  const input = (request.data ?? {}) as SaveBrandInput;

  if (!input.nombre || typeof input.nombre !== 'string') {
    throw new HttpsError('invalid-argument', 'nombre requerido');
  }
  if (!input.tokens || TOKENS_REQ.some((k) => !HEX.test(input.tokens[k] ?? ''))) {
    throw new HttpsError('invalid-argument', 'tokens incompletos o mal formados');
  }
  if (!input.fuenteTitulosKey || !input.fuenteEscrituraKey) {
    throw new HttpsError('invalid-argument', 'fuentes requeridas');
  }
  if (!input.logoB64 || typeof input.logoB64 !== 'string') {
    throw new HttpsError('invalid-argument', 'logo requerido');
  }
  // Guardia de tamaño (logo base64 inline; Firestore limita el doc a ~1MB).
  if (input.logoB64.length > 700_000) {
    throw new HttpsError('invalid-argument', 'el logo es demasiado grande tras el procesado');
  }

  const db = getFirestore();
  const campos = {
    nombre: input.nombre,
    tokens: input.tokens,
    fuenteTitulosKey: input.fuenteTitulosKey,
    fuenteEscrituraKey: input.fuenteEscrituraKey,
    logoB64: input.logoB64,
    source: 'user',
    ownerId,
  };

  if (input.marcaId) {
    // Actualización: verifica propiedad y que sea una marca de usuario.
    const ref = db.collection('teachingBrands').doc(input.marcaId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.ownerId !== ownerId) {
      throw new HttpsError('permission-denied', 'Marca no encontrada o no es tuya');
    }
    if (snap.data()?.source !== 'user') {
      throw new HttpsError('failed-precondition', 'Las marcas semilla no se editan');
    }
    await ref.set({ ...campos, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { marcaId: ref.id };
  }

  const ref = db.collection('teachingBrands').doc();
  await ref.set({ ...campos, createdAt: FieldValue.serverTimestamp() });
  return { marcaId: ref.id };
});
