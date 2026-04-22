/**
 * DetectivePhase2Colors
 *
 * Phase 2: "Tirar los colores" — Student identifies the morphological
 * color sequence present in the verb following the Farfán color-coding
 * system documented in 1_codigo-colores.md.
 *
 * Color roles:
 *  🔵 Azul      → PREFIX_STEM / PREFORMATIVE
 *  ⚫ Gris       → ROOT_R1, ROOT_R2, ROOT_R3
 *  🟡 Ámbar     → THEME_VOWEL
 *  🔴 Rojo      → DAGESH_FORTE
 *  🟣 Violeta   → AFFORMATIVE / PRONOMINAL_SUFFIX
 */

import React, { useState } from 'react';
import type { WordAnalysis, MorphemeSegment } from '@dosfilos/domain';
import { MorphemeRole } from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';
import { MorphemeSpan } from '../MorphemeSpan';
import { DetectiveHeroCard } from './DetectiveHeroCard';

interface DetectivePhase2ColorsProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

interface ColorOption {
  id: string;
  label: string;
  hex: string;
  description: string;
  checkFn: (morphemes: readonly MorphemeSegment[]) => boolean;
}


// ── Helper: is this morpheme a prefixed particle (not a verbal morpheme)? ──
const PARTICLE_PREFIX_ROLES = new Set([
  MorphemeRole.PREPOSITION_PREFIX,
  MorphemeRole.CONJUNCTION_PREFIX,
  MorphemeRole.WAW_CONJUNCTIVE,
  MorphemeRole.WAW_CONSECUTIVE,
]);

const VERBAL_PREFIX_ROLES = new Set([
  MorphemeRole.PREFIX_STEM,
  MorphemeRole.PREFORMATIVE,
]);

const ROOT_ROLES = new Set([
  MorphemeRole.ROOT_R1,
  MorphemeRole.ROOT_R2,
  MorphemeRole.ROOT_R3,
]);

// ── Unicode-aware vowel detection helpers ─────────────────────────────────────

/** Hebrew combining marks that are true vowel indicators (not dagesh/meteg) */
const HEBREW_VOWEL_POINTS = new Set([
  0x05B0, 0x05B1, 0x05B2, 0x05B3, // Sheva family
  0x05B4, 0x05B5, 0x05B6,         // E/I class
  0x05B7, 0x05B8,                  // A class
  0x05B9, 0x05BA, 0x05BB,         // O/U class (holam, holam haser, qubuts)
]);

/** Returns true if any code point in the range is a Hebrew combining mark. */
function isHebrewCombining(cp: number): boolean {
  return (cp >= 0x0591 && cp <= 0x05BD) || (cp >= 0x05BF && cp <= 0x05C7);
}

/**
 * Check if NFC-normalized text contains any of the given vowel code points.
 * Safe for single-codepoint vowel indicators (patah, hireq, etc.).
 */
function hasVowelPoint(text: string, ...codePoints: number[]): boolean {
  const normalized = text.normalize('NFC');
  return codePoints.some(cp => normalized.includes(String.fromCodePoint(cp)));
}

/**
 * Detects a true shureq (וּ as a vowel), distinguishing it from a
 * consonantal vav with dagesh forte (e.g. waw consecutive וִּ).
 *
 * A shureq is: vav (U+05D5) carrying ONLY dagesh (U+05BC) with
 * NO other vowel point on the same base character. If the vav also
 * carries hireq, patah, etc., its dagesh is dagesh forte, not shureq.
 */
function hasShureq(text: string): boolean {
  const s = text.normalize('NFC');
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) !== 0x05D5) continue; // Not a vav
    let hasDagesh = false;
    let hasVowel = false;
    let j = i + 1;
    while (j < s.length && isHebrewCombining(s.charCodeAt(j))) {
      const cp = s.charCodeAt(j);
      if (cp === 0x05BC) hasDagesh = true;
      if (HEBREW_VOWEL_POINTS.has(cp)) hasVowel = true;
      j++;
    }
    // Shureq: vav has dagesh but NO other vowel point
    if (hasDagesh && !hasVowel) return true;
  }
  return false;
}

/**
 * Returns morphemes that belong to the verbal form proper,
 * excluding prefixed particles (prepositions, waw, conjunctions).
 */
function verbalMorphemes(ms: readonly MorphemeSegment[]): MorphemeSegment[] {
  return ms.filter(m => !PARTICLE_PREFIX_ROLES.has(m.role));
}

