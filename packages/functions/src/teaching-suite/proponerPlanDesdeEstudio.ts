import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { AnthropicLlmClient } from '../llm/AnthropicLlmClient';
import { buildPlanPrompt, type GeneroSoportado, type PromptRefs } from './buildPlanPrompt';

/**
 * Teaching Suite F3 (Slice A) — propone un `plan` de clase desde un estudio.
 *
 * El ÚNICO punto donde interviene la IA: lee el estudio (`extractions/{id}`),
 * arma el prompt con las referencias congeladas del skill + el género elegido,
 * pide a Anthropic un objeto `plan` y lo devuelve SIN generar artefactos. La
 * validación dura (validatePlan, en @dosfilos/domain) corre client-side sobre el
 * candidato; si falla, el cliente re-llama con `erroresPrevios` (bucle de
 * corrección — Slice B; en Slice A el reintento es manual).
 *
 * functions NO depende de @dosfilos/domain: el plan viaja como JSON opaco y la
 * validación estructural fuerte vive en el cliente (igual que el render y la
 * validación de marca). Aquí solo se hace una verificación de forma mínima.
 */

const GENEROS_SOPORTADOS: GeneroSoportado[] = ['exegesis', 'doctrina'];
const ARTEFACTOS_CLASE = ['presentacion', 'notas', 'hoja'];

interface ProponerInput {
  estudioId?: string;
  genero?: string;
  marcaId?: string;
  erroresPrevios?: string[];
}

function readPromptAsset(rel: string): string {
  return readFileSync(join(__dirname, 'assets', 'prompts', rel), 'utf-8');
}

function loadRefs(genero: GeneroSoportado): PromptRefs {
  return {
    skill: readPromptAsset('SKILL.md'),
    contrato: readPromptAsset('contrato-plan.md'),
    tipos: readPromptAsset('tipos-de-lamina.md'),
    genero: readPromptAsset(`genero-${genero}.md`),
  };
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || fallback;
}

/** Sanea el candidato a la forma mínima de un `plan` (sin validar el contrato). */
function coerceCandidate(
  raw: string,
  genero: GeneroSoportado,
  marcaId: string,
  idSugerido: string,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpsError('internal', 'El asistente no devolvió un plan legible. Reintenta.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpsError('internal', 'El asistente no devolvió un objeto plan. Reintenta.');
  }
  const plan = parsed as Record<string, unknown>;
  if (!Array.isArray(plan.diapositivas) || !Array.isArray(plan.bloques)) {
    throw new HttpsError('internal', 'El plan propuesto no tiene la forma esperada. Reintenta.');
  }
  // Fijar los campos que el cliente eligió (no confiar en que el modelo los
  // respete). El render resuelve la marca por `clase.marcaId`; `plan.marca` se
  // mantiene coherente.
  plan.genero = genero;
  plan.marca = marcaId;
  if (typeof plan.id !== 'string' || !/^[a-z0-9_-]+$/.test(plan.id)) {
    plan.id = idSugerido;
  }
  if (!Array.isArray(plan.artefactos) || plan.artefactos.length === 0) {
    plan.artefactos = [...ARTEFACTOS_CLASE];
  }
  return plan;
}

export const proponerPlanDesdeEstudio = onCall(
  { ...appCheckCallableOptions(), secrets: ['ANTHROPIC_API_KEY'], timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
    const ownerId = request.auth.uid;
    const input = (request.data ?? {}) as ProponerInput;

    const estudioId = String(input.estudioId ?? '').trim();
    const marcaId = String(input.marcaId ?? '').trim();
    const genero = input.genero as GeneroSoportado;
    if (!estudioId) throw new HttpsError('invalid-argument', 'estudioId requerido');
    if (!marcaId) throw new HttpsError('invalid-argument', 'marcaId requerido');
    if (!GENEROS_SOPORTADOS.includes(genero)) {
      throw new HttpsError('invalid-argument', 'genero no soportado (exegesis | doctrina)');
    }
    const erroresPrevios = Array.isArray(input.erroresPrevios)
      ? input.erroresPrevios.filter((e): e is string => typeof e === 'string').slice(0, 40)
      : undefined;

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new HttpsError('failed-precondition', 'ANTHROPIC_API_KEY secret not configured');
    }

    const db = getFirestore();

    // Estudio (origen) — owner-scoped.
    const estudioSnap = await db.collection('extractions').doc(estudioId).get();
    if (!estudioSnap.exists) throw new HttpsError('not-found', 'Estudio no encontrado');
    const estudio = estudioSnap.data() as { userId?: string; title?: string; markdown?: string };
    if (estudio.userId && estudio.userId !== ownerId) {
      throw new HttpsError('permission-denied', 'El estudio no es tuyo');
    }
    const material = String(estudio.markdown ?? '').trim();
    if (material.length < 40) {
      throw new HttpsError('failed-precondition', 'El estudio no tiene contenido suficiente');
    }

    // Marca — confirmar propiedad (la identidad visual se resuelve en el render).
    const marcaSnap = await db.collection('teachingBrands').doc(marcaId).get();
    if (!marcaSnap.exists || marcaSnap.data()?.ownerId !== ownerId) {
      throw new HttpsError('permission-denied', 'Marca no encontrada o no es tuya');
    }

    const idSugerido = slugify(estudio.title ?? '', 'clase');
    const { system, prompt } = buildPlanPrompt({
      refs: loadRefs(genero),
      estudio: material,
      genero,
      marcaId,
      idSugerido,
      artefactos: [...ARTEFACTOS_CLASE],
      erroresPrevios,
    });

    const llm = new AnthropicLlmClient(anthropicKey);
    const raw = await llm.generate({
      system,
      prompt,
      responseMimeType: 'application/json',
      temperature: 0.4,
      // Un plan de doctrina (25–35 láminas + cuerpos HTML) es voluminoso; un tope
      // chico trunca el JSON → candidato ilegible. Holgado para no truncar.
      maxOutputTokens: 16000,
    });

    const plan = coerceCandidate(raw, genero, marcaId, idSugerido);
    return { plan };
  },
);
