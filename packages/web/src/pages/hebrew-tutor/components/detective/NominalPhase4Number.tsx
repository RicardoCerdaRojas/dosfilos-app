import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DetectivePhase, GrammaticalNumber } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import { ProgressiveHintList } from './ProgressiveHintList';
import { useContextualHints } from '../../hooks/useContextualHints';
import type { WordAnalysis } from '@dosfilos/domain';

interface NominalPhase4NumberProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

// ── Number resolution helpers ──────────────────────────────────────────────

type FeedbackTier = 'correct' | 'nuanced' | 'incorrect';

/**
 * When the LLM doesn't assign a number (common with proper nouns),
 * singular is the default in Biblical Hebrew — proper nouns refer to
 * individual entities unless explicitly pluralized.
 */
const PREFERRED_NUMBER = GrammaticalNumber.SINGULAR;

function evaluateAnswer(
  selected: string,
  expectedNumber: GrammaticalNumber | undefined | null,
): FeedbackTier {
  if (expectedNumber !== undefined && expectedNumber !== null) {
    return selected === expectedNumber ? 'correct' : 'incorrect';
  }
  return selected === PREFERRED_NUMBER ? 'correct' : 'nuanced';
}

// ── Component ──────────────────────────────────────────────────────────────

export const NominalPhase4Number: React.FC<NominalPhase4NumberProps> = ({ word, onComplete }) => {
  const { t } = useTranslation('hebrewTutor');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { hints } = useContextualHints(word, DetectivePhase.NOMINAL_NUMBER);

  const expectedNumber = word.nominalMorphology?.number;
  const numberUndetermined = expectedNumber === undefined || expectedNumber === null;

  const feedbackTier: FeedbackTier = selected
    ? evaluateAnswer(selected, expectedNumber)
    : 'incorrect';

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
  };

  const handleContinue = () => {
    onComplete(selected!);
  };

  const options = [
    { value: GrammaticalNumber.SINGULAR, label: t('detective.phase.nominalNumber.options.singular', { defaultValue: 'Singular' }) },
    { value: GrammaticalNumber.PLURAL, label: t('detective.phase.nominalNumber.options.plural', { defaultValue: 'Plural' }) },
    { value: GrammaticalNumber.DUAL, label: t('detective.phase.nominalNumber.options.dual', { defaultValue: 'Dual' }) },
  ];

  const resolvedNumberLabel = (
    options.find(o => o.value === (expectedNumber ?? PREFERRED_NUMBER))?.label.toLowerCase() ?? 'singular'
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={4}
        name={t('detective.phase.nominalNumber.title', { defaultValue: 'Número' })}
        question={t('detective.phase.nominalNumber.question', { defaultValue: '¿Cuál es el número de esta palabra?' })}
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
            {t('detective.phase.nominalNumber.verifyAnswer', { defaultValue: 'Verificar respuesta' })}
          </button>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Tier 1: Correct ──────────────────────────────────────── */}
          {feedbackTier === 'correct' && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ {t('detective.phase.nominalNumber.correctTitle', { defaultValue: '¡Correcto!' })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed">
                {numberUndetermined
                  ? t('detective.phase.nominalNumber.correctConcordance', {
                      defaultValue: 'Los nombres propios designan entidades individuales y funcionan como **singular** — los verbos que los acompañan concuerdan en singular.',
                    })
                  : t('detective.phase.nominalNumber.correctNumber', {
                      defaultValue: 'El número es {{number}}.',
                      number: resolvedNumberLabel,
                    })}
              </p>
            </div>
          )}

          {/* ── Tier 2: Nuanced redirect (guided ambiguity) ─────────── */}
          {feedbackTier === 'nuanced' && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
              <p className="text-amber-700 dark:text-amber-300 font-semibold text-sm">
                🔍 {t('detective.phase.nominalNumber.nuancedTitle', { defaultValue: 'Razonamiento válido, pero hay más que observar.' })}
              </p>
              <p className="text-amber-600 dark:text-amber-400 text-xs leading-relaxed">
                {t('detective.phase.nominalNumber.nuancedBody', {
                  defaultValue: 'Esta palabra no tiene una marca de número visible (no termina en ים ni en וֹת). Los nombres propios refieren a entidades individuales y los verbos que los acompañan concuerdan en **singular**. La respuesta más fundamentada es **singular**.',
                })}
              </p>
            </div>
          )}

          {/* ── Tier 3: Incorrect (number IS known) ─────────────────── */}
          {feedbackTier === 'incorrect' && (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-2">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ {t('detective.phase.nominalNumber.incorrectTitle', { defaultValue: 'No exactamente.' })}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs leading-relaxed">
                {t('detective.phase.nominalNumber.incorrectNumber', {
                  defaultValue: 'Esta palabra está en **{{number}}**.',
                  number: resolvedNumberLabel,
                })}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs leading-relaxed border-t border-orange-200 dark:border-orange-800 pt-2">
                {expectedNumber === GrammaticalNumber.PLURAL
                  ? t('detective.phase.nominalNumber.explainPlural', {
                      defaultValue: 'Busca las terminaciones: **ים** (masculino plural) u **וֹת** (femenino plural) al final de la palabra.',
                    })
                  : expectedNumber === GrammaticalNumber.DUAL
                    ? t('detective.phase.nominalNumber.explainDual', {
                        defaultValue: 'La terminación **ַיִם** (con pataj) marca el dual: cosas que vienen en pares naturales.',
                      })
                    : t('detective.phase.nominalNumber.explainSingular', {
                        defaultValue: 'La ausencia de terminación plural (ים, וֹת) o dual (ַיִם) indica singular — la forma base.',
                      })}
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