const getColorOptions = (t: any): ColorOption[] => [
  // ── Prefixed particles ──────────────────────────────────────────────────
  {
    id: 'preposition',
    label: t('detective.phase.colors.options.preposition.label', { defaultValue: 'Preposición / Partícula prefijada (Celeste)' }),
    hex: '#0ea5e9', // sky-500 — distinct from any vowel color
    description: t('detective.phase.colors.options.preposition.description', { defaultValue: 'Preposición o conjunción unida al verbo (ל, ב, כ, מ, ו). ¡Diferente al preformativo verbal!' }),
    checkFn: (ms) => ms.some(m => PARTICLE_PREFIX_ROLES.has(m.role)),
  },
  // ── Verbal preformatives & binyan prefixes ──────────────────────────────
  // Color: TEAL — visually distinct from vowel-green (E/I) so students
  // don't confuse a binyan prefix with a vowel pattern.
  {
    id: 'prefix',
    label: t('detective.phase.colors.options.prefix.label', { defaultValue: 'Prefijo de Binyan (Marrón)' }),
    hex: '#59382F', // dark brown — visually distinct from all vowel colors
    description: t('detective.phase.colors.options.prefix.description', { defaultValue: 'Preformativos de persona/número (י, ת, א, נ) o prefijos de binyan (נ de Nifal, ה de Hifil, הת de Hitpael)' }),
    checkFn: (ms) => ms.some(m => VERBAL_PREFIX_ROLES.has(m.role)),
  },
  {
    id: 'root',
    label: t('detective.phase.colors.options.root.label', { defaultValue: 'Raíz Intacta (Gris)' }),
    hex: '#64748b', // slate-500
    description: t('detective.phase.colors.options.root.description', { defaultValue: 'Letras radicales que contienen el significado base (sin color fonético)' }),
    checkFn: (ms) => ms.some(m => ROOT_ROLES.has(m.role)),
  },
  // Color: YELLOW — visually distinct from orange (Clase O/U) so students
  // don't confuse the dagesh with a vowel.
  {
    id: 'dagesh',
    label: t('detective.phase.colors.options.dagesh.label', { defaultValue: 'Dagesh Forte (Dorado)' }),
    hex: '#928854', // custom olive/gold requested by user to avoid vowel clash
    description: t('detective.phase.colors.options.dagesh.description', { defaultValue: 'Duplicación de la consonante, típicamente en R2 (clave para Piel, Pual, Hitpael)' }),
    checkFn: (ms) => ms.some(m => m.role === MorphemeRole.DAGESH_FORTE),
  },
  // ── Vowel classes — Prof. Farfán's official color coding ────────────────
  // These four colors are the ones defined in 1_codigo-colores.md and must
  // remain consistent so students can memorize the system.
  //
  // All vowel checks use NFC-normalized text to avoid combining character
  // ordering issues. Shureq uses a dedicated helper to prevent false
  // positives from consonantal vav + dagesh forte (e.g. waw consecutive).
  {
    id: 'vowel_a',
    label: t('detective.phase.colors.options.vowelA.label', { defaultValue: 'Vocal Clase A (Rojo)' }),
    hex: '#ef4444', // red-500
    description: t('detective.phase.colors.options.vowelA.description', { defaultValue: 'Pataj ( ַ ) o Qamets ( ָ )' }),
    checkFn: (ms) => ms.some(m => hasVowelPoint(m.text, 0x05B7, 0x05B8)),
  },
  {
    id: 'vowel_ei',
    label: t('detective.phase.colors.options.vowelEI.label', { defaultValue: 'Vocal Clase E/I (Verde)' }),
    hex: '#22c55e', // green-500 — official Prof. Farfán color
    description: t('detective.phase.colors.options.vowelEI.description', { defaultValue: 'Segol ( ֶ ), Tsere ( ֵ ) o Jireq ( ִ )' }),
    checkFn: (ms) => ms.some(m => hasVowelPoint(m.text, 0x05B6, 0x05B5, 0x05B4)),
  },
  {
    id: 'vowel_ou',
    label: t('detective.phase.colors.options.vowelOU.label', { defaultValue: 'Vocal Clase O/U (Naranja)' }),
    hex: '#f97316', // orange-500 — official Prof. Farfán color
    description: t('detective.phase.colors.options.vowelOU.description', { defaultValue: 'Jolem ( ֹ ), Qibbuts ( ֻ ) o Shureq ( וּ )' }),
    checkFn: (ms) => ms.some(m =>
      hasVowelPoint(m.text, 0x05B9, 0x05BB) || hasShureq(m.text)
    ),
  },
  {
    id: 'sheva',
    label: t('detective.phase.colors.options.sheva.label', { defaultValue: 'Shevá / Reducidas (Púrpura)' }),
    hex: '#a855f7', // purple-500 — official Prof. Farfán color
    description: t('detective.phase.colors.options.sheva.description', { defaultValue: 'Shevá ( ְ ) y semivocales ( ֱ ,  ֲ ,  ֳ )' }),
    checkFn: (ms) => ms.some(m => hasVowelPoint(m.text, 0x05B0, 0x05B1, 0x05B2, 0x05B3)),
  },

];

