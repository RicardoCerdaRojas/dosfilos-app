import { describe, it, expect } from 'vitest';
import { canvasFormFingerprint, extractCanvasForms } from '../canvasForm';
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
