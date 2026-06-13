import { db, functions } from '@dosfilos/infrastructure';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Artefacto, TeachingPlan } from '@dosfilos/domain';
import {
  renderArtifactWithBundle,
  resolveBundleFromDoc,
  type MarcaDocLike,
} from './render';
import { PREVIEW_PLAN } from './crearMarca';

/**
 * Servicio de la Suite de Enseñanza (F1). Lee clases/planes de Firestore y
 * renderiza los artefactos CLIENT-SIDE (la marca semilla `sebex` vive embebida).
 * La siembra de la clase demo va por callable (`seedTeachingDemo`).
 */

export interface TeachingClaseRow {
  id: string;
  titulo: string;
  serie?: string;
  orden?: number;
  genero: string;
  estado: string;
  planId: string;
  marcaId: string;
  artefactos: Artefacto[];
}

export async function listClases(ownerId: string): Promise<TeachingClaseRow[]> {
  const snap = await getDocs(
    query(collection(db, 'teachingClasses'), where('ownerId', '==', ownerId)),
  );
  const rows = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      titulo: (x.titulo as string) ?? 'Clase',
      serie: (x.serie as string) ?? undefined,
      orden: typeof x.orden === 'number' ? (x.orden as number) : undefined,
      genero: (x.genero as string) ?? '',
      estado: (x.estado as string) ?? 'borrador',
      planId: (x.planId as string) ?? '',
      marcaId: (x.marcaId as string) ?? '',
      artefactos: Array.isArray(x.artefactos) ? (x.artefactos as Artefacto[]) : ['presentacion'],
    } satisfies TeachingClaseRow;
  });
  // Orden estable por título (los docs no traen índice de orden en F1).
  return rows.sort((a, b) => a.titulo.localeCompare(b.titulo));
}

export async function getPlan(planId: string): Promise<TeachingPlan | null> {
  const snap = await getDoc(doc(db, 'teachingPlans', planId));
  if (!snap.exists()) return null;
  return snap.data() as TeachingPlan;
}

export interface BrandRow {
  id: string;
  nombre: string;
  source: string; // 'seed' | 'user'
  assetKey?: string;
  tokens: Record<string, string>;
}

export async function listBrands(ownerId: string): Promise<BrandRow[]> {
  const snap = await getDocs(
    query(collection(db, 'teachingBrands'), where('ownerId', '==', ownerId)),
  );
  const rows = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      nombre: (x.nombre as string) ?? 'Marca',
      source: (x.source as string) ?? (x.assetKey ? 'seed' : 'user'),
      assetKey: x.assetKey as string | undefined,
      tokens: (x.tokens as Record<string, string>) ?? {},
    } satisfies BrandRow;
  });
  return rows.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function getBrandDoc(marcaId: string): Promise<MarcaDocLike | null> {
  const snap = await getDoc(doc(db, 'teachingBrands', marcaId));
  if (!snap.exists()) return null;
  return snap.data() as MarcaDocLike;
}

/** Renderiza un artefacto de una clase resolviendo su marca por doc. */
export async function renderClaseArtifact(
  plan: TeachingPlan,
  marcaId: string,
  artefacto: Artefacto,
): Promise<string> {
  const marcaDoc = await getBrandDoc(marcaId);
  if (!marcaDoc) throw new Error('No se encontró la marca de la clase.');
  return renderArtifactWithBundle(plan, resolveBundleFromDoc(marcaDoc), artefacto);
}

/** Previsualiza una marca: renderiza el plan demo con su bundle. */
export async function previewBrand(marcaId: string): Promise<string> {
  const marcaDoc = await getBrandDoc(marcaId);
  if (!marcaDoc) throw new Error('No se encontró la marca.');
  return renderArtifactWithBundle(PREVIEW_PLAN, resolveBundleFromDoc(marcaDoc), 'presentacion');
}

export interface SeedResult {
  demos: { seedKey: string; claseId: string; created: boolean }[];
}

export async function seedDemo(): Promise<SeedResult> {
  const fn = httpsCallable<Record<string, never>, SeedResult>(functions, 'seedTeachingDemo');
  return (await fn({})).data;
}

export interface SaveBrandInput {
  marcaId?: string; // presente ⇒ edita
  nombre: string;
  tokens: Record<string, string>;
  fuenteTitulosKey: string;
  fuenteEscrituraKey: string;
  logoB64: string;
}

export async function saveBrand(input: SaveBrandInput): Promise<{ marcaId: string }> {
  const fn = httpsCallable<SaveBrandInput, { marcaId: string }>(functions, 'saveTeachingBrand');
  return (await fn(input)).data;
}

export async function deleteBrand(marcaId: string): Promise<{ deleted: boolean }> {
  const fn = httpsCallable<{ marcaId: string }, { deleted: boolean }>(
    functions,
    'deleteTeachingBrand',
  );
  return (await fn({ marcaId })).data;
}

