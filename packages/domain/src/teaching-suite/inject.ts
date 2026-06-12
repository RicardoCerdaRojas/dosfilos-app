import type { Artefacto, Bloque, Diapositiva, NotaResumen, TeachingPlan } from './TeachingPlan';
import type { InjectAssets, InjectResult, Marca } from './Brand';
import { renderSlide } from './render';

/**
 * Réplica fiel de `inyectar.py`: `plan + marca (+ edición) + plantillas →
 * artefactos HTML`. Función PURA y DETERMINISTA (mismo input ⇒ mismo HTML byte
 * a byte). El I/O (leer plantillas/fuentes/logo) vive en el callable; aquí los
 * assets llegan ya cargados en `InjectAssets`.
 */

const SANGRIA = '        '; // 8 espacios, como el original

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function rstrip(s: string): string {
  return s.replace(/\s+$/, '');
}
/** Equivalente a `json.dumps(s, ensure_ascii=False)` para cadenas. */
function jsStr(s: string): string {
  return JSON.stringify(s);
}

function bloqueDe(n: number, bloques: Bloque[]): string {
  for (const b of bloques) if (b.diapo_ini <= n && n <= b.diapo_fin) return b.nombre;
  return '';
}

function rotuloDe(d: Diapositiva): string {
  return d.rotulo ?? `D${d.n} · ${d.tipo}`;
}

function notasResumenJs(items: NotaResumen[]): string {
  const filas = items.map((x) => ` {b:${jsStr(x.rotulo)}, t:${jsStr(x.texto)}}`);
  return '[\n' + filas.join(',\n') + '\n]';
}

/** Une las secciones renderizadas con los comentarios de rótulo + sangría. */
function bloqueDiapositivas(htmls: string[], rotulos: string[], primeraConRotulo: boolean): string {
  const items = htmls.map((html, k) => {
    let rot = `<!-- ===== ${rotulos[k]} ===== -->\n${SANGRIA}`;
    if (k === 0 && !primeraConRotulo) rot = '';
    return rot + html;
  });
  return items.join('\n\n' + SANGRIA);
}

/**
 * Sustituye los tokens en el PRIMER bloque `:root{}` (los overrides de
 * `body.alto-contraste` son runtime fijo y no se tocan). Réplica de `aplicar_tokens`.
 */
function aplicarTokens(html: string, marca: Marca): string {
  const i0 = html.indexOf(':root{');
  if (i0 === -1) return html;
  const i1 = html.indexOf('}', i0);
  let root = html.slice(i0, i1);

  for (const [k, v] of Object.entries(marca.tokens)) {
    const varName = '--' + k.replace(/_/g, '-');
    const re = new RegExp('(' + escapeRegExp(varName) + '\\s*:\\s*)#[0-9A-Fa-f]{3,8}', 'g');
    root = root.replace(re, (_m, g1) => g1 + v);
  }
  if (marca.fuente) {
    root = root.replace(/(--fuente\s*:)[^;]+;?/, (_m, g1) => g1 + marca.fuente + ';');
  }
  if (marca.fuente_titulos) {
    root = rstrip(root) + `\n    --fuente-titulos: ${marca.fuente_titulos};`;
  }
  if (marca.fuente_escritura) {
    root = rstrip(root) + `\n    --fuente-escritura: ${marca.fuente_escritura};`;
  }
  root = rstrip(root) + '\n  ';
  return html.slice(0, i0) + root + html.slice(i1);
}

/** Incrusta @font-face base64 + marca de agua del icono + cssExtra. */
function bloqueFuentes(html: string, assets: InjectAssets): string {
  const { marca, fontBase64, iconoB64, cssExtra } = assets.brand;
  let css = '';
  for (const f of marca.fuentes ?? []) {
    const b64 = fontBase64[f.archivo] ?? '';
    css +=
      `@font-face{font-family:'${f.familia}';font-weight:${f.peso};` +
      `font-style:${f.estilo};font-display:swap;` +
      `src:url(data:font/woff2;base64,${b64}) format('woff2');}\n  `;
  }
  if (marca.icono && iconoB64) {
    css += `:root{--icono-marca:url(data:image/png;base64,${iconoB64});}\n  `;
  }
  let out = html.replace('/* @@FUENTES@@ */', css);
  if (marca.css_extra && cssExtra) {
    out = out.replace('</style>', '\n  /* @@MARCA-EXTRA@@ */\n' + cssExtra + '\n</style>');
  }
  return out;
}

const MARKER_RE = /@@[A-Z_]+@@/g;

