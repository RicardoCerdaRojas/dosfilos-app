import type {
  DiapoLienzo,
  DiapoPasos,
  DiapoTarjetas,
  RenderContext,
  TarjetaFila,
} from '../TeachingPlan';
import { I, escHtml, wrapSection } from './sec';

function filaTarjeta(f: TarjetaFila): string {
  if (typeof f === 'object') {
    const etq = f.etq ? `<span class="etq">${f.etq}</span>` : '';
    return `${I}    <div class="tj-fila">${etq}${f.texto}</div>`;
  }
  return `${I}    <div class="tj-fila">${f}</div>`;
}

/** Réplica fiel de `r_tarjetas`. */
export function renderTarjetas(d: DiapoTarjetas, ctx: RenderContext): string {
  const cols = d.tarjetas.length;
  const tjs = d.tarjetas.map((t) => {
    const filas = (t.filas ?? []).map(filaTarjeta);
    const r = t.realce ? `${I}    <div class="tj-realce">${t.realce}</div>\n` : '';
    const nt = t.nota ? `${I}    <div class="tj-nota">${t.nota}</div>\n` : '';
    return (
      `${I}  <div class="tarjeta">\n` +
      `${I}    <div class="tj-titulo">${t.titulo}</div>\n` +
      filas.join('\n') +
      (filas.length ? '\n' : '') +
      r +
      nt +
      `${I}  </div>`
    );
  });
  let c = d.titulo ? `${I}<h2>${d.titulo}</h2>\n` : '';
  if (d.intro) c += `${I}<p class="tarjetas-intro">${d.intro}</p>\n`;
  c += `${I}<div class="tarjetas n${cols}">\n` + tjs.join('\n') + `\n${I}</div>`;
  return wrapSection(d, ctx, c);
}

/** Réplica fiel de `r_pasos`. */
export function renderPasos(d: DiapoPasos, ctx: RenderContext): string {
  const ps: string[] = [];
  d.pasos.forEach((p, k) => {
    if (k) ps.push(`${I}  <div class="paso-con" aria-hidden="true"></div>`);
    const cls = p.realce ? ' p-realce' : '';
    const sub = p.sub ? `${I}    <div class="p-sub">${p.sub}</div>\n` : '';
    ps.push(
      `${I}  <div class="paso${cls}">\n` +
        `${I}    <div class="p-titulo">${p.titulo}</div>\n` +
        sub +
        `${I}  </div>`,
    );
  });
  let c = d.titulo ? `${I}<h2>${d.titulo}</h2>\n` : '';
  if (d.intro) c += `${I}<p class="sub" style="margin-bottom:10px">${d.intro}</p>\n`;
  c += `${I}<div class="pasos">\n` + ps.join('\n') + `\n${I}</div>`;
  if (d.cierre) c += `\n${I}<p class="sub cierre-pasos">${d.cierre}</p>`;
  return wrapSection(d, ctx, c);
}

/**
 * Réplica fiel de `r_lienzo`. Encapsula el css por lámina (`.lz` → `#lzN`,
 * todas las ocurrencias) y envuelve el html del componente.
 */
export function renderLienzo(d: DiapoLienzo, ctx: RenderContext): string {
  const n = d.n;
  const css = (d.css ?? '').split('.lz').join(`#lz${n}`);
  const estilo = css ? `${I}<style>${css}</style>\n` : '';
  let c = d.titulo ? `${I}<h2>${d.titulo}</h2>\n` : '';
  c +=
    estilo +
    `${I}<div id="lz${n}" class="lz" aria-label="${escHtml(d.alt)}">\n` +
    `${d.html}\n${I}</div>`;
  return wrapSection(d, ctx, c);
}
