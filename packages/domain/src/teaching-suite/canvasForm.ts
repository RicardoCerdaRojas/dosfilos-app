/**
 * Teaching Suite — F4 «trinquete» (memoria viva de formas de lienzo).
 *
 * Una lámina `lienzo` es la válvula creativa: HTML+CSS de diseño libre. Si la
 * MISMA forma se repite entre clases, el sistema lo detecta y sugiere promoverla
 * a un componente reutilizable. La detección se ancla en un fingerprint puro y
 * determinista de la forma (html + css normalizados), no en su rótulo ni en su
 * posición.
 *
 * Núcleo puro y sin I/O (igual que render/inject/validate). La persistencia y la
 * consulta cruzada entre clases viven en `packages/functions` (callable), que NO
 * depende de `@dosfilos/domain` y por eso replica `canvasFormFingerprint` como
 * copia local fiel — cualquier cambio aqui debe reflejarse alla.
 */

import type { TeachingPlan, DiapoLienzo } from './TeachingPlan';

/** Colapsa corridas de espacios a uno solo y recorta. Insensible a sangria/saltos. */
function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Hash FNV-1a de 32 bits, hex de 8 digitos. Determinista, sin dependencias.
 * Suficiente para agrupar formas identicas (no es criptografico).
 */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // h *= 16777619 con aritmetica de 32 bits sin desbordar el double.
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Fingerprint de la forma de un lienzo: html + css normalizados.
 * Dos lienzos con el mismo html/css (salvo espacios/sangria) comparten fingerprint.
 * El `alt`/`titulo`/`rotulo` (etiquetas) NO entran: son contenido, no forma.
 */
export function canvasFormFingerprint(diapo: Pick<DiapoLienzo, 'html' | 'css'>): string {
  const html = normalizeWhitespace(diapo.html ?? '');
  const css = normalizeWhitespace(diapo.css ?? '');
  return fnv1a(`${html} ${css}`);
}

/** Una forma de lienzo extraida de un plan, con su fingerprint y etiquetas. */
export interface CanvasForm {
  /** Correlativo de la diapositiva en el plan (1..N). */
  diapoN: number;
  /** Fingerprint determinista de la forma (html+css). */
  fingerprint: string;
  /** Etiqueta accesible del lienzo (si la trae). */
  alt?: string;
  /** Titulo visible del lienzo (si lo trae). */
  titulo?: string;
}

/**
 * Extrae las formas de lienzo de un plan (ignora los otros 14 tipos de lamina).
 * Entrada laxa para tolerar planes ya serializados.
 */
export function extractCanvasForms(plan: Pick<TeachingPlan, 'diapositivas'>): CanvasForm[] {
  const diapos = Array.isArray(plan?.diapositivas) ? plan.diapositivas : [];
  const formas: CanvasForm[] = [];
  for (const d of diapos) {
    if (!d || (d as { tipo?: string }).tipo !== 'lienzo') continue;
    const l = d as DiapoLienzo;
    if (typeof l.html !== 'string' || l.html.trim() === '') continue;
    formas.push({
      diapoN: typeof l.n === 'number' ? l.n : 0,
      fingerprint: canvasFormFingerprint(l),
      ...(typeof l.alt === 'string' && l.alt ? { alt: l.alt } : {}),
      ...(typeof l.titulo === 'string' && l.titulo ? { titulo: l.titulo } : {}),
    });
  }
  return formas;
}