export function injectArtifacts(plan: TeachingPlan, assets: InjectAssets): InjectResult {
  const { marca } = assets.brand;
  const T = plan.textos ?? {};

  // Render de cada diapositiva (con su rótulo de bloque).
  const htmls = plan.diapositivas.map((d) =>
    renderSlide(d, { bloqueRotulo: bloqueDe(d.n, plan.bloques) }),
  );
  const rotulos = plan.diapositivas.map(rotuloDe);
  const diaposHtml = bloqueDiapositivas(htmls, rotulos, true);
  const diaposReplica = bloqueDiapositivas(htmls, rotulos, false);

  const footerDefault = plan.serie
    ? `<strong>Serie:</strong> ${plan.serie} · ${marca.nombre}`
    : marca.nombre;
  const comunes: Record<string, string> = {
    '@@ID@@': plan.id,
    '@@LOGO_B64@@': assets.brand.logoB64,
    '@@PIE_SERIE@@':
      T.pie_serie ?? T._pie_serie_original ?? (plan.serie ? `Serie: ${plan.serie}` : marca.nombre),
    '@@FOOTER@@': T.footer_notas ?? footerDefault,
    '@@TOTAL_DIAPOS@@': String(plan.diapositivas.length),
  };

  const rellenar = (plantilla: string, extras: Record<string, string>): string => {
    let s = plantilla;
    s = aplicarTokens(s, marca);
    s = bloqueFuentes(s, assets);
    if (assets.edicionCss) {
      s = s.replace(
        '</style>',
        `\n  /*/* edicion-activa: ${plan.edicion} */\n` + assets.edicionCss + '\n</style>',
      );
    }
    for (const [k, v] of Object.entries({ ...comunes, ...extras })) {
      s = s.split(k).join(v);
    }
    const sobran = s.match(MARKER_RE);
    if (sobran) {
      throw new Error(`[teaching-suite] marcadores sin rellenar: ${[...new Set(sobran)].join(', ')}`);
    }
    return s;
  };

  const out: InjectResult = {};
  const has = (a: Artefacto) => plan.artefactos.includes(a) && assets.templates[a];

  if (has('presentacion')) {
    out.presentacion = rellenar(assets.templates.presentacion!, {
      '@@TITULO_PRESENTACION@@': T.titulo_presentacion ?? plan.titulo,
      '@@INFO_PRESENTACION@@': T.info_presentacion ?? plan.titulo,
      '@@DIAPOSITIVAS@@': diaposHtml,
      '@@NOTAS_RESUMEN_JS@@': notasResumenJs(plan.notas_resumen),
    });
  }

  if (has('notas')) {
    out.notas = rellenar(assets.templates.notas!, {
      '@@TITULO_NOTAS@@': T.titulo_notas ?? plan.titulo + ' — Notas docentes',
      '@@META_NOTAS@@': T.meta_notas ?? '<strong>Notas docentes</strong>',
      '@@CUERPO_NOTAS@@': plan.cuerpo_notas_html ?? '',
      '@@DIAPOSITIVAS_MINI@@': diaposReplica,
      '@@DIAPOSITIVAS_GRANDE@@': diaposReplica,
      '@@BLOQUES_JS@@': bloquesJs(plan.bloques),
    });
  }

  if (has('guia_sesion')) {
    out.guia_sesion = rellenar(assets.templates.guia_sesion!, {
      '@@TITULO_GUIA@@': T.titulo_guia ?? plan.titulo + ' — Guía de sesión',
      '@@META_GUIA@@': T.meta_guia ?? '<strong>Guía del consejero</strong>',
      '@@CUERPO_GUIA@@': plan.cuerpo_guia_html ?? '',
      '@@FOOTER@@': T.footer_guia ?? comunes['@@FOOTER@@'],
    });
  }

  if (has('hoja')) {
    out.hoja = rellenar(assets.templates.hoja!, {
      '@@TITULO_HOJA@@': T.titulo_hoja ?? plan.titulo + ' — Hoja de trabajo',
      '@@META_HOJA@@': T.meta_hoja ?? '<strong>Hoja de trabajo del alumno</strong>',
      '@@CUERPO_HOJA@@': plan.cuerpo_hoja_html ?? '',
      '@@FOOTER@@': T.footer_hoja ?? comunes['@@FOOTER@@'],
    });
  }

  return out;
}

/** Réplica fiel de `bloques_js`. */
function bloquesJs(items: Bloque[]): string {
  const filas = items.map(
    (x) => `  {nombre:'${x.nombre}', ini:${x.diapo_ini - 1}, fin:${x.diapo_fin - 1}, min:${x.min}}`,
  );
  return '[\n' + filas.join(',\n') + '\n]';
}
