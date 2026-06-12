import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Artefacto, TeachingPlan } from '@dosfilos/domain';
import { renderArtifact } from '../render';

/**
 * Paridad del render CLIENT-SIDE de los 3 artefactos con la marca embebida
 * `iglesia-1ra-concepcion` (Clase 4). Garantiza que el bundle web de iglesia +
 * los caminos de notas/hoja son fieles al runtime.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../../../../../..');
const FUENTE = resolve(ROOT, 'docs/suite_diseno_v5_fuente');

const DEMO: Record<string, string> = {
  presentacion: 'clase4_presentacion.html',
  notas: 'clase4_notas_docentes.html',
  hoja: 'clase4_hoja_de_trabajo.html',
};

describe('teaching-suite (web) — paridad 3 artefactos Clase 4 (iglesia)', () => {
  const plan = JSON.parse(
    readFileSync(resolve(FUENTE, 'suite-ensenanza-biblica/ejemplos/plan_clase4.json'), 'utf-8'),
  ) as TeachingPlan;

  for (const artefacto of plan.artefactos) {
    it(`${artefacto} → ${DEMO[artefacto]}`, () => {
      const golden = readFileSync(resolve(FUENTE, 'demos', DEMO[artefacto]), 'utf-8');
      expect(renderArtifact(plan, artefacto as Artefacto)).toBe(golden);
    });
  }
});
