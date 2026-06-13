import { describe, it, expect } from 'vitest';
import { canvasFormFingerprint, extractCanvasForms, insertCanvasSlide } from '../canvasForm';
import { validatePlan } from '../validatePlan';
import type { TeachingPlan } from '../TeachingPlan';

describe('canvasFormFingerprint', () => {
  it('es estable: misma forma → mismo fingerprint', () => {
    const a = { html: '<div class="lz">Hola</div>', css: '.lz{color:var(--tinta)}' };
    const b = { html: '<div class="lz">Hola</div>', css: '.lz{color:var(--tinta)}' };
    expect(canvasFormFingerprint(a)).toBe(canvasFormFingerprint(b));
  });

  it('ignora diferencias de espacios en blanco / sangría / saltos', () => {
    const compacto = { html: '<div class="lz">Hola</div>', css: '.lz{color:red}' };
    const indentado = {
      html: '\n  <div   class="lz">\n    Hola\n  </div>\n',
      css: '.lz {\n  color: red\n}\n',
    };
    // El html difiere en espacios internos del texto, así que normalizamos a la
    // misma corrida de espacios: ambos colapsan a "<div class="lz"> Hola </div>".
    const norm = { html: '<div class="lz"> Hola </div>', css: '.lz { color: red }' };
    expect(canvasFormFingerprint(indentado)).toBe(canvasFormFingerprint(norm));
    // El compacto sin espacios internos NO coincide (forma distinta del texto).
    expect(canvasFormFingerprint(compacto)).not.toBe(canvasFormFingerprint(indentado));
  });

  it('html distinto → fingerprint distinto', () => {
    const a = { html: '<div class="lz">A</div>' };
    const b = { html: '<div class="lz">B</div>' };
    expect(canvasFormFingerprint(a)).not.toBe(canvasFormFingerprint(b));
  });

  it('css distinto → fingerprint distinto (mismo html)', () => {
    const a = { html: '<div class="lz">x</div>', css: '.lz{color:red}' };
    const b = { html: '<div class="lz">x</div>', css: '.lz{color:blue}' };
    expect(canvasFormFingerprint(a)).not.toBe(canvasFormFingerprint(b));
  });

  it('css ausente vs css vacío → mismo fingerprint', () => {
    const a = { html: '<div class="lz">x</div>' };
    const b = { html: '<div class="lz">x</div>', css: '' };
    expect(canvasFormFingerprint(a)).toBe(canvasFormFingerprint(b));
  });

  it('devuelve hex de 8 dígitos', () => {
    expect(canvasFormFingerprint({ html: '<div class="lz">x</div>' })).toMatch(/^[0-9a-f]{8}$/);
  });

  // Golden lock: bloquea la salida del algoritmo. Si este valor cambia, hay que
  // reflejar el mismo cambio en la COPIA de `packages/functions/src/teaching-suite/
  // canvasForm.ts` o las clases divergen (functions no importa domain).
  it('valor golden estable (sincronizar mirror de functions si cambia)', () => {
    expect(
      canvasFormFingerprint({ html: '<div class="lz">Hola</div>', css: '.lz{color:var(--tinta)}' }),
    ).toBe('2e430670');
  });
});

function planConDiapos(diapos: TeachingPlan['diapositivas']): TeachingPlan {
  return {
    id: 'clase_demo',
    titulo: 'Clase demo',
    genero: 'doctrina',
    marca: 'sebex',
    artefactos: ['presentacion'],
    version_contrato: '1',
    bloques: [{ nombre: 'B', diapo_ini: 1, diapo_fin: diapos.length, min: 10 }],
    diapositivas: diapos,
    notas_resumen: diapos.map((d) => ({ diapo: d.n, rotulo: `D${d.n}`, texto: 'x' })),
  };
}

describe('extractCanvasForms', () => {
  it('toma solo los lienzo e ignora los otros tipos', () => {
    const plan = planConDiapos([
      { n: 1, tipo: 'portada', titulo: 'T' },
      { n: 2, tipo: 'lienzo', html: '<div class="lz">A</div>', alt: 'Diagrama A' },
      { n: 3, tipo: 'lista', titulo: 'L', items: ['a'] },
      { n: 4, tipo: 'lienzo', html: '<div class="lz">B</div>', css: '.lz{gap:1rem}', alt: 'Forma B', titulo: 'Forma B' },
    ]);
    const formas = extractCanvasForms(plan);
    expect(formas).toHaveLength(2);
    expect(formas[0]).toMatchObject({ diapoN: 2, alt: 'Diagrama A' });
    expect(formas[1]).toMatchObject({ diapoN: 4, titulo: 'Forma B' });
    expect(formas[0].fingerprint).not.toBe(formas[1].fingerprint);
  });

  it('descarta lienzo sin html utilizable', () => {
    const plan = planConDiapos([
      { n: 1, tipo: 'lienzo', html: '   ', alt: 'vacío' } as never,
      { n: 2, tipo: 'lienzo', html: '<div class="lz">ok</div>', alt: 'ok' },
    ]);
    const formas = extractCanvasForms(plan);
    expect(formas).toHaveLength(1);
    expect(formas[0].diapoN).toBe(2);
  });

  it('plan sin diapositivas → arreglo vacío', () => {
    expect(extractCanvasForms({ diapositivas: [] } as never)).toEqual([]);
  });
});

describe('insertCanvasSlide', () => {
  const comp = {
    html: '<div class="lz">Diagrama</div>',
    css: '.lz{display:grid}',
    alt: 'Diagrama cronológico',
    titulo: 'Cronología',
  };

  it('inserta la lámina como n=N+1 y deja el plan válido', () => {
    const plan = planConDiapos([
      { n: 1, tipo: 'portada', titulo: 'T' },
      { n: 2, tipo: 'lista', titulo: 'L', items: ['a', 'b'] },
    ]);
    const next = insertCanvasSlide(plan, comp);

    expect(next.diapositivas).toHaveLength(3);
    const nueva = next.diapositivas[2];
    expect(nueva).toMatchObject({ n: 3, tipo: 'lienzo', html: comp.html, alt: comp.alt });
    // El plan resultante cumple el contrato (numeración, cobertura de bloques y notas).
    expect(validatePlan(next).ok).toBe(true);
  });

  it('extiende el bloque que cubre la última diapositiva', () => {
    const plan = planConDiapos([
      { n: 1, tipo: 'portada', titulo: 'T' },
      { n: 2, tipo: 'lista', titulo: 'L', items: ['a'] },
    ]);
    const next = insertCanvasSlide(plan, comp);
    const ultimo = next.bloques[next.bloques.length - 1];
    expect(ultimo.diapo_fin).toBe(3);
  });

  it('sube version_contrato a 1.3 si era menor (lienzo lo exige)', () => {
    const plan = { ...planConDiapos([{ n: 1, tipo: 'portada', titulo: 'T' }]), version_contrato: '1' as const };
    const next = insertCanvasSlide(plan, comp);
    expect(next.version_contrato).toBe('1.3');
    expect(validatePlan(next).ok).toBe(true);
  });

  it('respeta una version_contrato ya superior', () => {
    const plan = { ...planConDiapos([{ n: 1, tipo: 'portada', titulo: 'T' }]), version_contrato: '1.4' as const };
    expect(insertCanvasSlide(plan, comp).version_contrato).toBe('1.4');
  });

  it('no muta el plan original', () => {
    const plan = planConDiapos([{ n: 1, tipo: 'portada', titulo: 'T' }]);
    const antes = plan.diapositivas.length;
    insertCanvasSlide(plan, comp);
    expect(plan.diapositivas).toHaveLength(antes);
  });
});
