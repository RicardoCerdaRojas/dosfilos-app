import type { DiapoEscritura, RenderContext } from '../TeachingPlan';
import { I, wrapSection } from './sec';

/** Réplica fiel de `r_escritura`. */
export function renderEscritura(d: DiapoEscritura, ctx: RenderContext): string {
  const larga = d.texto.length > 220 ? ' larga' : '';
  const ver = d.version ? ` · ${d.version}` : '';
  const c =
    `${I}<p class="escritura${larga}">«${d.texto}»\n` +
    `${I}<span class="ref">${d.ref}${ver}</span></p>`;
  const centro = d.centro || d.variante === 'plena';
  return wrapSection(d, ctx, c, centro ? 'centro' : '');
}
