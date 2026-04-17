/**
 * Binyan Wizard — Pure deductive logic for Binyan diagnosis.
 *
 * Implements the morphological elimination tree from Farfán Lección 8.
 * No React dependencies — pure data structures and functions.
 *
 * The tree models the "process of elimination" that a trained student
 * applies when identifying which of the 7 Binyanim a verb belongs to,
 * starting from the most marked (Hitpael) down to the default (Qal).
 */

import { Binyan } from '@dosfilos/domain';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Final result when the wizard reaches a leaf node. */
export interface BinyanResult {
  readonly binyan: Binyan;
  readonly label: string;
  readonly hebrewName: string;
  /** Pedagogical summary explaining why this Binyan was identified. */
  readonly summary: string;
}

/** A single node in the binary decision tree. */
export interface WizardNode {
  readonly id: string;
  /** Binary yes/no question the student must answer. */
  readonly question: string;
  /** What to look for in the verb form (visual observation guide). */
  readonly observationHint: string;
  /** Label for the "yes" answer button. */
  readonly yesLabel: string;
  /** Label for the "no" answer button. */
  readonly noLabel: string;
  /** Next step or final result when correct answer is "yes". */
  readonly yesBranch: WizardBranch;
  /** Next step or final result when correct answer is "no". */
  readonly noBranch: WizardBranch;
  /** Short label for the breadcrumb when student answers "yes" correctly. */
  readonly yesElimination: string;
  /** Short label for the breadcrumb when student answers "no" correctly. */
  readonly noElimination: string;
  /** Corrective feedback shown when student answers "yes" but should have said "no". */
  readonly wrongYesFeedback: string;
  /** Corrective feedback shown when student answers "no" but should have said "yes". */
  readonly wrongNoFeedback: string;
}

/** A branch in the tree: either the id of the next node or a final result. */
export type WizardBranch = string | BinyanResult;

/** A step the student has already completed correctly. */
export interface CompletedStep {
  readonly nodeId: string;
  readonly answer: 'yes' | 'no';
  /** Human-readable elimination phrase for the breadcrumb trail. */
  readonly elimination: string;
}

/** Type guard: returns true if a branch is a final BinyanResult. */
export function isBinyanResult(branch: WizardBranch): branch is BinyanResult {
  return typeof branch === 'object' && 'binyan' in branch;
}

// ── Binyan Results (leaf nodes) ───────────────────────────────────────────────

const RESULTS: Record<Binyan, BinyanResult> = {
  [Binyan.QAL]: {
    binyan: Binyan.QAL,
    label: 'Qal',
    hebrewName: 'קַל',
    summary:
      'El tema simple activo. No lleva ningún prefijo de Binyan, ' +
      'ni Dagesh en R2, ni Dagesh en R1. ' +
      'Es el "superviviente" cuando todos los demás marcadores quedan descartados.',
  },
  [Binyan.NIFAL]: {
    binyan: Binyan.NIFAL,
    label: 'Nifal',
    hebrewName: 'נִפְעַל',
    summary:
      'Pasivo o reflexivo del Qal. Se identifica por Dagesh Fuerte en R1 ' +
      '(en imperfecto, la Nun se asimiló) o prefijo נ explícito (en perfecto). ' +
      'Sin He causativa ni Dagesh en R2.',
  },
  [Binyan.PIEL]: {
    binyan: Binyan.PIEL,
    label: 'Piel',
    hebrewName: 'פִּעֵל',
    summary:
      'Intensivo activo. Su sello es el Dagesh Fuerte en R2 (duplicación). ' +
      'La vocal característica bajo R1 es Tsere (ē) en perfecto. ' +
      'Sin prefijo He de Binyan.',
  },
  [Binyan.PUAL]: {
    binyan: Binyan.PUAL,
    label: 'Pual',
    hebrewName: 'פֻּעַל',
    summary:
      'Intensivo pasivo. Dagesh Fuerte en R2 + vocal Quibbuts (u) bajo R1. ' +
      'Es la versión pasiva del Piel. ' +
      'Sin prefijo He de Binyan.',
  },
  [Binyan.HITPAEL]: {
    binyan: Binyan.HITPAEL,
    label: 'Hitpael',
    hebrewName: 'הִתְפַּעֵל',
    summary:
      'Reflexivo intensivo. El prefijo הִת directamente antes de la raíz es su ' +
      'marca inconfundible, además del Dagesh Fuerte en R2. ' +
      'En verbos I-צ el הִת puede aparecer transpuesto (metatesis: הִצְטַ).',
  },
  [Binyan.HIFIL]: {
    binyan: Binyan.HIFIL,
    label: 'Hifil',
    hebrewName: 'הִפְעִיל',
    summary:
      'Causativo activo. Prefijo He con Jireq (הִ) en perfecto; ' +
      'en imperfecto la vocal del preformativo suele ser Pataj (a). ' +
      'Hace que otro agente realice la acción del verbo.',
  },
  [Binyan.HOFAL]: {
    binyan: Binyan.HOFAL,
    label: 'Hofal',
    hebrewName: 'הָפְעַל',
    summary:
      'Causativo pasivo. Prefijo He con Qamets-Hatuf (הָ) o Quibbuts (הֻ). ' +
      'Es la versión pasiva del Hifil — el sujeto recibe la acción causada.',
  },
};

