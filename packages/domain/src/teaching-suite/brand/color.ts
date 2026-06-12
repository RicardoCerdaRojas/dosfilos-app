/**
 * Matemática de color para validar marcas — réplica fiel de `crear_marca.py`
 * (luminancia relativa WCAG, contraste, RGB→Lab, ΔE). Funciones puras.
 */

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace(/^#/, '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Luminancia relativa WCAG (umbral 0.03928, exponente 2.4). */
export function luminance(rgb: Rgb): number {
  const c = (v: number): number => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = [c(rgb[0]), c(rgb[1]), c(rgb[2])];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG entre dos colores hex. */
export function contrast(h1: string, h2: string): number {
  let l1 = luminance(hexToRgb(h1));
  let l2 = luminance(hexToRgb(h2));
  if (l1 < l2) [l1, l2] = [l2, l1];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** RGB→Lab (réplica de `rgb_lab`: umbral 0.04045, blanco D65). */
export function rgbToLab(rgb: Rgb): Rgb {
  const piv = (v: number): number => {
    const x = v / 255;
    return x > 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;
  };
  const [r, g, b] = [piv(rgb[0]), piv(rgb[1]), piv(rgb[2])];
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Distancia perceptual ΔE (euclidiana en Lab) entre dos colores hex. */
export function deltaE(h1: string, h2: string): number {
  const a = rgbToLab(hexToRgb(h1));
  const b = rgbToLab(hexToRgb(h2));
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
