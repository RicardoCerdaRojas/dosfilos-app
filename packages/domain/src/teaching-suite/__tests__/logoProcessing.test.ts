import { describe, it, expect } from 'vitest';
import {
  borderBackground,
  contentBBox,
  cropToContent,
  processLogo,
  proposePalette,
  removeBackground,
  type Pixels,
} from '../brand/logoProcessing';

/** Imagen 10x10 blanca con un bloque rojo 4x4 en (3,3)-(6,6). */
function syntheticLogo(): Pixels {
  const w = 10;
  const h = 10;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
  for (let y = 3; y <= 6; y++) {
    for (let x = 3; x <= 6; x++) {
      const i = (y * w + x) * 4;
      data[i] = 200;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

describe('teaching-suite — procesamiento de logo (puro)', () => {
  it('detecta el fondo del borde (blanco)', () => {
    expect(borderBackground(syntheticLogo())).toEqual([255, 255, 255]);
  });

  it('transparenta el fondo y conserva el contenido', () => {
    const out = removeBackground(syntheticLogo());
    // esquina (fondo) transparente; centro del bloque opaco.
    expect(out.data[3]).toBe(0); // alpha en (0,0)
    const c = (5 * 10 + 5) * 4;
    expect(out.data[c + 3]).toBe(255);
    expect(out.data[c]).toBe(200);
  });

  it('bbox del contenido = el bloque rojo', () => {
    const box = contentBBox(removeBackground(syntheticLogo()));
    expect(box).toEqual({ x0: 3, y0: 3, x1: 6, y1: 6 });
  });

  it('recorta al contenido + margen 4% (mín 2px) → 8x8', () => {
    const out = cropToContent(removeBackground(syntheticLogo()));
    expect(out.width).toBe(8); // 4 + 2*2
    expect(out.height).toBe(8);
    // centro opaco rojo; esquina transparente.
    const c = (4 * 8 + 4) * 4;
    expect(out.data[c + 3]).toBe(255);
    expect(out.data[3]).toBe(0);
  });

  it('processLogo encadena remove+crop', () => {
    const out = processLogo(syntheticLogo());
    expect(out.width).toBe(8);
    expect(out.height).toBe(8);
  });

  it('proposePalette devuelve los 9 tokens como hex', () => {
    const p = proposePalette(processLogo(syntheticLogo()));
    const keys = [
      'oscuro',
      'panel',
      'medio',
      'acento',
      'claro1',
      'claro2',
      'escritura',
      'escritura_tinta',
      'alerta',
    ];
    for (const k of keys) expect(p[k]).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