/** Derive the "expected" sequence from the word's actual morphemes and text */
function deriveExpectedColorSequence(morphemes: readonly MorphemeSegment[], options: ColorOption[]): string[] {
  const sequence: string[] = [];
  for (const option of options) {
    if (option.checkFn(morphemes)) {
      sequence.push(option.id);
    }
  }
  return sequence;
}


export const DetectivePhase2Colors: React.FC<DetectivePhase2ColorsProps> = ({ word, onComplete }) => {
  const { t } = useTranslation('hebrewTutor');
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const options = getColorOptions(t);
  const expectedSequence = deriveExpectedColorSequence(word.morphemes ?? [], options);

  const toggleColor = (id: string) => {
    if (submitted) return;
    setSelected(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
  };

  const isCorrect = () => {
    const s = [...selected].sort().join(',');
    const e = [...expectedSequence].sort().join(',');
    return s === e;
  };

  const handleSubmit = () => {
    if (selected.length === 0) return;
    setSubmitted(true);
  };

  const answerLabel = selected.map(id => options.find(c => c.id === id)?.label ?? id).join(' + ');
  const correctLabel = expectedSequence.map(id => options.find(c => c.id === id)?.label ?? id).join(' + ');

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={2}
        name={t('detective.phase.colors.title', { defaultValue: 'Tirar los Colores' })}
        question={t('detective.phase.colors.question', { defaultValue: '¿Qué colores morfológicos ves en este verbo?' })}
      />

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <span dangerouslySetInnerHTML={{ __html: t('detective.phase.colors.hint', { defaultValue: '<strong>Recuerda:</strong> "Tirar los colores" significa identificar los elementos morfológicos presentes en el verbo — de derecha a izquierda. Selecciona todos los que veas.' }) }} />
        </p>
      </div>

      {!submitted ? (
        <div className="space-y-2">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => toggleColor(opt.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                ${selected.includes(opt.id)
                  ? 'border-[var(--sel-color)] bg-[var(--sel-color)]/10'
                  : 'border-border hover:bg-muted/50'}
              `}
              style={{ '--sel-color': opt.hex } as React.CSSProperties}
            >
              <span
                className="w-5 h-5 rounded-full flex-shrink-0"
                style={{ backgroundColor: opt.hex }}
              />
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
              {selected.includes(opt.id) && (
                <span className="text-xs font-bold" style={{ color: opt.hex }}>✓</span>
              )}
            </button>
          ))}

          <button
            disabled={selected.length === 0}
            onClick={handleSubmit}
            className="w-full mt-2 py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('detective.phase.colors.verifyCount', { defaultValue: 'Verificar ({{count}} seleccionados)', count: selected.length })}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isCorrect() ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ {t('detective.phase.colors.correctTitle', { defaultValue: '¡Excelente! Identificaste correctamente los colores.' })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
                {t('detective.phase.colors.sequence', { defaultValue: 'Secuencia:' })} <strong>{correctLabel}</strong>
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ {t('detective.phase.colors.incorrectTitle', { defaultValue: 'No del todo. Revisa la secuencia correcta:' })}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                {t('detective.phase.colors.yourAnswer', { defaultValue: 'Tu respuesta:' })} {answerLabel || '—'}
              </p>
              <p className="text-orange-700 dark:text-orange-300 text-xs font-semibold mt-1">
                {t('detective.phase.colors.correctAnswer', { defaultValue: 'Respuesta correcta:' })} <strong>{correctLabel}</strong>
              </p>
            </div>
          )}
          <button
            onClick={() => onComplete(answerLabel)}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            {t('common.continue', { defaultValue: 'Continuar →' })}
          </button>
        </div>
      )}
    </div>
  );
};
