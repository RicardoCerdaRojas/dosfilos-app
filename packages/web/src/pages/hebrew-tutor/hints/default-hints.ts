/**
 * default-hints.ts
 *
 * Local fallback catalog. Used when Firestore is unavailable or when
 * running offline. Hints defined here are merged with remote hints;
 * remote entries with the same base ID (without 'local_' prefix) take precedence.
 *
 * IDs use the `local_` prefix to distinguish them from Firestore-managed hints.
 *
 * Convention for phase IDs (DetectivePhase enum numeric values):
 *   OBSERVE       = 1
 *   TRIAGE        = 2
 *   COLORS        = 3
 *   DAGESH        = 4
 *   BINYAN        = 5
 *   STRONG_CONFIRM= 6
 *   PREFORMATIVE  = 10
 *   WEAK_ROOT     = 11
 *   WEAK_BINYAN   = 12
 *   TRANSLATION   = 20
 */

import type { HintDefinition } from '@dosfilos/domain';
import { HintConditionKey } from '@dosfilos/domain';

export const DEFAULT_HINTS: HintDefinition[] = [

  // ── Phase 1: OBSERVE (1) ────────────────────────────────────────────────

  {
    id: 'local_observe_preformative',
    phase: 1,
    severity: 'info',
    title: 'Pista',
    body: 'Observa el preformativo verbal — una letra pequeña (י, ת, א o נ) que aparece **justo antes de la raíz** e indica persona, género y número. Junto con las vocales temáticas (ámbar), eso señala un verbo.',
    conditions: [HintConditionKey.HAS_PREFORMATIVE],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

  {
    id: 'local_observe_generic',
    phase: 1,
    severity: 'info',
    title: 'Pista',
    body: 'Busca claves morfológicas que revelen la función de esta palabra: vocales temáticas, prefijos de preposición, o una raíz reconocible.',
    conditions: [],
    excludeConditions: [HintConditionKey.HAS_PREFORMATIVE],
    enabled: true,
    order: 1,
  },

  {
    id: 'local_observe_waw_warning',
    phase: 1,
    severity: 'warning',
    title: 'Atención',
    body: 'La Waw Consecutiva (וַ) o Conjuntiva (וְ) que aparece al inicio es un _prefijo de conjunción_, no el preformativo verbal. No te guíes solo por ver una letra azul al comienzo.',
    conditions: [HintConditionKey.HAS_WAW_PREFIX],
    excludeConditions: [],
    enabled: true,
    order: 2,
  },

  // ── Phase 2: TRIAGE (2) ─────────────────────────────────────────────────

  {
    id: 'local_triage_wayyiqtol',
    phase: 2,
    severity: 'tip',
    title: 'Clave del Wayyiqtol',
    body: 'Recuerda: el Wayyiqtol (וַיִּ…) tiene una Waw con pataj + dagesh fuerte en el preformativo. Esa Waw no lo hace un verbo débil: siendo fuerte el paradigma base, se clasifica como verbo **fuerte**.',
    conditions: [HintConditionKey.IS_WAYYIQTOL],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

  {
    id: 'local_triage_inf_construct',
    phase: 2,
    severity: 'info',
    title: 'Infinitivo Constructo',
    body: 'El infinitivo constructo no tiene preformativo verbal. Identifica la raíz mirando las consonantes internas (sin prefijo de preposición בְּ / לְ) y luego evalúa si la raíz exhibe debilidad.',
    conditions: [HintConditionKey.IS_INF_CONSTRUCT],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

  {
    id: 'local_triage_gutural',
    phase: 2,
    severity: 'tip',
    title: 'Raíz Gutural',
    body: 'Las guturales (א, ה, ח, ע, ר) afectan vocales adyacentes pero **no** hacen al verbo débil en el sentido técnico de Farfán. En el TRIAGE, un verbo gutural se clasifica como **fuerte**.',
    conditions: [HintConditionKey.IS_GUTURAL],
    excludeConditions: [],
    enabled: true,
    order: 2,
  },

  // ── Phase 3: COLORS (3) ─────────────────────────────────────────────────

  {
    id: 'local_colors_preposition',
    phase: 3,
    severity: 'info',
    title: 'Prefijo de preposición',
    body: 'La letra inicial en azul claro puede ser un **prefijo de preposición** (בְּ, לְ, כְּ, מִ), no parte de la raíz verbal. Identifícala y sepárala antes de analizar los colores del verbo.',
    conditions: [HintConditionKey.HAS_PREPOSITION_PFX],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

  // ── Phase 4: DAGESH (4) ─────────────────────────────────────────────────

  {
    id: 'local_dagesh_tip_piel',
    phase: 4,
    severity: 'tip',
    title: 'Dagesh Forte en R2',
    body: 'El Dagesh Forte en el **segundo radical** es la marca distintiva del Piel y del Pual. Su presencia intensifica o factitiva el significado básico del verbo.',
    conditions: [HintConditionKey.HAS_DAGESH_FORTE, HintConditionKey.IS_PIEL],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

  // ── Phase 10: PREFORMATIVE (weak path) ──────────────────────────────────

  {
    id: 'local_preformative_iii_he',
    phase: 10,
    severity: 'tip',
    title: 'Raíz III-He',
    body: 'En las raíces III-He, el preformativo en el Imperfecto Qal lleva _tsere_ (יִ vs. יִ) y la vocal temática final aparece contraída. Eso es la clave de este grupo.',
    conditions: [HintConditionKey.IS_III_HE],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

  {
    id: 'local_preformative_i_yod',
    phase: 10,
    severity: 'tip',
    title: 'Raíz I-Yod/Waw',
    body: 'En las raíces I-Yod, el primer radical (י) se asimila o elide ante el preformativo. Observa si falta una consonante al inicio de la raíz.',
    conditions: [HintConditionKey.IS_I_YOD_WAW],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

  // ── Phase 11: WEAK_ROOT (weak path) ─────────────────────────────────────

  {
    id: 'local_weakroot_geminate',
    phase: 11,
    severity: 'info',
    title: 'Raíz Geminada',
    body: 'Las raíces geminadas (R2 = R3) contraen los dos últimas radicales. Busca el Dagesh Forte en la última consonante visible: es la indicación de la geminación.',
    conditions: [HintConditionKey.IS_GEMINATE],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

];
