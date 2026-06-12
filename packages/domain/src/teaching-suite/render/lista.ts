import type { DiapoLista, RenderContext } from '../TeachingPlan';
import { I, wrapSection } from './sec';

/** Réplica fiel de `r_lista`. */
export function renderLista(d: DiapoLista, ctx: RenderContext): string {
  const li = d.items.map((x) => `${I}  <li>${x}</li>`).join('\n');
  let c = `${I}<h2>${d.titulo}</h2>\n` + `${I}<ul class="lista">\n${li}\n${I}</ul>`;
  if (d.cierre) c += `\n${I}<p class="sub cierre-lista">${d.cierre}</p>`;
  return wrapSection(d, ctx, c);
}
