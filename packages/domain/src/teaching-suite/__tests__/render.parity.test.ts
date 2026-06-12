import { describe, it, expect } from 'vitest';
import { renderSlide } from '../render';
import type { DiapoEscritura, DiapoLista, DiapoPortada, RenderContext } from '../TeachingPlan';

/**
 * Paridad de render: la salida de los renderers debe coincidir BYTE A BYTE con
 * el runtime de referencia. Los `GOLDEN_*` son las `<section>` extraídas
 * verbatim de `docs/suite_diseno_v5_fuente/demos/demo_v4_sebex_presentacion.html`
 * (generado por el sistema Python a partir de `ejemplos/plan_demo_v4_sebex.json`).
 * Si un renderer deja de ser fiel, este test lo caza.
 */

const GOLDEN_PORTADA = `<section class="diapo centro portada" data-bloque="Portada y panorama">
          <div class="kicker">Serie · Teología II</div>
          <h1 class="portada-titulo">La obra de<br>Cristo (I)</h1>
          <p class="sub portada-destacado">Los oficios y la expiación</p>
          <p class="sub portada-meta">Teología II · TE602 · Módulo II · Viernes 12 de junio</p>
        </section>`;

const GOLDEN_LISTA = `<section class="diapo" data-bloque="Portada y panorama">
          <div class="kicker">Panorama de la noche</div>
          <h2>Adónde vamos esta noche</h2>
          <ul class="lista">
            <li><b>El marco:</b> los tres oficios — profeta, sacerdote y rey</li>
            <li><b>Profeta y sacerdote</b> (B1) — luego <b>el Rey</b> (B2)</li>
            <li><b>El corazón:</b> la cruz — qué logró la muerte de Cristo (B3–B4)</li>
            <li>El arco: persona → obra → los tres oficios → la cruz</li>
          </ul>
          <p class="sub cierre-lista">Al final podrás: decir por qué son tres oficios, mostrarlos cumplidos en Cristo, nombrar qué se pierde al perder cada uno, y defender la cruz como sustitución penal.</p>
        </section>`;

const GOLDEN_ESCRITURA = `<section class="diapo centro" data-bloque="B1 · Oficio profético">
          <div class="secuencia" aria-label="Parte 1 de 3"><span class="sq act"><span class="sq-n">01</span>La promesa</span><span class="sq "><span class="sq-n">02</span>Lo que exige</span><span class="sq "><span class="sq-n">03</span>Cumplimiento</span></div>
          <p class="escritura larga">«Profeta de en medio de ti, de tus hermanos, como yo, te levantará Jehová tu Dios; a él oiréis. … Profeta les levantaré de en medio de sus hermanos, como tú; y pondré mis palabras en su boca, y él les hablará todo lo que yo le mandare.»
          <span class="ref">Deuteronomio 18:15, 18</span></p>
        </section>`;

describe('teaching-suite render parity (demo_v4_sebex)', () => {
  it('portada', () => {
    const d: DiapoPortada = {
      n: 1,
      tipo: 'portada',
      kicker: 'Serie · Teología II',
      titulo: 'La obra de<br>Cristo (I)',
      destacado: 'Los oficios y la expiación',
      meta: 'Teología II · TE602 · Módulo II · Viernes 12 de junio',
    };
    const ctx: RenderContext = { bloqueRotulo: 'Portada y panorama' };
    expect(renderSlide(d, ctx)).toBe(GOLDEN_PORTADA);
  });

  it('lista', () => {
    const d: DiapoLista = {
      n: 2,
      tipo: 'lista',
      kicker: 'Panorama de la noche',
      titulo: 'Adónde vamos esta noche',
      items: [
        '<b>El marco:</b> los tres oficios — profeta, sacerdote y rey',
        '<b>Profeta y sacerdote</b> (B1) — luego <b>el Rey</b> (B2)',
        '<b>El corazón:</b> la cruz — qué logró la muerte de Cristo (B3–B4)',
        'El arco: persona → obra → los tres oficios → la cruz',
      ],
      cierre:
        'Al final podrás: decir por qué son tres oficios, mostrarlos cumplidos en Cristo, nombrar qué se pierde al perder cada uno, y defender la cruz como sustitución penal.',
    };
    const ctx: RenderContext = { bloqueRotulo: 'Portada y panorama' };
    expect(renderSlide(d, ctx)).toBe(GOLDEN_LISTA);
  });

  it('escritura (centro + secuencia + texto largo)', () => {
    const d: DiapoEscritura = {
      n: 4,
      tipo: 'escritura',
      centro: true,
      secuencia: { etapas: ['La promesa', 'Lo que exige', 'Cumplimiento'], actual: 1 },
      ref: 'Deuteronomio 18:15, 18',
      texto:
        'Profeta de en medio de ti, de tus hermanos, como yo, te levantará Jehová tu Dios; a él oiréis. … Profeta les levantaré de en medio de sus hermanos, como tú; y pondré mis palabras en su boca, y él les hablará todo lo que yo le mandare.',
    };
    const ctx: RenderContext = { bloqueRotulo: 'B1 · Oficio profético' };
    expect(renderSlide(d, ctx)).toBe(GOLDEN_ESCRITURA);
  });

  it('vía de escape: html crudo reemplaza al renderer (salvo lienzo)', () => {
    const d = { n: 1, tipo: 'portada', html: '<section>raw</section>' } as DiapoPortada;
    expect(renderSlide(d, { bloqueRotulo: '' })).toBe('<section>raw</section>');
  });
});
