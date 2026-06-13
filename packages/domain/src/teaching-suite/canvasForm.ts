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

import type { TeachingPlan, DiapoLienzo, VersionContrato } from './TeachingPlan';

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

/** Forma de lienzo promovida y guardada para reusar (biblioteca, F4). */
export interface CanvasComponent {
  html: string;
  css?: string;
  alt: string;
  titulo?: string;
}

function versionNum(v: string): number {
  return v === '1' ? 1.0 : parseFloat(v);
}

/**
 * Inserta una lámina de diseño libre guardada como NUEVA diapositiva al final del
 * plan, manteniendo los invariantes de `validatePlan`:
 *  - numeración 1..N sin huecos (la nueva es n = N+1),
 *  - bloques cubren 1..N (extiende el bloque que llega hasta N, o crea uno),
 *  - `notas_resumen` cubre todas las diapositivas (añade la entrada de la nueva),
 *  - `version_contrato` ≥ 1.3 (lienzo lo exige).
 * Función pura: devuelve un plan nuevo, no muta el recibido.
 */
export function insertCanvasSlide(plan: TeachingPlan, comp: CanvasComponent): TeachingPlan {
  const nuevoN = plan.diapositivas.length + 1;
  const etiqueta = comp.titulo || comp.alt || 'Lámina';

  const nueva: DiapoLienzo = {
    n: nuevoN,
    tipo: 'lienzo',
    html: comp.html,
    alt: comp.alt,
    ...(comp.css ? { css: comp.css } : {}),
    ...(comp.titulo ? { titulo: comp.titulo } : {}),
  };

  // Extiende el bloque que llega más lejos (el que cubre la última diapositiva).
  // Si no hay bloques, crea uno para la nueva lámina.
  let bloques = plan.bloques;
  if (bloques.length === 0) {
    bloques = [{ nombre: etiqueta, diapo_ini: nuevoN, diapo_fin: nuevoN, min: 5 }];
  } else {
    const idxUltimo = bloques.reduce(
      (best, b, i, arr) => (b.diapo_fin > arr[best].diapo_fin ? i : best),
      0,
    );
    bloques = bloques.map((b, i) => (i === idxUltimo ? { ...b, diapo_fin: nuevoN } : b));
  }

  const version: VersionContrato =
    versionNum(plan.version_contrato) < 1.3 ? '1.3' : plan.version_contrato;

  return {
    ...plan,
    version_contrato: version,
    diapositivas: [...plan.diapositivas, nueva],
    bloques,
    notas_resumen: [...plan.notas_resumen, { diapo: nuevoN, rotulo: etiqueta, texto: etiqueta }],
  };
}
