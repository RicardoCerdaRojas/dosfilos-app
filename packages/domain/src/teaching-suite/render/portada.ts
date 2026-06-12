import type { DiapoPortada, RenderContext } from '../TeachingPlan';
import { I, wrapSection } from './sec';

/** Réplica fiel de `r_portada`. */
export function renderPortada(d: DiapoPortada, ctx: RenderContext): string {
  const c = [`${I}<h1 class="portada-titulo">${d.titulo}</h1>`];
  if (d.destacado) c.push(`${I}<p class="sub portada-destacado">${d.destacado}</p>`);
  if (d.meta) c.push(`${I}<p class="sub portada-meta">${d.meta}</p>`);
  return wrapSection(d, ctx, c.join('\n'), 'centro portada');
}
