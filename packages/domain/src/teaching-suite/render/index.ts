import type { Diapositiva, RenderContext } from '../TeachingPlan';
import { renderPortada } from './portada';
import { renderLista } from './lista';
import { renderEscritura } from './escritura';
import { renderConfrontacion, renderEsquema, renderSintesis, renderTransicion } from './basicos';
import {
  renderEscrituraAnotada,
  renderFlujo,
  renderParalelismo,
  renderQuiasmo,
  renderTermino,
} from './componentesExegeticos';
import { renderLienzo, renderPasos, renderTarjetas } from './componentesGraficos';

export { I, escHtml, wrapSection } from './sec';
export { renderPortada } from './portada';
export { renderLista } from './lista';
export { renderEscritura } from './escritura';
export { renderConfrontacion, renderEsquema, renderSintesis, renderTransicion } from './basicos';
export {
  renderEscrituraAnotada,
  renderFlujo,
  renderParalelismo,
  renderQuiasmo,
  renderTermino,
} from './componentesExegeticos';
export { renderLienzo, renderPasos, renderTarjetas } from './componentesGraficos';

/** Todos los tipos de lámina tienen renderer portado. */
export const RENDERED_TYPES = [
  'portada',
  'lista',
  'escritura',
  'escritura-anotada',
  'quiasmo',
  'paralelismo',
  'flujo',
  'termino',
  'esquema',
  'confrontacion',
  'sintesis',
  'transicion',
  'tarjetas',
  'pasos',
  'lienzo',
] as const;

/**
 * Réplica fiel de `renderizar(d, ctx)`.
 * Vía de escape / legado: `html` crudo reemplaza al renderer, EXCEPTO en
 * `lienzo` (donde `html` es dato del componente y lo envuelve el renderer).
 */
export function renderSlide(d: Diapositiva, ctx: RenderContext): string {
  if (d.html && d.tipo !== 'lienzo') return d.html;
  switch (d.tipo) {
    case 'portada':
      return renderPortada(d, ctx);
    case 'lista':
      return renderLista(d, ctx);
    case 'escritura':
      return renderEscritura(d, ctx);
    case 'escritura-anotada':
      return renderEscrituraAnotada(d, ctx);
    case 'quiasmo':
      return renderQuiasmo(d, ctx);
    case 'paralelismo':
      return renderParalelismo(d, ctx);
    case 'flujo':
      return renderFlujo(d, ctx);
    case 'termino':
      return renderTermino(d, ctx);
    case 'esquema':
      return renderEsquema(d, ctx);
    case 'confrontacion':
      return renderConfrontacion(d, ctx);
    case 'sintesis':
      return renderSintesis(d, ctx);
    case 'transicion':
      return renderTransicion(d, ctx);
    case 'tarjetas':
      return renderTarjetas(d, ctx);
    case 'pasos':
      return renderPasos(d, ctx);
    case 'lienzo':
      return renderLienzo(d, ctx);
    default: {
      const exhaustive: never = d;
      throw new Error(`[teaching-suite] tipo de lámina desconocido: ${JSON.stringify(exhaustive)}`);
    }
  }
}
