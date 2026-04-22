import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DetectivePhase, Gender, GrammaticalCategory } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import { ProgressiveHintList } from './ProgressiveHintList';
import { useContextualHints } from '../../hooks/useContextualHints';
import type { WordAnalysis } from '@dosfilos/domain';

interface NominalPhase3GenderProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

// ── Gender resolution helpers ──────────────────────────────────────────────

/**
 * When the LLM doesn't assign a morphological gender (common with proper
 * nouns), infer a "preferred" gender based on Biblical Hebrew conventions.
 *
 * - Proper nouns default to masculine (most BH proper nouns, including
 *   divine names, trigger masculine agreement).
 * - Other words default to masculine (the unmarked form in BH).
 */
function inferPreferredGender(word: WordAnalysis): Gender {
  // In Biblical Hebrew, proper nouns and most nouns without explicit
  // feminine markers are masculine by default.
  return Gender.MASCULINE;
}

type FeedbackTier = 'correct' | 'nuanced' | 'incorrect';

/**
 * Three-tier evaluation:
 *  - correct:  exact match with expected gender (or preferred for undetermined)
 *  - nuanced:  gender undetermined and student picked something else → redirect
 *  - incorrect: gender IS known and student got it wrong
 */
function evaluateAnswer(
  selected: string,
  expectedGender: Gender | undefined | null,
  preferredGender: Gender,
): FeedbackTier {
  // Case 1: gender is explicitly set → strict match
  if (expectedGender !== undefined && expectedGender !== null) {
    return selected === expectedGender ? 'correct' : 'incorrect';
  }
  // Case 2: gender undetermined → guided ambiguity
  return selected === preferredGender ? 'correct' : 'nuanced';
}

// ── Component ──────────────────────────────────────────────────────────────

export const NominalPhase3Gender: React.FC<NominalPhase3GenderProps> = ({ word, onComplete }) => {
  const { t } = useTranslation('hebrewTutor');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { hints } = useContextualHints(word, DetectivePhase.NOMINAL_GENDER);

  const expectedGender = word.nominalMorphology?.gender;
  const preferredGender = inferPreferredGender(word);
  const genderUndetermined = expectedGender === undefined || expectedGender === null;

  const feedbackTier: FeedbackTier = selected
    ? evaluateAnswer(selected, expectedGender, preferredGender)
    : 'incorrect';

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
  };

  const handleContinue = () => {
    onComplete(selected!);
  };

  const options = [
    { value: Gender.MASCULINE, label: t('detective.phase.nominalGender.options.masculine', { defaultValue: 'Masculino' }) },
    { value: Gender.FEMININE, label: t('detective.phase.nominalGender.options.feminine', { defaultValue: 'Femenino' }) },
    { value: Gender.COMMON, label: t('detective.phase.nominalGender.options.common', { defaultValue: 'Común' }) },
  ];

  const resolvedGenderLabel = (
    options.find(o => o.value === (expectedGender ?? preferredGender))?.label.toLowerCase() ?? 'masculino'
  );

  /** Morphological explanation shown after an incorrect answer */
  const getExplanation = (): string => {
    const target = expectedGender ?? preferredGender;
    if (target === Gender.MASCULINE) {
      return t('detective.phase.nominalGender.explainMasc', {
        defaultValue: 'En hebreo, el masculino es la forma no marcada: si la palabra no tiene terminación femenina (הָ o ת), generalmente es masculino.',
      });
    }
    if (target === Gender.FEMININE) {
      return t('detective.phase.nominalGender.explainFem', {
        defaultValue: 'Las terminaciones הָ (he + qamets) y ת (tav) son las marcas más comunes del femenino. Observa la terminación de esta palabra.',
      });
    }
    return t('detective.phase.nominalGender.explainCommon', {
      defaultValue: 'Algunas palabras pueden funcionar como masculino o femenino según el contexto.',
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={3}
        name={t('detective.phase.nominalGender.title', { defaultValue: 'Género' })}
        question={t('detective.phase.nominalGender.question', { defaultValue: '¿Cuál es el género de esta palabra?' })}
      />

      <ProgressiveHintList hints={hints} />

      {!submitted ? (
        <div className="space-y-2">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`
                w-full p-4 rounded-xl border-2 text-left transition-all font-semibold
                ${selected === opt.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
                  : 'border-border hover:border-indigo-300 text-muted-foreground hover:text-foreground'}
              `}
            >
              {opt.label}
            </button>
          ))}
          <button
            disabled={!selected}
            onClick={handleSubmit}
            className="w-full mt-2 py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('detective.phase.nominalGender.verifyAnswer', { defaultValue: 'Verificar respuesta' })}
          </button>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Tier 1: Correct ──────────────────────────────────────── */}
          {feedbackTier === 'correct' && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ {t('detective.phase.nominalGender.correctTitle', { defaultValue: '¡Correcto!' })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed">
                {genderUndetermined
                  ? t('detective.phase.nominalGender.correctConcordance', {
                      defaultValue: 'Aunque esta palabra no tiene una marca morfológica de género visible, en el texto bíblico funciona como **masculino** — los verbos y adjetivos que la acompañan siempre concuerdan en masculino.',
                    })
                  : t('detective.phase.nominalGender.correctGender', {
                      defaultValue: 'El género es {{gender}}.',
                      gender: resolvedGenderLabel,
                    })}
              </p>
            </div>
          )}

          {/* ── Tier 2: Nuanced redirect (guided ambiguity) ─────────── */}
          {feedbackTier === 'nuanced' && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
              <p className="text-amber-700 dark:text-amber-300 font-semibold text-sm">
                🔍 {t('detective.phase.nominalGender.nuancedTitle', { defaultValue: 'Razonamiento válido, pero hay más que observar.' })}
              </p>
              <p className="text-amber-600 dark:text-amber-400 text-xs leading-relaxed">
                {t('detective.phase.nominalGender.nuancedBody', {
                  defaultValue: 'Es cierto que esta palabra no tiene una marca morfológica de género explícita — tu observación es correcta. Sin embargo, en el hebreo bíblico su género se determina por **concordancia**: los verbos y adjetivos que acompañan a esta palabra siempre aparecen en **masculino**. Por eso, la respuesta más fundamentada es **masculino**.',
                })}
              </p>
            </div>
          )}

          {/* ── Tier 3: Incorrect (gender IS known) ─────────────────── */}
          {feedbackTier === 'incorrect' && (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-2">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ {t('detective.phase.nominalGender.incorrectTitle', { defaultValue: 'No exactamente.' })}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs leading-relaxed">
                {t('detective.phase.nominalGender.incorrectGender', {
                  defaultValue: 'Esta palabra es de género **{{gender}}**.',
                  gender: resolvedGenderLabel,
                })}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs leading-relaxed border-t border-orange-200 dark:border-orange-800 pt-2">
                {getExplanation()}
              </p>
            </div>
          )}

          <button
            onClick={handleContinue}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            {t('common.continue', { defaultValue: 'Continuar →' })}
          </button>
        </div>
      )}
    </div>
  );
};
