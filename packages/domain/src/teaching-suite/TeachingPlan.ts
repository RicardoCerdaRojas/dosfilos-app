/**
 * Teaching Suite — el contrato `plan` (v1.4) como tipos TypeScript.
 *
 * Réplica fiel de `docs/suite_diseno_v5_fuente/.../references/contrato-plan.md`.
 * El `plan` es la interfaz estable entre el trabajo editorial y el runtime
 * congelado (las 4 plantillas HTML). Es contenido puro: el render lo convierte
 * en HTML de forma determinista, sin IA.
 *
 * Estado: F0 (núcleo determinista). Los tipos de lámina `portada`, `lista` y
 * `escritura` están modelados de forma concreta (los 3 con renderer portado);
 * el resto se modela de forma permisiva (`DiapoOtra`) hasta que se porten sus
 * renderers. No inventar campos: el contrato es exhaustivo.
 */

export type Genero = 'exegesis' | 'doctrina' | 'consejeria';
export type Modalidad = 'clase' | 'sesion'; // solo consejería
export type Artefacto = 'presentacion' | 'notas' | 'hoja' | 'guia_sesion';
export type VersionContrato = '1' | '1.1' | '1.2' | '1.3' | '1.4';

export const TIPOS_LAMINA = [
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
export type TipoLamina = (typeof TIPOS_LAMINA)[number];

export interface Bloque {
  nombre: string;
  diapo_ini: number; // 1-based
  diapo_fin: number;
  min: number;
}

/** Riel de progreso para contar una idea en láminas hermanas (1-based, 2–6 etapas). */
export interface Secuencia {
  etapas: string[];
  actual: number;
}

/** Campos comunes a toda diapositiva. */
export interface DiapoBase {
  n: number; // correlativo 1..N
  tipo: TipoLamina;
  kicker?: string;
  rotulo?: string;
  variante?: string;
  secuencia?: Secuencia;
  /** Vía de escape: si está presente se inserta tal cual (EXCEPTO en `lienzo`). */
  html?: string;
}

export interface DiapoPortada extends DiapoBase {
  tipo: 'portada';
  titulo: string; // admite <br>
  destacado?: string;
  meta?: string;
}

export interface DiapoLista extends DiapoBase {
  tipo: 'lista';
  titulo: string;
  items: string[]; // máx. 4 (≤6 si variante dos-columnas); HTML inline permitido
  cierre?: string;
}

export interface DiapoEscritura extends DiapoBase {
  tipo: 'escritura';
  ref: string; // obligatoria (Regla de la Escritura)
  texto: string;
  version?: string;
  centro?: boolean;
  parte?: string;
}

/** Cualquier tipo aún no portado a su renderer concreto. Permisivo a propósito. */
export interface DiapoOtra extends DiapoBase {
  tipo: Exclude<TipoLamina, 'portada' | 'lista' | 'escritura'>;
  [key: string]: unknown;
}

export type Diapositiva = DiapoPortada | DiapoLista | DiapoEscritura | DiapoOtra;

export interface NotaResumen {
  diapo: number;
  rotulo: string;
  texto: string;
}

export interface TeachingPlan {
  // Cabecera
  id: string; // [a-z0-9_-]+, único ⇒ canal laiglesia_<id>
  titulo: string;
  serie?: string;
  genero: Genero;
  modalidad?: Modalidad; // invariante: sesion ⇒ sin presentacion/notas, con guia_sesion
  marca: string;
  edicion?: string;
  artefactos: Artefacto[];
  version_contrato: VersionContrato;
  textos?: Record<string, string>;
  // Cuerpo
  bloques: Bloque[]; // cubren 1..N sin huecos ni solapes
  diapositivas: Diapositiva[]; // n = 1..N sin huecos
  notas_resumen: NotaResumen[]; // 1:1 con diapositivas
  cuerpo_notas_html?: string; // anclas data-slide cubren 2..N
  cuerpo_hoja_html?: string;
  cuerpo_guia_html?: string;
}

/** Contexto que el inyector pasa a cada renderer (rótulo del bloque de la diapo). */
export interface RenderContext {
  bloqueRotulo: string;
}
