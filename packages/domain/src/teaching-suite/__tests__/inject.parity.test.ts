import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { injectArtifacts } from '../inject';
import type { InjectAssets, Marca } from '../Brand';
import type { TeachingPlan } from '../TeachingPlan';

/**
 * Paridad del ARTEFACTO COMPLETO: `injectArtifacts(plan, marca, plantilla)` debe
 * reproducir byte a byte el demo de referencia generado por `inyectar.py`.
 * Es la prueba de extremo a extremo de F0 (tokens + fuentes base64 + icono +
 * marcadores + bloque de diapositivas + guardián).
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../../../../..');
const FUENTE = resolve(ROOT, 'docs/suite_diseno_v5_fuente');
const SKILL = resolve(FUENTE, 'suite-ensenanza-biblica');

function b64(absPath: string): string {
  return readFileSync(absPath).toString('base64');
}

function buildSebexAssets(): InjectAssets {
  const marcaDir = resolve(SKILL, 'assets/marcas/sebex');
  const marca = JSON.parse(readFileSync(resolve(marcaDir, 'marca.json'), 'utf-8')) as Marca;
  const fontBase64: Record<string, string> = {};
  for (const f of marca.fuentes ?? []) {
    fontBase64[f.archivo] = b64(resolve(marcaDir, f.archivo));
  }
  return {
    templates: {
      presentacion: readFileSync(resolve(SKILL, 'assets/plantilla_presentacion.html'), 'utf-8'),
    },
    brand: {
      marca,
      fontBase64,
      logoB64: b64(resolve(marcaDir, marca.logo)),
      iconoB64: marca.icono ? b64(resolve(marcaDir, marca.icono)) : undefined,
      cssExtra: marca.css_extra
        ? readFileSync(resolve(marcaDir, marca.css_extra), 'utf-8')
        : undefined,
    },
  };
}

describe('teaching-suite — paridad de artefacto completo (inyector)', () => {
  it('plan_demo_v4_sebex + marca sebex → demo_v4_sebex_presentacion.html', () => {
    const plan = JSON.parse(
      readFileSync(resolve(SKILL, 'ejemplos/plan_demo_v4_sebex.json'), 'utf-8'),
    ) as TeachingPlan;
    const golden = readFileSync(resolve(FUENTE, 'demos/demo_v4_sebex_presentacion.html'), 'utf-8');

    const out = injectArtifacts(plan, buildSebexAssets());

    // Diagnóstico útil si difiere: primer índice de divergencia.
    if (out.presentacion !== golden) {
      const a = out.presentacion ?? '';
      let i = 0;
      while (i < a.length && i < golden.length && a[i] === golden[i]) i++;
      throw new Error(
        `divergencia en índice ${i}\n--- generado ---\n${JSON.stringify(a.slice(Math.max(0, i - 60), i + 60))}\n--- esperado ---\n${JSON.stringify(golden.slice(Math.max(0, i - 60), i + 60))}`,
      );
    }
    expect(out.presentacion).toBe(golden);
  });

  it('guardián: lanza si quedan marcadores @@…@@ sin rellenar', () => {
    const plan = JSON.parse(
      readFileSync(resolve(SKILL, 'ejemplos/plan_demo_v4_sebex.json'), 'utf-8'),
    ) as TeachingPlan;
    const assets = buildSebexAssets();
    // Plantilla con un marcador inexistente → debe fallar el guardián.
    assets.templates.presentacion = (assets.templates.presentacion ?? '') + '\n@@MARCADOR_FALSO@@';
    expect(() => injectArtifacts(plan, assets)).toThrow(/marcadores sin rellenar/);
  });
});
