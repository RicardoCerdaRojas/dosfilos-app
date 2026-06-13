/**
 * Teaching Suite — F4 «trinquete»: fingerprint de formas de lienzo.
 *
 * COPIA LOCAL FIEL de `packages/domain/src/teaching-suite/canvasForm.ts`.
 * `packages/functions` NO depende de `@dosfilos/domain` (importarlo rompe el
 * build con ~180 TS6059), así que el algoritmo se replica aquí. La fuente de
 * verdad (con tests vitest) es el módulo de domain — cualquier cambio en la
 * normalización o el hash debe reflejarse en AMBOS o las clases divergen.
 */

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Hash FNV-1a de 32 bits → hex de 8 dígitos. Determinista, no criptográfico. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Fingerprint de la forma de un lienzo: html + css normalizados (sin etiquetas). */
export function canvasFormFingerprint(diapo: { html?: unknown; css?: unknown }): string {
  const html = normalizeWhitespace(typeof diapo.html === 'string' ? diapo.html : '');
  const css = normalizeWhitespace(typeof diapo.css === 'string' ? diapo.css : '');
  return fnv1a(`${html} ${css}`);
}

export interface CanvasForm {
  diapoN: number;
  fingerprint: string;
  alt?: string;
  titulo?: string;
}

/** Extrae las formas de lienzo de un plan serializado (ignora los otros tipos). */
export function extractCanvasForms(plan: { diapositivas?: unknown }): CanvasForm[] {
  const diapos = Array.isArray(plan?.diapositivas) ? plan.diapositivas : [];
  const formas: CanvasForm[] = [];
  for (const raw of diapos) {
    const d = raw as Record<string, unknown>;
    if (!d || d.tipo !== 'lienzo') continue;
    if (typeof d.html !== 'string' || d.html.trim() === '') continue;
    formas.push({
      diapoN: typeof d.n === 'number' ? d.n : 0,
      fingerprint: canvasFormFingerprint(d),
      ...(typeof d.alt === 'string' && d.alt ? { alt: d.alt } : {}),
      ...(typeof d.titulo === 'string' && d.titulo ? { titulo: d.titulo } : {}),
    });
  }
  return formas;
}
