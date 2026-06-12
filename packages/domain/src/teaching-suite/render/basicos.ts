import type {
  DiapoConfrontacion,
  DiapoEsquema,
  DiapoSintesis,
  DiapoTransicion,
  RenderContext,
} from '../TeachingPlan';
import { I, escHtml, wrapSection } from './sec';

/** Réplica fiel de `r_sintesis`. */
export function renderSintesis(d: DiapoSintesis, ctx: RenderContext): string {
  let c =
    `${I}<div class="caja caja-sintesis">\n` +
    `${I}  <p class="sintesis-texto">${d.texto}</p>\n${I}</div>`;
  if (d.nota) c += `\n${I}<p class="sub" style="margin-top:22px">${d.nota}</p>`;
  return wrapSection(d, ctx, c, 'centro');
}

/** Réplica fiel de `r_confrontacion`. */
export function renderConfrontacion(d: DiapoConfrontacion, ctx: RenderContext): string {
  let c =
    `${I}<div class="caja caja-error">\n` +
    `${I}  <div class="titulo-error">El error que confrontamos</div>\n` +
    `${I}  <p class="sub" style="margin:0">«${d.error}»</p>\n${I}</div>`;
  if (d.respuestas) {
    const li = d.respuestas.map((x) => `${I}  <li>${x}</li>`).join('\n');
    c += `\n${I}<ul class="lista lista-compacta">\n${li}\n${I}</ul>`;
  } else if (d.respuesta) {
    c += `\n${I}<p class="sub">${d.respuesta}</p>`;
  }
  return wrapSection(d, ctx, c);
}

/** Réplica fiel de `r_transicion`. */
export function renderTransicion(d: DiapoTransicion, ctx: RenderContext): string {
  let c = `${I}<h2 class="transicion-titulo">${d.texto}</h2>`;
  if (d.texto_escritura) {
    c +=
      `\n${I}<p class="escritura" style="font-size:32px;max-width:1000px">«${d.texto_escritura}»\n` +
      `${I}<span class="ref">${d.ref ?? ''}</span></p>`;
  }
  return wrapSection(d, ctx, c, 'centro');
}

/** Réplica fiel de `r_esquema`. */
export function renderEsquema(d: DiapoEsquema, ctx: RenderContext): string {
  let c = d.titulo ? `${I}<h2>${d.titulo}</h2>\n` : '';
  c +=
    `${I}<div class="esquema" role="img" aria-label="${escHtml(d.alt)}">\n` +
    `${I}${d.svg}\n${I}</div>`;
  return wrapSection(d, ctx, c);
}
