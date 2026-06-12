/**
 * Procesamiento de logo — funciones PURAS sobre píxeles RGBA (el canvas del web
 * las envuelve: getImageData → estas funciones → putImageData/toDataURL).
 * Réplica de la lógica de `logo_transparente` (crear_marca.py): fondo = moda de
 * los bordes; se transparenta lo cercano al fondo; recorte al contenido + margen.
 */

export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA, length = width*height*4
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Color de fondo = moda (RGB) de los píxeles del borde. */
export function borderBackground(px: Pixels): [number, number, number] {
  const { width, height, data } = px;
  const counts = new Map<number, number>();
  const add = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (let x = 0; x < width; x++) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    add(0, y);
    add(width - 1, y);
  }
  let best = 0;
  let bestN = -1;
  for (const [k, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = k;
    }
  }
  return [(best >> 16) & 0xff, (best >> 8) & 0xff, best & 0xff];
}

/** Transparenta los píxeles cercanos al fondo (distancia Manhattan ≤ tol). */
export function removeBackground(px: Pixels, tol = 40): Pixels {
  const [br, bg, bb] = borderBackground(px);
  const out = new Uint8ClampedArray(px.data);
  for (let i = 0; i < out.length; i += 4) {
    if (Math.abs(out[i] - br) + Math.abs(out[i + 1] - bg) + Math.abs(out[i + 2] - bb) <= tol) {
      out[i + 3] = 0;
    }
  }
  return { width: px.width, height: px.height, data: out };
}

/** Caja de contenido (alpha>0). Devuelve null si todo es transparente. */
export function contentBBox(px: Pixels): { x0: number; y0: number; x1: number; y1: number } | null {
  const { width, height, data } = px;
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x0, y0, x1, y1 };
}

/** Recorta al contenido y agrega un margen transparente del 4% (mín 2px). */
export function cropToContent(px: Pixels): Pixels {
  const box = contentBBox(px);
  if (!box) return px;
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  const m = Math.max(2, Math.round(Math.max(w, h) * 0.04));
  const nw = w + 2 * m;
  const nh = h + 2 * m;
  const out = new Uint8ClampedArray(nw * nh * 4); // todo transparente por defecto
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((box.y0 + y) * px.width + (box.x0 + x)) * 4;
      const di = ((m + y) * nw + (m + x)) * 4;
      out[di] = px.data[si];
      out[di + 1] = px.data[si + 1];
      out[di + 2] = px.data[si + 2];
      out[di + 3] = px.data[si + 3];
    }
  }
  return { width: nw, height: nh, data: out };
}

/** bg-removal + recorte + margen, en un paso (el web luego reescala ≤520px). */
export function processLogo(px: Pixels, tol = 40): Pixels {
  return cropToContent(removeBackground(px, tol));
}

/**
 * Propuesta heurística de paleta desde el logo: cuenta los colores no
 * transparentes (cuantizados a pasos de 24) y deriva 9 tokens. El usuario los
 * ajusta y el validador (`validateBrandTokens`) los audita; la exactitud no es
 * crítica, sí dar un punto de partida razonable.
 */
export function proposePalette(px: Pixels): Record<string, string> {
  const counts = new Map<number, { n: number; r: number; g: number; b: number }>();
  const q = (v: number) => Math.min(255, Math.round(v / 24) * 24);
  for (let i = 0; i < px.data.length; i += 4) {
    if (px.data[i + 3] < 128) continue; // ignora transparente/semitransparente
    const r = q(px.data[i]);
    const g = q(px.data[i + 1]);
    const b = q(px.data[i + 2]);
    const key = (r << 16) | (g << 8) | b;
    const e = counts.get(key) ?? { n: 0, r, g, b };
    e.n++;
    counts.set(key, e);
  }
  const cols = [...counts.values()].sort((a, b) => b.n - a.n);
  const lum = (c: { r: number; g: number; b: number }) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const sat = (c: { r: number; g: number; b: number }) =>
    Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);

  const oscuroC = [...cols].sort((a, b) => lum(a) - lum(b))[0] ?? { r: 16, g: 19, b: 23 };
  const acentoC =
    [...cols].sort((a, b) => sat(b) - sat(a))[0] ?? { r: 143, g: 168, b: 196 };

  // Defaults sensatos para los tokens no derivables del logo (el usuario ajusta).
  return {
    oscuro: toHex(oscuroC.r, oscuroC.g, oscuroC.b),
    panel: '#1A2027',
    medio: '#76828F',
    acento: toHex(acentoC.r, acentoC.g, acentoC.b),
    claro1: '#E8EDF2',
    claro2: '#F4F7FA',
    escritura: '#D8A848',
    escritura_tinta: '#7E6009',
    alerta: '#CC4F45',
  };
}