// ── Decision Tree ─────────────────────────────────────────────────────────────

/**
 * The binary decision tree implementing the Farfán Lección 8
 * morphological elimination process for Binyan identification.
 *
 * Order of elimination (most → least marked):
 *  1. Hitpael  — prefix הִת
 *  2. Hifil/Hofal — prefix He causativo → disambiguate by vowel
 *  3. Piel/Pual  — Dagesh Forte in R2 → disambiguate by R1 vowel
 *  4. Nifal      — Dagesh in R1 or Nun prefix
 *  5. Qal        — survivor (no markers)
 */
export const BINYAN_WIZARD_TREE: Record<string, WizardNode> = {
  'q-hitpael': {
    id: 'q-hitpael',
    question: '¿Ves el prefijo הִת directamente antes de la raíz?',
    observationHint:
      'Busca si hay una Het (ה) + Tav (ת) fusionadas como prefijo de Binyan, ' +
      'justo antes de los radicales. No lo confundas con el preformativo de persona (י/ת/א/נ).',
    yesLabel: 'Sí, veo הִת',
    noLabel: 'No, no está',
    yesBranch: RESULTS[Binyan.HITPAEL],
    noBranch: 'q-he-causativo',
    yesElimination: 'Prefijo הִת presente → Hitpael identificado',
    noElimination: 'Sin prefijo הִת → Hitpael descartado',
    wrongYesFeedback:
      'No hay prefijo הִת en este verbo. En Hitpael, הִת siempre aparece ' +
      'antes de R1, incluso en imperfecto. Si no lo ves con claridad, probablemente no está.',
    wrongNoFeedback:
      '¡Sí hay un prefijo הִת! Búscalo justo antes del primer radical de la raíz. ' +
      'En verbos I-צ puede aparecer transpuesto (metatesis), pero sigue siendo visible.',
  },

  'q-he-causativo': {
    id: 'q-he-causativo',
    question:
      '¿Hay una הִ o הָ como prefijo propio de Binyan, distinto del preformativo de persona?',
    observationHint:
      'El preformativo de persona (י/ת/א/נ) ya lo identificaste en Fase 3. ' +
      '¿Queda alguna ה adicional pegada antes de la raíz, que no sea ese preformativo?',
    yesLabel: 'Sí, hay He de Binyan',
    noLabel: 'No, no hay He extra',
    yesBranch: 'q-hifil-hofal',
    noBranch: 'q-dagesh-r2',
    yesElimination: 'He de Binyan presente → distinguiendo Hifil vs Hofal',
    noElimination: 'Sin He de Binyan → Hifil y Hofal descartados',
    wrongYesFeedback:
      'No hay He de Binyan. Recuerda: el preformativo de persona (י, ת, א, נ) ' +
      'no es el prefijo de Binyan. Hifil y Hofal necesitan una He ADICIONAL a ese preformativo.',
    wrongNoFeedback:
      '¡Sí hay una He de Binyan! En Hifil lleva Jireq (הִ) y en Hofal ' +
      'lleva Qamets-Hatuf o Quibbuts (הָ/הֻ). Obsérvala junto al preformativo de persona.',
  },

  'q-hifil-hofal': {
    id: 'q-hifil-hofal',
    question:
      '¿La He de Binyan lleva Jireq (i) o Pataj (a) — señal de voz activa?',
    observationHint:
      'Mira la vocal exacta debajo de esa He de Binyan. ' +
      'Jireq = puntito pequeño debajo = sonido "i". ' +
      'Qamets-Hatuf/Quibbuts = sonido "o/u" = voz pasiva (Hofal).',
    yesLabel: 'Sí, es Jireq/Pataj (activo)',
    noLabel: 'No, es Qamets-Hatuf/Quibbuts (pasivo)',
    yesBranch: RESULTS[Binyan.HIFIL],
    noBranch: RESULTS[Binyan.HOFAL],
    yesElimination: 'Vocal activa bajo He → Hifil identificado',
    noElimination: 'Vocal pasiva bajo He → Hofal identificado',
    wrongYesFeedback:
      'La vocal de la He no es activa. Qamets-Hatuf o Quibbuts (sonido "o/u") ' +
      'señalan Hofal (causativo pasivo), no Hifil.',
    wrongNoFeedback:
      'La vocal de la He sí es activa. Jireq (puntito debajo) o Pataj ' +
      '(rayita horizontal) señalan Hifil (causativo activo).',
  },

  'q-dagesh-r2': {
    id: 'q-dagesh-r2',
    question:
      '¿Tiene la segunda radical (R2) un Dagesh Fuerte (puntito duplicador) adentro?',
    observationHint:
      'Identifica la segunda letra de la raíz (R2). ¿Hay un punto dentro de ella? ' +
      'Ese sería Dagesh Fuerte — el marcador definitorio de los Binyanim intensivos (Piel y Pual). ' +
      'No confundas con Dagesh Lene (aparece solo en BeGaDKeFaT al inicio de sílaba).',
    yesLabel: 'Sí, R2 tiene Dagesh Fuerte',
    noLabel: 'No, R2 no tiene Dagesh',
    yesBranch: 'q-piel-pual',
    noBranch: 'q-nifal',
    yesElimination: 'Dagesh Fuerte en R2 → distinguiendo Piel vs Pual',
    noElimination: 'Sin Dagesh en R2 → Piel y Pual descartados',
    wrongYesFeedback:
      'La R2 no tiene Dagesh Fuerte. Recuerda: el Dagesh Fuerte duplica la consonante. ' +
      'El Dagesh Lene (en BeGaDKeFaT al inicio de sílaba) no cuenta aquí.',
    wrongNoFeedback:
      '¡Sí hay Dagesh Fuerte en R2! Ese puntito dentro de la segunda radical es el sello ' +
      'de los Binyanim intensivos. Está adentro de la consonante, no debajo.',
  },

  'q-piel-pual': {
    id: 'q-piel-pual',
    question:
      '¿La vocal bajo R1 es Quibbuts (tres puntos diagonales / sonido "u") — señal de pasivo?',
    observationHint:
      'En Pual la vocal característica bajo R1 es Quibbuts (tres puntos en diagonal = sonido "u"). ' +
      'En Piel la vocal es Tsere (dos puntos horizontales = "e") o Pataj/Qamets (sonido "a").',
    yesLabel: 'Sí, es Quibbuts (u) — pasivo',
    noLabel: 'No, es Tsere/Pataj — activo',
    yesBranch: RESULTS[Binyan.PUAL],
    noBranch: RESULTS[Binyan.PIEL],
    yesElimination: 'Quibbuts bajo R1 → Pual identificado',
    noElimination: 'Vocal activa bajo R1 → Piel identificado',
    wrongYesFeedback:
      'La vocal no es Quibbuts. Pual siempre lleva sonido "u" bajo R1. ' +
      'Si la vocal es Tsere ("e") o Pataj/Qamets ("a"), estamos ante Piel activo.',
    wrongNoFeedback:
      'La vocal sí es Quibbuts (tres puntos diagonales = sonido "u"). ' +
      'Ese es el marcador del Pual (intensivo pasivo). Piel lleva Tsere u otra vocal.',
  },

  'q-nifal': {
    id: 'q-nifal',
    question:
      '¿Hay Dagesh Fuerte en R1, o ves un prefijo נ al inicio en formas de perfecto?',
    observationHint:
      'Nifal en imperfecto asimila la Nun (נ) dejando Dagesh Fuerte en R1. ' +
      'En perfecto, la Nun aparece explícita como prefijo (נִ). ' +
      '¿Ves alguna de estas dos señales?',
    yesLabel: 'Sí, hay Dagesh en R1 o Nun visible',
    noLabel: 'No, ninguna de las dos señales',
    yesBranch: RESULTS[Binyan.NIFAL],
    noBranch: RESULTS[Binyan.QAL],
    yesElimination: 'Dagesh en R1 o Nun visible → Nifal identificado',
    noElimination: 'Sin marcadores de Nifal → Qal (superviviente por eliminación)',
    wrongYesFeedback:
      'No hay Dagesh en R1 ni Nun visible. Nifal siempre deja uno de estos rastros. ' +
      'Sin ellos, Nifal queda descartado y llegamos al Qal por eliminación total.',
    wrongNoFeedback:
      '¡Sí hay Dagesh en R1 o Nun visible! Ese es el "rastro" que deja Nifal ' +
      'al asimilar su prefijo Nun. Es el marcador definitorio de este Binyan.',
  },
};

/** The id of the first node in the wizard tree. */
export const WIZARD_START_NODE = 'q-hitpael';

// ── Evaluation ────────────────────────────────────────────────────────────────

/**
 * Returns the morphologically correct binary answer for a given wizard node,
 * given the actual Binyan of the word being analyzed.
 *
 * This drives the validation logic: the wizard knows the answer,
 * and checks whether the student's choice matches.
 */
export function getExpectedAnswer(nodeId: string, binyan: Binyan): 'yes' | 'no' {
  switch (nodeId) {
    case 'q-hitpael':
      return binyan === Binyan.HITPAEL ? 'yes' : 'no';
    case 'q-he-causativo':
      return binyan === Binyan.HIFIL || binyan === Binyan.HOFAL ? 'yes' : 'no';
    case 'q-hifil-hofal':
      return binyan === Binyan.HIFIL ? 'yes' : 'no';
    case 'q-dagesh-r2':
      return binyan === Binyan.PIEL || binyan === Binyan.PUAL ? 'yes' : 'no';
    case 'q-piel-pual':
      return binyan === Binyan.PUAL ? 'yes' : 'no';
    case 'q-nifal':
      return binyan === Binyan.NIFAL ? 'yes' : 'no';
    default:
      return 'no';
  }
}
