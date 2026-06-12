import { db, functions } from '@dosfilos/infrastructure';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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

export interface ProponerPlanInput {
  estudioId: string;
  genero: 'exegesis' | 'doctrina';
  marcaId: string;
  erroresPrevios?: string[];
}

/** Pide al asistente un plan candidato desde el estudio (no genera artefactos). */
export async function proponerPlan(input: ProponerPlanInput): Promise<TeachingPlan> {
  const fn = httpsCallable<ProponerPlanInput, { plan: TeachingPlan }>(
    functions,
    'proponerPlanDesdeEstudio',
  );
  return (await fn(input)).data.plan;
}

/** Persiste el plan aprobado y crea la clase con la marca elegida. */
export async function crearClaseDesdePlan(
  plan: TeachingPlan,
  marcaId: string,
): Promise<{ claseId: string; planId: string }> {
  const fn = httpsCallable<{ plan: TeachingPlan; marcaId: string }, { claseId: string; planId: string }>(
    functions,
    'crearClaseDesdePlan',
  );
  return (await fn({ plan, marcaId })).data;
}

/** Abre el HTML de un artefacto/preview en una pestaña nueva (Blob URL). */
export function openHtml(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

