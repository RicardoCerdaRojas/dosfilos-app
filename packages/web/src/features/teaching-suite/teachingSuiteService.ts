import { db, functions } from '@dosfilos/infrastructure';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Artefacto, TeachingPlan } from '@dosfilos/domain';
import { renderArtifact } from './render';

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

export interface SeedResult {
  demos: { seedKey: string; claseId: string; created: boolean }[];
}

export async function seedDemo(): Promise<SeedResult> {
  const fn = httpsCallable<Record<string, never>, SeedResult>(functions, 'seedTeachingDemo');
  return (await fn({})).data;
}

export interface SaveBrandInput {
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

/** Abre el HTML de un artefacto/preview en una pestaña nueva (Blob URL). */
export function openHtml(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Renderiza UN artefacto del plan y lo abre en una pestaña nueva (Blob URL).
 * F1 no persiste el HTML en Storage — es un derivado desechable; se re-renderiza
 * a demanda desde el plan.
 */
export function openArtifact(plan: TeachingPlan, artefacto: Artefacto): void {
  const html = renderArtifact(plan, artefacto);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  // Revoca tras un margen para que la pestaña alcance a cargar.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
