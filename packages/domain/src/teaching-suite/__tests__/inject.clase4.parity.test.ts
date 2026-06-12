import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { injectArtifacts } from '../inject';
import type { InjectAssets, Marca } from '../Brand';
import type { Artefacto, TeachingPlan } from '../TeachingPlan';

/**
 * Paridad de los TRES artefactos (presentacion + notas + hoja) con la marca
 * `iglesia-1ra-concepcion`, contra los demos de la Clase 4. Ejercita los caminos
 * de inyección de `notas` (consola: @@CUERPO_NOTAS@@ + réplicas + @@BLOQUES_JS@@)
 * y `hoja` (@@CUERPO_HOJA@@), además de presentacion — todos byte a byte.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../../../../..');
const FUENTE = resolve(ROOT, 'docs/suite_diseno_v5_fuente');
const SKILL = resolve(FUENTE, 'suite-ensenanza-biblica');

function b64(p: string): string {
  return readFileSync(p).toString('base64');
}

function buildIglesiaAssets(plan: TeachingPlan): InjectAssets {
  const marcaDir = resolve(SKILL, 'assets/marcas/iglesia-1ra-concepcion');
  const marca = JSON.parse(readFileSync(resolve(marcaDir, 'marca.json'), 'utf-8')) as Marca;
  const fontBase64: Record<string, string> = {};
  for (const f of marca.fuentes ?? []) fontBase64[f.archivo] = b64(resolve(marcaDir, f.archivo));

  const templates: InjectAssets['templates'] = {};
  const map: Record<Artefacto, string> = {
    presentacion: 'plantilla_presentacion.html',
    notas: 'plantilla_notas.html',
    hoja: 'plantilla_hoja.html',
    guia_sesion: 'plantilla_guia_sesion.html',
  };
  for (const a of plan.artefactos) {
    templates[a] = readFileSync(resolve(SKILL, 'assets', map[a]), 'utf-8');
  }

  return {
    templates,
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

const DEMO: Record<string, string> = {
  presentacion: 'clase4_presentacion.html',
  notas: 'clase4_notas_docentes.html',
  hoja: 'clase4_hoja_de_trabajo.html',
};

describe('teaching-suite — paridad de los 3 artefactos (Clase 4 · iglesia)', () => {
  const plan = JSON.parse(
    readFileSync(resolve(SKILL, 'ejemplos/plan_clase4.json'), 'utf-8'),
  ) as TeachingPlan;
  const out = injectArtifacts(plan, buildIglesiaAssets(plan));

  for (const artefacto of plan.artefactos) {
    it(`${artefacto} → ${DEMO[artefacto]}`, () => {
      const golden = readFileSync(resolve(FUENTE, 'demos', DEMO[artefacto]), 'utf-8');
      expect(out[artefacto]).toBe(golden);
    });
  }
});
