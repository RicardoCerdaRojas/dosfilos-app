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

import type { Objetivos } from '../estudio-madre/types';

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

export interface DiapoEscrituraAnotada extends DiapoBase {
  tipo: 'escritura-anotada';
  ref: string;
  texto: string;
  destacados: { palabra: string; nota: string }[]; // cada palabra debe existir en texto
}

export interface QuiasmoLinea {
  etq: string;
  nivel: number;
  texto: string;
  centro?: boolean;
}
export interface DiapoQuiasmo extends DiapoBase {
  tipo: 'quiasmo';
  lineas: QuiasmoLinea[];
  ref?: string;
  titulo?: string;
}

export type ClaseParalelismo = 'sinonimo' | 'antitetico' | 'sintetico';
export interface DiapoParalelismo extends DiapoBase {
  tipo: 'paralelismo';
  clase: ClaseParalelismo;
  pares: { a: string; b: string; relacion?: string }[];
  ref?: string;
  titulo?: string;
}

export type RolFlujo = 'principal' | 'fundamento' | 'proposito' | 'resultado' | 'contraste';
export interface FlujoNodo {
  id: string;
  rol: RolFlujo;
  texto: string;
  conecta: string | null;
  ref?: string;
  conector?: string;
}
export interface DiapoFlujo extends DiapoBase {
  tipo: 'flujo';
  nodos: FlujoNodo[];
  proposicion?: string;
  ref?: string;
  titulo?: string;
}

export interface DiapoTermino extends DiapoBase {
  tipo: 'termino';
  lema: string;
  glosa: string;
  translit?: string;
  idioma?: string; // 'hebreo' ⇒ dir="rtl"
  morfologia?: string;
  rango?: string[];
  usos?: { ref: string; matiz: string }[];
}

export interface DiapoEsquema extends DiapoBase {
  tipo: 'esquema';
  svg: string;
  alt: string;
  titulo?: string;
}

export interface DiapoConfrontacion extends DiapoBase {
  tipo: 'confrontacion';
  error: string;
  respuestas?: string[];
  respuesta?: string;
}

export interface DiapoSintesis extends DiapoBase {
  tipo: 'sintesis';
  texto: string;
  nota?: string;
}

export interface DiapoTransicion extends DiapoBase {
  tipo: 'transicion';
  texto: string;
  texto_escritura?: string;
  ref?: string;
}

export type TarjetaFila = string | { etq?: string; texto: string };
export interface Tarjeta {
  titulo: string;
  filas?: TarjetaFila[];
  realce?: string;
  nota?: string;
}
export interface DiapoTarjetas extends DiapoBase {
  tipo: 'tarjetas';
  tarjetas: Tarjeta[]; // 2–4
  titulo?: string;
  intro?: string;
}

export interface Paso {
  titulo: string;
  sub?: string;
  realce?: boolean;
}
export interface DiapoPasos extends DiapoBase {
  tipo: 'pasos';
  pasos: Paso[]; // 2–5
  titulo?: string;
  intro?: string;
  cierre?: string;
}

export interface DiapoLienzo extends DiapoBase {
  tipo: 'lienzo';
  html: string;
  alt: string;
  css?: string;
  titulo?: string;
}

export type Diapositiva =
  | DiapoPortada
  | DiapoLista
  | DiapoEscritura
  | DiapoEscrituraAnotada
  | DiapoQuiasmo
  | DiapoParalelismo
  | DiapoFlujo
  | DiapoTermino
  | DiapoEsquema
  | DiapoConfrontacion
  | DiapoSintesis
  | DiapoTransicion
  | DiapoTarjetas
  | DiapoPasos
  | DiapoLienzo;

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
  /**
   * Objetivos de aprendizaje {saber, sentir, hacer} (Gap 1). ADITIVO y opcional:
   * se DERIVAN del Estudio Madre (no los inventa el modelo); se copian al plan en
   * la generación. Cuando exista la transposición (Nivel 4), el perfil de
   * audiencia los calibrará. validatePlan NO los valida (opcional ⇒ sin regla).
   */
  objetivos?: Objetivos;
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
