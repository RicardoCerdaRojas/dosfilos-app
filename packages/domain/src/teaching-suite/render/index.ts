import type { Diapositiva, DiapoEscritura, DiapoLista, DiapoPortada, RenderContext } from '../TeachingPlan';
import { renderPortada } from './portada';
import { renderLista } from './lista';
import { renderEscritura } from './escritura';

export { I, escHtml, wrapSection } from './sec';
export { renderPortada } from './portada';
export { renderLista } from './lista';
export { renderEscritura } from './escritura';

/** Tipos de lámina con renderer portado en F0. */
export const RENDERED_TYPES = ['portada', 'lista', 'escritura'] as const;

/**
 * Réplica fiel de `renderizar(d, ctx)`.
 * - Vía de escape / legado: `html` crudo reemplaza al renderer, EXCEPTO en
 *   `lienzo` (donde `html` es dato del componente y lo envuelve el renderer).
 * - F0: solo `portada`/`lista`/`escritura` están portados. Para los demás se
 *   lanza un error explícito en vez de producir HTML silenciosamente incorrecto.
 */
export function renderSlide(d: Diapositiva, ctx: RenderContext): string {
  if (d.html && d.tipo !== 'lienzo') return d.html;
  switch (d.tipo) {
    case 'portada':
      return renderPortada(d as DiapoPortada, ctx);
    case 'lista':
      return renderLista(d as DiapoLista, ctx);
    case 'escritura':
      return renderEscritura(d as DiapoEscritura, ctx);
    default:
      throw new Error(
        `[teaching-suite] renderer no portado aún para tipo "${d.tipo}" (diapo n=${d.n}). ` +
          `Tipos disponibles en F0: ${RENDERED_TYPES.join(', ')}.`,
      );
  }
}
