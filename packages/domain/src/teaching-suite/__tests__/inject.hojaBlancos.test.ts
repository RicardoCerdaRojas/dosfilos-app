import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { injectArtifacts } from '../inject';
import type { InjectAssets, Marca } from '../Brand';
import type { TeachingPlan } from '../TeachingPlan';

/**
 * Regresión: los espacios de la hoja (`<span class="blanco ...">`) deben
 * renderizarse VACÍOS aunque el plan traiga la respuesta dentro del span (el
 * modelo a veces la mete → se vería el texto cortado por el border-bottom). El
 * inyector los vacía en el render; el plan no se toca.
 */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../../../../..');
const SKILL = resolve(ROOT, 'docs/suite_diseno_v5_fuente/suite-ensenanza-biblica');

function buildHojaAssets(): InjectAssets {
  const marcaDir = resolve(SKILL, 'assets/marcas/sebex');
  const marca = JSON.parse(readFileSync(resolve(marcaDir, 'marca.json'), 'utf-8')) as Marca;
  const fontBase64: Record<string, string> = {};
  for (const f of marca.fuentes ?? []) {
    fontBase64[f.archivo] = readFileSync(resolve(marcaDir, f.archivo)).toString('base64');
  }
  return {
    templates: {
      hoja: readFileSync(resolve(SKILL, 'assets/plantilla_hoja.html'), 'utf-8'),
    },
    brand: {
      marca,
      fontBase64,
      logoB64: readFileSync(resolve(marcaDir, marca.logo)).toString('base64'),
      iconoB64: marca.icono
        ? readFileSync(resolve(marcaDir, marca.icono)).toString('base64')
        : undefined,
    },
  };
}

const planBase: TeachingPlan = {
  id: 't',
  titulo: 'T',
  genero: 'doctrina',
  marca: 'sebex',
  artefactos: ['hoja'],
  version_contrato: '1',
  bloques: [{ nombre: 'B', diapo_ini: 1, diapo_fin: 1, min: 5 }],
  diapositivas: [{ n: 1, tipo: 'portada', titulo: 'T' }],
  notas_resumen: [{ diapo: 1, rotulo: 'r', texto: 't' }],
};

describe('teaching-suite — hoja: blanks vacíos en el render', () => {
  it('vacía la respuesta que el modelo metió dentro de un span.blanco', () => {
    const plan: TeachingPlan = {
      ...planBase,
      cuerpo_hoja_html:
        '<p>El Espíritu <span class="blanco corto">escudriña</span> todo, aun lo ' +
        '<span class="blanco">profundo de Dios</span>.</p>',
    };
    const out = injectArtifacts(plan, buildHojaAssets());
    expect(out.hoja).toContain('<span class="blanco corto"></span>');
    expect(out.hoja).toContain('<span class="blanco"></span>');
    expect(out.hoja).not.toContain('escudriña');
    expect(out.hoja).not.toContain('profundo de Dios');
  });

  it('deja intacto un span.blanco ya vacío (no-op)', () => {
    const plan: TeachingPlan = {
      ...planBase,
      cuerpo_hoja_html: '<p>Texto con <span class="blanco corto"></span> para rellenar.</p>',
    };
    const out = injectArtifacts(plan, buildHojaAssets());
    expect(out.hoja).toContain('<span class="blanco corto"></span>');
  });
});
