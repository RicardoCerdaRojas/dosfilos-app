import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { contrast, deltaE } from '../brand/color';
import { validateBrandTokens } from '../brand/validateBrand';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../../../../..');
const MARCAS = resolve(ROOT, 'docs/suite_diseno_v5_fuente/suite-ensenanza-biblica/assets/marcas');

function tokensDe(clave: string): Record<string, string> {
  const m = JSON.parse(readFileSync(resolve(MARCAS, clave, 'marca.json'), 'utf-8'));
  return m.tokens;
}

describe('teaching-suite brand — matemática de color', () => {
  it('contraste: blanco sobre negro = 21:1; igual = 1:1', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 0);
    expect(contrast('#808080', '#808080')).toBeCloseTo(1, 5);
  });

  it('ΔE: color contra sí mismo = 0; distinto > 0', () => {
    expect(deltaE('#8FA8C4', '#8FA8C4')).toBeCloseTo(0, 5);
    expect(deltaE('#D8A848', '#8FA8C4')).toBeGreaterThan(18);
  });
});

describe('teaching-suite brand — validateBrandTokens', () => {
  it('acepta las marcas semilla reales (sebex, iglesia)', () => {
    for (const clave of ['sebex', 'iglesia-1ra-concepcion']) {
      const r = validateBrandTokens(tokensDe(clave));
      expect(r.ok, `${clave}: ${r.errores.join(' | ')}`).toBe(true);
    }
  });

  it('rechaza si Escritura ≈ acento (ΔE < 18 — la semántica colapsa)', () => {
    const t = { ...tokensDe('sebex'), acento: tokensDe('sebex').escritura };
    const r = validateBrandTokens(t);
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => /DISTINCIÓN escritura↔acento/.test(e))).toBe(true);
  });

  it('rechaza contraste insuficiente de Escritura sobre oscuro', () => {
    // Escritura casi negra sobre fondo oscuro → contraste < 4.5.
    const t = { ...tokensDe('sebex'), escritura: '#141414' };
    const r = validateBrandTokens(t);
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => /CONTRASTE escritura sobre oscuro/.test(e))).toBe(true);
  });

  it('rechaza tokens faltantes o mal formados', () => {
    const r = validateBrandTokens({ oscuro: '#101317' });
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => /ausente/.test(e))).toBe(true);
  });
});
