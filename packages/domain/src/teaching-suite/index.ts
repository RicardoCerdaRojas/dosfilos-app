/**
 * Teaching Suite — núcleo determinista (F0).
 * Contrato `plan` (tipos) + renderers puros (tipo → HTML) + validador.
 * Sin IA, sin I/O. Ver `docs/teaching-suite/PLAN.md`.
 */
export * from './TeachingPlan';
export * from './validatePlan';
// Superficie pública del render (sin filtrar internos como `I`/`escHtml`/`wrapSection`).
export { renderSlide, renderPortada, renderLista, renderEscritura, RENDERED_TYPES } from './render';
