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

  // ── Phase 5: BINYAN (strong path) ────────────────────────────────────────

  {
    id: 'local_binyan_elimination',
    phase: 5,
    severity: 'tip',
    title: 'Árbol de eliminación (Lec. 1-7)',
    body: `Aplica el árbol de Farfán en orden:
1. ¿Ves el prefijo הִתְ? → **Hitpael**
2. ¿Hay He (הִ/הֻ) antes de la raíz? → **Hifil** (activo) o **Hofal** (pasivo)
3. ¿Hay Dagesh Forte en R2? → **Piel** (activo) o **Pual** (pasivo)
4. ¿Hay Nun (נִ) como prefijo? → **Nifal**
5. Por eliminación → **Qal**`,
    conditions: [],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

  {
    id: 'local_binyan_dagesh_piel',
    phase: 5,
    severity: 'tip',
    title: 'Dagesh Forte → Piel/Pual',
    body: 'El Dagesh Forte en el **segundo radical** (R2) es la marca más clara del Piel (activo) y del Pual (pasivo). Si la vocal temática es pataj, suele ser Pual; si es tsere, suele ser Piel.',
    conditions: [HintConditionKey.HAS_DAGESH_FORTE, HintConditionKey.IS_PIEL],
    excludeConditions: [],
    enabled: true,
    order: 2,
  },

  // ── Phase 6: STRONG_CONFIRM (strong path) ────────────────────────────────

  {
    id: 'local_strong_confirm_guttural',
    phase: 6,
    severity: 'tip',
    title: 'Raíces guturales — siguen siendo fuertes',
    body: 'Las guturales (א ה ח ע ר) no eliminan radicales, por eso el TRIAGE las clasificó como **fuertes**. Lo que hacen es alterar las vocales adyacentes: rechazan dagesh, prefieren Clase-A (pataj), y toman shevá compuesto (hatef) en vez de shevá simple.',
    conditions: [HintConditionKey.IS_GUTURAL],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

  {
    id: 'local_strong_confirm_generic',
    phase: 6,
    severity: 'info',
    title: 'Clasificación final',
    body: 'Si las 3 radicales están intactas y ninguna es gutural, tienes un **verbo fuerte puro** — el paradigma de referencia para todos los demás. Si hay gutural, identifica en qué posición (R1, R2 o R3) para saber qué reglas compensatorias aplican.',
    conditions: [],
    excludeConditions: [HintConditionKey.IS_GUTURAL],
    enabled: true,
    order: 1,
  },

  // ── Phase 12: WEAK_BINYAN (weak path) ────────────────────────────────────

  {
    id: 'local_weak_binyan_tip',
    phase: 12,
    severity: 'tip',
    title: 'Binyan en verbos débiles',
    body: 'En raíces débiles, las marcas del binyan pueden estar alteradas: el Dagesh Forte puede faltar (por gutural o I-Nun asimilada), y las vocales temáticas pueden variar. Usa las claves morfológicas que sobrevivieron para identificar el binyan.',
    conditions: [],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

  {
    id: 'local_weak_binyan_iii_he',
    phase: 12,
    severity: 'info',
    title: 'III-He: coda vocálica',
    body: 'En raíces III-He, el tercer radical (ה) desaparece y es reemplazado por una vocal larga. Busca la terminación vocálica en vez de una consonante final.',
    conditions: [HintConditionKey.IS_III_HE],
    excludeConditions: [],
    enabled: true,
    order: 2,
  },

  // ── Phase 20: TRANSLATION (both paths) ───────────────────────────────────

  {
    id: 'local_translation_synthesis',
    phase: 20,
    severity: 'tip',
    title: 'Síntesis: Raíz + Binyan + PGN',
    body: 'Reconstruye el significado en 3 pasos: (1) significado base de la **raíz**, (2) matiz semántico del **binyan** (Piel = intensivo, Hifil = causativo…), (3) ajusta por **persona-género-número** y el contexto narrativo del versículo.',
    conditions: [],
    excludeConditions: [],
    enabled: true,
    order: 1,
  },

];

