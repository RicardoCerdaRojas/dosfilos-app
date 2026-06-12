import type {
  DiapoEscrituraAnotada,
  DiapoFlujo,
  DiapoParalelismo,
  DiapoQuiasmo,
  DiapoTermino,
  FlujoNodo,
  RenderContext,
} from '../TeachingPlan';
import { I, wrapSection } from './sec';

/** Réplica fiel de `r_escritura_anotada`. */
export function renderEscrituraAnotada(d: DiapoEscrituraAnotada, ctx: RenderContext): string {
  let texto = d.texto;
  const notas: string[] = [];
  d.destacados.forEach((m, idx) => {
    const k = idx + 1;
    const pal = m.palabra;
    const marca = `<span class="esc-realce">${pal}<sup class="ea-num">${k}</sup></span>`;
    texto = texto.replace(pal, marca); // primera ocurrencia (str.replace literal)
    notas.push(
      `${I}  <div class="ea-nota"><span class="ea-num">${k}</span>` +
        `<span class="ea-palabra">${pal}</span>` +
        `<span class="ea-texto">${m.nota}</span></div>`,
    );
  });
  const c =
    `${I}<p class="escritura ea">«${texto}»\n` +
    `${I}<span class="ref">${d.ref}</span></p>\n` +
    `${I}<div class="ea-notas">\n` +
    notas.join('\n') +
    `\n${I}</div>`;
  return wrapSection(d, ctx, c);
}

/** Réplica fiel de `r_quiasmo`. */
export function renderQuiasmo(d: DiapoQuiasmo, ctx: RenderContext): string {
  const filas = d.lineas.map((ln) => {
    const centro = ln.centro ? ' q-centro' : '';
    return (
      `${I}  <div class="q-linea nivel-${ln.nivel}${centro}">` +
      `<span class="q-etq">${ln.etq}</span>` +
      `<span class="q-texto esc-inline">${ln.texto}</span></div>`
    );
  });
  const c =
    `${I}<h2>${d.titulo ?? 'Estructura quiástica'} <span class="ref">${d.ref ?? ''}</span></h2>\n` +
    `${I}<div class="quiasmo">\n` +
    filas.join('\n') +
    `\n${I}</div>`;
  return wrapSection(d, ctx, c);
}

const ROT_PARALELO: Record<string, string> = {
  sinonimo: 'Paralelismo sinónimo',
  antitetico: 'Paralelismo antitético',
  sintetico: 'Paralelismo sintético',
};

/** Réplica fiel de `r_paralelismo`. */
export function renderParalelismo(d: DiapoParalelismo, ctx: RenderContext): string {
  const filas = d.pares.map(
    (p) =>
      `${I}  <div class="par-fila">` +
      `<span class="par-a esc-inline">${p.a}</span>` +
      `<span class="par-rel">${p.relacion ?? '‖'}</span>` +
      `<span class="par-b esc-inline">${p.b}</span></div>`,
  );
  const c =
    `${I}<h2>${d.titulo ?? ROT_PARALELO[d.clase] ?? 'Paralelismo'} ` +
    `<span class="ref">${d.ref ?? ''}</span></h2>\n` +
    `${I}<div class="paralelo p-${d.clase}">\n` +
    filas.join('\n') +
    `\n${I}</div>`;
  return wrapSection(d, ctx, c);
}

/** Profundidad visual de cada nodo según la cadena de conexiones (memoizado). */
function profundidades(nodos: FlujoNodo[]): Record<string, number> {
  const prof: Record<string, number> = {};
  const porId: Record<string, FlujoNodo> = {};
  for (const x of nodos) porId[x.id] = x;
  const p = (i: string): number => {
    if (i in prof) return prof[i];
    const c = porId[i]?.conecta;
    prof[i] = c === null || c === undefined ? 0 : p(c) + 1;
    return prof[i];
  };
  for (const x of nodos) p(x.id);
  return prof;
}

/** Réplica fiel de `r_flujo`. */
export function renderFlujo(d: DiapoFlujo, ctx: RenderContext): string {
  const prof = profundidades(d.nodos);
  const filas = d.nodos.map((nd) => {
    const con = nd.conector ? `<span class="f-conector">${nd.conector}</span>` : '';
    return (
      `${I}  <div class="f-nodo prof-${prof[nd.id]} rol-${nd.rol}">` +
      `${con}<span class="f-rol">${nd.rol}</span>` +
      `<span class="f-ref">${nd.ref ?? ''}</span>` +
      `<span class="f-texto esc-inline">${nd.texto}</span></div>`
    );
  });
  const c =
    `${I}<h2>${d.titulo ?? 'Flujo del argumento'} <span class="ref">${d.ref ?? ''}</span></h2>\n` +
    (d.proposicion ? `${I}<p class="sub f-prop">${d.proposicion}</p>\n` : '') +
    `${I}<div class="flujo">\n` +
    filas.join('\n') +
    `\n${I}</div>`;
  return wrapSection(d, ctx, c);
}

/** Réplica fiel de `r_termino`. */
export function renderTermino(d: DiapoTermino, ctx: RenderContext): string {
  const usos = (d.usos ?? [])
    .map((u) => `${I}    <li><span class="ref">${u.ref}</span> — ${u.matiz}</li>\n`)
    .join('');
  const rango = (d.rango ?? []).join(' · ');
  const rtl = d.idioma === 'hebreo' ? ' dir="rtl"' : '';
  const c =
    `${I}<div class="termino">\n` +
    `${I}  <div class="t-cab"><span class="t-lema lexico"${rtl}>${d.lema}` +
    `</span><span class="t-translit">${d.translit ?? ''}</span></div>\n` +
    `${I}  <div class="t-morf">${d.morfologia ?? ''}</div>\n` +
    `${I}  <div class="t-glosa">${d.glosa ?? ''}</div>\n` +
    (rango ? `${I}  <div class="t-rango">${rango}</div>\n` : '') +
    (usos ? `${I}  <ul class="t-usos">\n${usos}${I}  </ul>\n` : '') +
    `${I}</div>`;
  return wrapSection(d, ctx, c);
}
