import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { renderSlide } from '../render';
import type { Bloque, Diapositiva, TeachingPlan } from '../TeachingPlan';

/**
 * Paridad de render contra los demos COMPLETOS de referencia.
 *
 * Para cada (plan de ejemplo, demo renderizado) recorremos las diapositivas y
 * comparamos `renderSlide(d)` con la `<section>` correspondiente del demo (mismo
 * orden que el array `diapositivas`). Esto ejercita los 15 tipos + variantes +
 * lienzo de una sola vez. El demo es la salida del sistema Python de referencia.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../../../../..'); // → raíz del repo
const FUENTE = resolve(ROOT, 'docs/suite_diseno_v5_fuente');

interface Caso {
  plan: string;
  demo: string;
}
const CASOS: Caso[] = [
  { plan: 'plan_demo_v4_sebex.json', demo: 'demo_v4_sebex_presentacion.html' },
  { plan: 'plan_demo_componentes.json', demo: 'demo_componentes_presentacion.html' },
  { plan: 'plan_demo_variantes.json', demo: 'demo_variantes_presentacion.html' },
  { plan: 'plan_demo_lienzo.json', demo: 'demo_lienzo_presentacion.html' },
];

function bloqueDe(n: number, bloques: Bloque[]): string {
  for (const b of bloques) if (b.diapo_ini <= n && n <= b.diapo_fin) return b.nombre;
  return '';
}

/** Extrae las `<section class="diapo …">…</section>` en orden de aparición. */
function extractSections(html: string): string[] {
  return html.match(/<section class="diapo[\s\S]*?<\/section>/g) ?? [];
}

describe('teaching-suite — paridad de render contra demos completos', () => {
  for (const caso of CASOS) {
    it(`${caso.plan} ↔ ${caso.demo}`, () => {
      const plan = JSON.parse(
        readFileSync(resolve(FUENTE, 'suite-ensenanza-biblica/ejemplos', caso.plan), 'utf-8'),
      ) as TeachingPlan;
      const html = readFileSync(resolve(FUENTE, 'demos', caso.demo), 'utf-8');
      const sections = extractSections(html);

      // El demo debe tener exactamente una sección por diapositiva, en orden.
      expect(sections.length).toBe(plan.diapositivas.length);

      plan.diapositivas.forEach((d: Diapositiva, i: number) => {
        const ctx = { bloqueRotulo: bloqueDe(d.n, plan.bloques) };
        expect(renderSlide(d, ctx), `diapo n=${d.n} tipo=${d.tipo}`).toBe(sections[i]);
      });
    });
  }
});
