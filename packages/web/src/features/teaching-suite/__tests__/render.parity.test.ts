import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { TeachingPlan } from '@dosfilos/domain';
import { renderPlanArtifacts } from '../render';

/**
 * Paridad del render CLIENT-SIDE (F1): con la marca semilla `sebex` embebida en
 * el bundle (assets + plantillas), `renderPlanArtifacts(plan_demo_v4_sebex)`
 * debe reproducir byte a byte el demo de referencia. Garantiza que el bundling
 * web es fiel al runtime congelado.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../../../../../..'); // packages/web/src/features/teaching-suite/__tests__ → raíz
const FUENTE = resolve(ROOT, 'docs/suite_diseno_v5_fuente');

describe('teaching-suite (web) — paridad de render client-side', () => {
  it('plan_demo_v4_sebex → demo_v4_sebex_presentacion.html', () => {
    const plan = JSON.parse(
      readFileSync(
        resolve(FUENTE, 'suite-ensenanza-biblica/ejemplos/plan_demo_v4_sebex.json'),
        'utf-8',
      ),
    ) as TeachingPlan;
    const golden = readFileSync(resolve(FUENTE, 'demos/demo_v4_sebex_presentacion.html'), 'utf-8');

    const out = renderPlanArtifacts(plan);
    expect(out.presentacion).toBe(golden);
  });
});
