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

  // ══════════════════════════════════════════════════════════════════════════
  // NOMINAL HINTS — Progressive Disclosure (levels 1-3)
  //
  // Design principle: NO hint at any level should give the answer directly.
  //  Level 1 → Open-ended observational question (forces the student to look)
  //  Level 2 → Morphological clue pointing at a region of the word
  //  Level 3 → Remedial: shown only AFTER an incorrect answer
  // ══════════════════════════════════════════════════════════════════════════

  // ── Phase 30: NOMINAL_CLASSIFY ────────────────────────────────────────────

  // Level 1: Guide observation — does the word show verbal or nominal features?
  {
    id: 'local_nominal_classify_observe',
    phase: 30,
    severity: 'info',
    title: 'Observa la forma',
    body: '¿Ves algún **preformativo verbal** (י, ת, א, נ) antes de la raíz? ¿La palabra parece expresar una _acción_ o nombrar una _entidad_? Busca marcas morfológicas que revelen su función.',
    conditions: [HintConditionKey.ALWAYS],
    excludeConditions: [],
    enabled: true,
    order: 1,
    level: 1,
  },

  // Level 2: Deeper morphological guidance — for nouns
  {
    id: 'local_nominal_classify_morph_noun',
    phase: 30,
    severity: 'tip',
    title: 'Sin marcas verbales',
    body: 'No hay preformativo, ni vocales temáticas de conjugación, ni aformativo de persona. Las consonantes radicales forman un **patrón nominal**. ¿Qué tipo de palabra nombra algo sin expresar acción?',
    conditions: [HintConditionKey.IS_NOUN],
    excludeConditions: [],
    enabled: true,
    order: 2,
    level: 2,
  },

  // Level 2: Deeper morphological guidance — for adjectives
  {
    id: 'local_nominal_classify_morph_adj',
    phase: 30,
    severity: 'tip',
    title: 'Patrón similar a un sustantivo',
    body: 'Esta palabra comparte forma con los sustantivos pero funciona como _modificador_ en la cláusula. Observa su relación con la palabra adyacente: ¿la describe o la califica?',
    conditions: [HintConditionKey.IS_ADJECTIVE],
    excludeConditions: [],
    enabled: true,
    order: 2,
    level: 2,
  },

  // Level 2: Deeper morphological guidance — for pronouns
  {
    id: 'local_nominal_classify_morph_pron',
    phase: 30,
    severity: 'tip',
    title: 'Forma independiente corta',
    body: 'Fíjate si esta es una forma independiente reconocible (como הוּא, אֲנִי, הֵם). Los pronombres personales tienen formas fijas que **no derivan** de una raíz trilítera verbal.',
    conditions: [HintConditionKey.IS_PRONOUN],
    excludeConditions: [],
    enabled: true,
    order: 2,
    level: 2,
  },

  // Level 2: Deeper morphological guidance — for particles
  {
    id: 'local_nominal_classify_morph_part',
    phase: 30,
    severity: 'tip',
    title: 'Palabra funcional',
    body: 'Esta palabra es muy corta y no tiene raíz trilítera reconocible. Las palabras funcionales (preposiciones, conjunciones, partículas) conectan o relacionan otras palabras sin variar en género ni número.',
    conditions: [HintConditionKey.IS_PARTICLE],
    excludeConditions: [],
    enabled: true,
    order: 2,
    level: 2,
  },

  // ── Phase 31: NOMINAL_ARTICLE ─────────────────────────────────────────────

  {
    id: 'local_nominal_article_observe',
    phase: 31,
    severity: 'info',
    title: 'Observa el inicio',
    body: 'Busca al inicio de la palabra el patrón **הַ** (he + pataj) seguido de dagesh forte en la siguiente consonante. ¿Lo ves?',
    conditions: [HintConditionKey.ALWAYS],
    excludeConditions: [],
    enabled: true,
    order: 1,
    level: 1,
  },

  {
    id: 'local_nominal_article_gutural',
    phase: 31,
    severity: 'tip',
    title: 'Ante guturales',
    body: 'Ante consonantes guturales (א, ה, ח, ע, ר), el dagesh forte **no aparece** y la vocal del artículo puede cambiar a qamets (הָ) o segol (הֶ). No te dejes engañar por la ausencia del dagesh.',
    conditions: [HintConditionKey.ALWAYS],
    excludeConditions: [],
    enabled: true,
    order: 2,
    level: 2,
  },

  // ── Phase 32: NOMINAL_GENDER ──────────────────────────────────────────────

  {
    id: 'local_nominal_gender_observe',
    phase: 32,
    severity: 'info',
    title: 'Examina la terminación',
    body: 'Para determinar el género, busca la **marca morfológica femenina**: una **ה con qamets** (הָ) final, o una **ת** (tav) final. ¡Cuidado! No toda ה al final indica femenino — muchos nombres propios y otras palabras terminan en ה sin que sea una marca de género.',
    conditions: [HintConditionKey.ALWAYS],
    excludeConditions: [],
    enabled: true,
    order: 1,
    level: 1,
  },

  {
    id: 'local_nominal_gender_fem_clue',
    phase: 32,
    severity: 'tip',
    title: 'Marcas femeninas',
    body: 'Las terminaciones **ה ָ** y **ת** son las marcas más comunes del femenino en hebreo. Si ves una de estas, es una señal fuerte.',
    conditions: [HintConditionKey.IS_FEMININE],
    excludeConditions: [],
    enabled: true,
    order: 2,
    level: 2,
  },

  {
    id: 'local_nominal_gender_masc_clue',
    phase: 32,
    severity: 'tip',
    title: 'Forma no marcada',
    body: 'En hebreo, el masculino es la **forma no marcada**: si no ves terminación femenina (ה ָ, ת), es probable que sea masculino. Pero atención: existen excepciones.',
    conditions: [HintConditionKey.IS_MASCULINE],
    excludeConditions: [],
    enabled: true,
    order: 2,
    level: 2,
  },

  // ── Phase 33: NOMINAL_NUMBER ──────────────────────────────────────────────

  {
    id: 'local_nominal_number_observe',
    phase: 33,
    severity: 'info',
    title: 'Observa la terminación',
    body: '¿Ves **ים** (yod-mem) o **וֹת** (waw-tav) al final? ¿O quizás **ַיִם** (pataj-yod-mem)? Estas terminaciones son clave para el número.',
    conditions: [HintConditionKey.ALWAYS],
    excludeConditions: [],
    enabled: true,
    order: 1,
    level: 1,
  },

  {
    id: 'local_nominal_number_plural_clue',
    phase: 33,
    severity: 'tip',
    title: 'Terminaciones plurales',
    body: 'La terminación **ים** indica plural masculino y **וֹת** indica plural femenino. Aunque existen excepciones (como אָבוֹת, plural femenino de un sustantivo masculino).',
    conditions: [HintConditionKey.IS_PLURAL],
    excludeConditions: [],
    enabled: true,
    order: 2,
    level: 2,
  },

  {
    id: 'local_nominal_number_dual_clue',
    phase: 33,
    severity: 'tip',
    title: 'Terminación dual',
    body: 'La terminación **ַיִם** (con pataj) es la marca del dual: indica cosas que vienen en pares naturales (manos, ojos, pies).',
    conditions: [HintConditionKey.IS_DUAL],
    excludeConditions: [],
    enabled: true,
    order: 2,
    level: 2,
  },

  // ── Phase 34: NOMINAL_STATE ───────────────────────────────────────────────

  {
    id: 'local_nominal_state_observe',
    phase: 34,
    severity: 'info',
    title: 'Relación con la siguiente palabra',
    body: '¿Esta palabra está unida a la siguiente por un maqaf (guion)? ¿Notas alguna **reducción vocálica** comparada con la forma de diccionario? Esto es clave para determinar su estado.',
    conditions: [HintConditionKey.ALWAYS],
    excludeConditions: [],
    enabled: true,
    order: 1,
    level: 1,
  },

  {
    id: 'local_nominal_state_construct_clue',
    phase: 34,
    severity: 'tip',
    title: 'Señales del constructo',
    body: 'En estado constructo, las vocales largas se acortan y las terminaciones cambian: **ים → י**, **וֹת → וֹת**. La palabra "pierde peso" porque está ligada a la siguiente.',
    conditions: [HintConditionKey.IS_CONSTRUCT],
    excludeConditions: [],
    enabled: true,
    order: 2,
    level: 2,
  },

  {
    id: 'local_nominal_state_absolute_clue',
    phase: 34,
    severity: 'tip',
    title: 'Forma independiente',
    body: 'El estado absoluto es la forma independiente — la que encuentras en el diccionario, sin reducciones vocálicas ni dependencia de otra palabra.',
    conditions: [],
    excludeConditions: [HintConditionKey.IS_CONSTRUCT],
    enabled: true,
    order: 2,
    level: 2,
  },

  // ── Phase 36: NOMINAL_SUFFIX ──────────────────────────────────────────────

  {
    id: 'local_nominal_suffix_observe',
    phase: 36,
    severity: 'info',
    title: 'Busca el sufijo',
    body: '¿Ves letras adicionales al final de la palabra, después de la raíz y sus terminaciones de género/número? Los sufijos pronominales indican posesión.',
    conditions: [HintConditionKey.HAS_PRONOMINAL_SUFFIX],
    excludeConditions: [],
    enabled: true,
    order: 1,
    level: 1,
  },

  {
    id: 'local_nominal_suffix_clue',
    phase: 36,
    severity: 'tip',
    title: 'Sufijos comunes',
    body: 'Algunos sufijos frecuentes: **יִ** = 1cs ("mi"), **ךָ** = 2ms ("tu"), **וֹ** = 3ms ("su"), **ם** / **הֶם** = 3mp ("su" de ellos). Observa la terminación e identifica la persona.',
    conditions: [HintConditionKey.HAS_PRONOMINAL_SUFFIX],
    excludeConditions: [],
    enabled: true,
    order: 2,
    level: 2,
  },

];