// ── F3 — generar plan desde un estudio (IA) ─────────────────────────────────

export interface EstudioRow {
  id: string;
  titulo: string;
  tipo: string;
}

interface SummaryExtraction {
  id: string;
  title: string;
  type: string;
}

/** Lista los estudios del usuario (extractions) como origen para generar clase. */
export async function listEstudios(): Promise<EstudioRow[]> {
  const fn = httpsCallable<Record<string, never>, { extractions: SummaryExtraction[] }>(
    functions,
    'getUserExtractionsSummary',
  );
  const { extractions } = (await fn({})).data;
  return extractions.map((e) => ({
    id: e.id,
    titulo: e.title?.trim() || 'Estudio sin título',
    tipo: e.type ?? '',
  }));
}

export type GeneroTeaching = 'exegesis' | 'doctrina' | 'consejeria';
export type ModalidadTeaching = 'clase' | 'sesion';

export interface EncolarPlanInput {
  estudioId: string;
  genero: GeneroTeaching;
  /** Solo consejería. */
  modalidad?: ModalidadTeaching;
  marcaId: string;
  /** Sesión dentro de un curso (Eje 2); vacío en sesión suelta. */
  alcance?: string;
  serie?: string;
  cursoId?: string;
  /** Errores de validatePlan del intento anterior (bucle de corrección). */
  erroresPrevios?: string[];
}

/**
 * Encola la generación del plan (no espera el resultado). La generación corre en
 * un trigger; sigue el progreso con `subscribeJob(jobId)`. Evita el timeout de
 * cliente en generaciones largas.
 */
export async function encolarPlanSesion(input: EncolarPlanInput): Promise<string> {
  const fn = httpsCallable<EncolarPlanInput, { jobId: string }>(functions, 'encolarPlanSesion');
  return (await fn(input)).data.jobId;
}

export interface PlanJob {
  estado: 'generando' | 'listo' | 'error';
  plan?: TeachingPlan;
  error?: string;
}

/** Escucha el job de generación; llama `onUpdate` en cada cambio de estado. */
export function subscribeJob(
  jobId: string,
  onUpdate: (job: PlanJob) => void,
  onError: (e: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'teachingPlanJobs', jobId),
    (snap) => {
      if (!snap.exists()) return;
      const x = snap.data() as Record<string, unknown>;
      onUpdate({
        estado: (x.estado as PlanJob['estado']) ?? 'generando',
        plan: x.plan as TeachingPlan | undefined,
        error: x.error as string | undefined,
      });
    },
    (e) => onError(e instanceof Error ? e : new Error('Error al seguir la generación')),
  );
}

export interface CrearClaseOpts {
  /** Curso: agrupa la clase bajo una serie. */
  serie?: string;
  cursoId?: string;
  /** Índice de la sesión dentro del curso (para ordenar la serie). */
  orden?: number;
}

/**
 * Forma de lienzo (F4 «trinquete») que ya se usaba en otra clase del docente:
 * el sistema la sugiere como candidata a componente reutilizable.
 */
export interface CanvasCandidata {
  fingerprint: string;
  alt?: string;
  titulo?: string;
  /** Total de clases (incl. la recién creada) que comparten la forma. */
  vecesUsada: number;
}

export interface CrearClaseResult {
  claseId: string;
  planId: string;
  /** Formas de lienzo repetidas detectadas al crear (puede venir vacío). */
  canvasCandidatas?: CanvasCandidata[];
}

/** Persiste el plan aprobado y crea la clase con la marca elegida. */
export async function crearClaseDesdePlan(
  plan: TeachingPlan,
  marcaId: string,
  opts: CrearClaseOpts = {},
): Promise<CrearClaseResult> {
  const fn = httpsCallable<
    { plan: TeachingPlan; marcaId: string; serie?: string; cursoId?: string; orden?: number },
    CrearClaseResult
  >(functions, 'crearClaseDesdePlan');
  return (await fn({ plan, marcaId, ...opts })).data;
}

export interface SesionOutline {
  titulo: string;
  alcance: string;
  min: number;
}

/** Propone el esquema de un curso (lista de sesiones) desde un estudio. */
export async function proponerOutlineCurso(input: {
  estudioId: string;
  genero: 'exegesis' | 'doctrina';
  sesionesSugeridas?: number;
}): Promise<SesionOutline[]> {
  const fn = httpsCallable<typeof input, { sesiones: SesionOutline[] }>(
    functions,
    'proponerOutlineCurso',
  );
  return (await fn(input)).data.sesiones;
}

/** Abre el HTML de un artefacto/preview en una pestaña nueva (Blob URL). */
export function openHtml(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

