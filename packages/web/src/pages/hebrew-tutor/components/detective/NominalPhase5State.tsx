import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DetectivePhase, NominalState } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import { ProgressiveHintList } from './ProgressiveHintList';
import { useContextualHints } from '../../hooks/useContextualHints';
import type { WordAnalysis } from '@dosfilos/domain';

interface NominalPhase5StateProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

// ── State resolution helpers ───────────────────────────────────────────────

type FeedbackTier = 'correct' | 'nuanced' | 'incorrect';

/**
 * When the LLM doesn't assign a state (common with proper nouns),
 * absolute is the default — proper nouns stand independently.
 */
const PREFERRED_STATE = NominalState.ABSOLUTE;

function evaluateAnswer(
  selected: string,
  expectedState: NominalState | undefined | null,
): FeedbackTier {
  if (expectedState !== undefined && expectedState !== null) {
    return selected === expectedState ? 'correct' : 'incorrect';
  }
  return selected === PREFERRED_STATE ? 'correct' : 'nuanced';
}

// ── Component ──────────────────────────────────────────────────────────────

export const NominalPhase5State: React.FC<NominalPhase5StateProps> = ({ word, onComplete }) => {
  const { t } = useTranslation('hebrewTutor');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { hints } = useContextualHints(word, DetectivePhase.NOMINAL_STATE);

  const expectedState = word.nominalMorphology?.state;
  const stateUndetermined = expectedState === undefined || expectedState === null;

  const feedbackTier: FeedbackTier = selected
    ? evaluateAnswer(selected, expectedState)
    : 'incorrect';

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
  };

  const handleContinue = () => {
    onComplete(selected!);
  };

  const options = [
    { value: NominalState.ABSOLUTE, label: t('detective.phase.nominalState.options.absolute', { defaultValue: 'Absoluto' }), description: t('detective.phase.nominalState.options.absoluteDesc', { defaultValue: 'Forma independiente' }) },
    { value: NominalState.CONSTRUCT, label: t('detective.phase.nominalState.options.construct', { defaultValue: 'Constructo' }), description: t('detective.phase.nominalState.options.constructDesc', { defaultValue: 'Unido a la siguiente palabra' }) },
  ];

  const resolvedStateLabel = (
    options.find(o => o.value === (expectedState ?? PREFERRED_STATE))?.label.toLowerCase() ?? 'absoluto'
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={5}
        name={t('detective.phase.nominalState.title', { defaultValue: 'Estado' })}
        question={t('detective.phase.nominalState.question', { defaultValue: '¿En qué estado se encuentra esta palabra?' })}
      />

      <ProgressiveHintList hints={hints} />

      {!submitted ? (
        <div className="space-y-2">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`
                w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all
                ${selected === opt.value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-border hover:border-indigo-300 hover:bg-muted/50'}
              `}
            >
              <span className={`font-semibold ${selected === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'}`}>
                {opt.label}
              </span>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
            </button>
          ))}
          <button
            disabled={!selected}
            onClick={handleSubmit}
            className="w-full mt-2 py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('detective.phase.nominalState.verifyAnswer', { defaultValue: 'Verificar respuesta' })}
          </button>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Tier 1: Correct ──────────────────────────────────────── */}
          {feedbackTier === 'correct' && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ {t('detective.phase.nominalState.correctTitle', { defaultValue: '¡Correcto!' })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed">
                {stateUndetermined
                  ? t('detective.phase.nominalState.correctConcordance', {
                      defaultValue: 'Los nombres propios no entran en cadenas constructas — mantienen su forma independiente (**absoluto**).',
                    })
                  : t('detective.phase.nominalState.correctState', {
                      defaultValue: 'Está en estado {{state}}.',
                      state: resolvedStateLabel,
                    })}
              </p>
            </div>
          )}

          {/* ── Tier 2: Nuanced redirect (guided ambiguity) ─────────── */}
          {feedbackTier === 'nuanced' && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
              <p className="text-amber-700 dark:text-amber-300 font-semibold text-sm">
                🔍 {t('detective.phase.nominalState.nuancedTitle', { defaultValue: 'Razonamiento válido, pero hay más que observar.' })}
              </p>
              <p className="text-amber-600 dark:text-amber-400 text-xs leading-relaxed">
                {t('detective.phase.nominalState.nuancedBody', {
                  defaultValue: 'Los nombres propios normalmente no entran en una cadena constructa (no dependen de otra palabra para completar su significado). Por eso funcionan en estado **absoluto** — su forma independiente.',
                })}
              </p>
            </div>
          )}

          {/* ── Tier 3: Incorrect (state IS known) ──────────────────── */}
          {feedbackTier === 'incorrect' && (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-2">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ {t('detective.phase.nominalState.incorrectTitle', { defaultValue: 'No exactamente.' })}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs leading-relaxed">
                {t('detective.phase.nominalState.incorrectState', {
                  defaultValue: 'El estado correcto es **{{state}}**.',
                  state: resolvedStateLabel,
                })}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs leading-relaxed border-t border-orange-200 dark:border-orange-800 pt-2">
                {expectedState === NominalState.CONSTRUCT
                  ? t('detective.phase.nominalState.explainConstruct', {
                      defaultValue: 'En estado constructo, la palabra está ligada a la siguiente en una relación de posesión ("X de Y"). Busca reducción vocálica y acortamiento de terminaciones.',
                    })
                  : t('detective.phase.nominalState.explainAbsolute', {
                      defaultValue: 'El estado absoluto es la forma independiente de diccionario, sin reducciones vocálicas ni dependencia gramatical de otra palabra.',
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
