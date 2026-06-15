/**
 * Estudio Madre — upstream del markdown que alimenta la suite de artefactos.
 * Schema del sobre (aditivo en `extractions/{id}`) + serialización determinista.
 * La capa de fidelidad (`validarEstudioMadre`) reusa el motor de tres testigos.
 * Ver `docs/spec-asistentes-preparacion-estudio-v1.3.md`.
 */
export * from './types';
export * from './serializarEstudio';
export * from './fidelidad';
export * from './derivarObjetivos';
export * from './conduccionCorazon';
