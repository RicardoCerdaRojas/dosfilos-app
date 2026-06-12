import { describe, it, expect } from 'vitest';
import { validatePlan } from '../validatePlan';
import type { TeachingPlan } from '../TeachingPlan';

function basePlan(): TeachingPlan {
  return {
    id: 'clase_demo',
    titulo: 'Clase demo',
    genero: 'doctrina',
    marca: 'sebex',
    artefactos: ['presentacion'],
    version_contrato: '1',
    bloques: [{ nombre: 'B', diapo_ini: 1, diapo_fin: 2, min: 10 }],
    diapositivas: [
      { n: 1, tipo: 'portada', titulo: 'T' },
      { n: 2, tipo: 'lista', titulo: 'L', items: ['a', 'b'] },
    ],
    notas_resumen: [
      { diapo: 1, rotulo: 'D1', texto: 'x' },
      { diapo: 2, rotulo: 'D2', texto: 'y' },
    ],
  };
}

describe('validatePlan — plan válido', () => {
  it('acepta un plan estructuralmente correcto', () => {
    const r = validatePlan(basePlan());
    expect(r.ok).toBe(true);
    expect(r.errores).toEqual([]);
  });
});

describe('validatePlan — casos negativos (cada regla dura)', () => {
  it('id inválido', () => {
    const p = basePlan();
    p.id = 'Clase Demo';
    expect(validatePlan(p).ok).toBe(false);
  });

  it('genero inválido', () => {
    const p = basePlan();
    (p as { genero: string }).genero = 'historia';
    expect(validatePlan(p).ok).toBe(false);
  });

  it('modalidad sesion ⇒ sin presentacion/notas, con guia_sesion', () => {
    const p = basePlan();
    p.genero = 'consejeria';
    p.modalidad = 'sesion';
    // sigue declarando presentacion y no declara guia_sesion → dos errores
    const r = validatePlan(p);
    expect(r.ok).toBe(false);
    expect(r.errores.some((e) => /sin presentacion/.test(e))).toBe(true);
    expect(r.errores.some((e) => /requiere guia_sesion/.test(e))).toBe(true);
  });

  it('version_contrato incoherente con features usados', () => {
    const p = basePlan();
    p.diapositivas[1] = { n: 2, tipo: 'lista', titulo: 'L', items: ['a'], variante: 'numerada' };
    // usa variante ⇒ requiere ≥1.2 pero declara "1"
    expect(validatePlan(p).errores.some((e) => /incoherente/.test(e))).toBe(true);
  });

  it('numeración con hueco', () => {
    const p = basePlan();
    p.diapositivas[1].n = 3; // 1,3 en vez de 1,2
    expect(validatePlan(p).ok).toBe(false);
  });

  it('bloques no cubren o solapan', () => {
    const p = basePlan();
    p.bloques = [{ nombre: 'B', diapo_ini: 1, diapo_fin: 1, min: 5 }]; // deja la 2 sin cubrir
    expect(validatePlan(p).errores.some((e) => /no cubren la diapositiva 2/.test(e))).toBe(true);

    const p2 = basePlan();
    p2.bloques = [
      { nombre: 'A', diapo_ini: 1, diapo_fin: 2, min: 5 },
      { nombre: 'B', diapo_ini: 2, diapo_fin: 2, min: 5 },
    ];
    expect(validatePlan(p2).errores.some((e) => /solapan/.test(e))).toBe(true);
  });

  it('notas_resumen incompleto', () => {
    const p = basePlan();
    p.notas_resumen = [{ diapo: 1, rotulo: 'D1', texto: 'x' }];
    expect(validatePlan(p).errores.some((e) => /notas_resumen no cubre/.test(e))).toBe(true);
  });

  it('escritura sin ref', () => {
    const p = basePlan();
    p.diapositivas[1] = { n: 2, tipo: 'escritura', ref: '', texto: 't' } as never;
    expect(validatePlan(p).errores.some((e) => /requiere ref/.test(e))).toBe(true);
  });

  it('lista con más de 4 ítems', () => {
    const p = basePlan();
    p.diapositivas[1] = { n: 2, tipo: 'lista', titulo: 'L', items: ['a', 'b', 'c', 'd', 'e'] };
    expect(validatePlan(p).errores.some((e) => /máx 4/.test(e))).toBe(true);
  });

  it('quiasmo sin centro único / no espejado', () => {
    const p = basePlan();
    p.version_contrato = '1';
    p.diapositivas[1] = {
      n: 2,
      tipo: 'quiasmo',
      lineas: [
        { nivel: 1, texto: 'a' },
        { nivel: 2, texto: 'b' }, // no espejado, sin centro
      ],
    } as never;
    const r = validatePlan(p);
    expect(r.errores.some((e) => /palíndromo/.test(e))).toBe(true);
    expect(r.errores.some((e) => /exactamente un centro/.test(e))).toBe(true);
  });

  it('flujo con nodo huérfano y sin raíz', () => {
    const p = basePlan();
    p.diapositivas[1] = {
      n: 2,
      tipo: 'flujo',
      nodos: [{ id: 'x', conecta: 'noexiste', rol: 'principal', texto: 't' }],
    } as never;
    const r = validatePlan(p);
    expect(r.errores.some((e) => /id inexistente/.test(e))).toBe(true);
    expect(r.errores.some((e) => /no tiene raíz/.test(e))).toBe(true);
  });

  it('escritura-anotada con palabra ausente del texto', () => {
    const p = basePlan();
    p.diapositivas[1] = {
      n: 2,
      tipo: 'escritura-anotada',
      ref: 'Jn 1:1',
      texto: 'En el principio era el Verbo',
      destacados: [{ palabra: 'Espíritu', nota: 'n' }],
    } as never;
    expect(validatePlan(p).errores.some((e) => /ausente en el texto/.test(e))).toBe(true);
  });

  it('lienzo emite aviso (no error) de QA visual', () => {
    const p = basePlan();
    p.version_contrato = '1.3';
    p.diapositivas[1] = {
      n: 2,
      tipo: 'lienzo',
      html: '<div class="lz"></div>',
      alt: 'diagrama',
    } as never;
    const r = validatePlan(p);
    expect(r.avisos.some((a) => /QA visual/.test(a))).toBe(true);
  });
});
