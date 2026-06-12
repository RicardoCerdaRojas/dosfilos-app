import type { DiapoBase, RenderContext } from '../TeachingPlan';

/**
 * Réplica fiel de `renderizadores.py` (`_sec`, `esc`, sangría `I`).
 * La salida HTML debe coincidir byte a byte con el runtime de referencia, por
 * eso la indentación es literal (10 espacios interiores, 8 al cerrar la
 * sección) y `class="sq {cls}"` conserva el espacio aun cuando `cls` es vacío.
 */

/** Sangría interior de las secciones (10 espacios, como la Clase 4). */
export const I = '          ';

/** Equivalente a `html.escape(s, quote=False)`: escapa solo & < >. */
export function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Envuelve el cuerpo de una diapositiva en `<section class="diapo …">`,
 * agregando kicker, riel de secuencia y la variante (`v-<variante>`).
 */
export function wrapSection(
  d: DiapoBase,
  ctx: RenderContext,
  cuerpo: string,
  extraClases = '',
): string {
  let extra = extraClases;
  if (d.variante) extra = `${extra} v-${d.variante}`;
  const clases = 'diapo' + (extra.trim() ? ' ' + extra.trim() : '');
  const bloque = ctx.bloqueRotulo ?? '';

  const k = d.kicker ? `${I}<div class="kicker">${d.kicker}</div>\n` : '';

  let sq = '';
  if (d.secuencia) {
    const sec = d.secuencia;
    const act = sec.actual ?? 1;
    const tramos = sec.etapas.map((etq, idx) => {
      const j = idx + 1;
      const cls = j === act ? 'act' : j < act ? 'hecha' : '';
      return `<span class="sq ${cls}"><span class="sq-n">${pad2(j)}</span>${etq}</span>`;
    });
    sq =
      `${I}<div class="secuencia" aria-label="Parte ${act} de ${sec.etapas.length}">` +
      tramos.join('') +
      '</div>\n';
  }

  return (
    `<section class="${clases}" data-bloque="${escHtml(bloque)}">\n` +
    `${k}${sq}${cuerpo}\n        </section>`
  );
}
