/**
 * DetectivePhase1Observe
 *
 * Phase 1: Initial observation. The student sees the verb highlighted
 * with morphological color-coding and confirms it is a verb before
 * proceeding with the investigation.
 *
 * Contextual hints are resolved by the HintEngine — no hint logic lives here.
 */

import React, { useState } from 'react';
import { DetectivePhase, MorphemeRole } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import { HintList } from './HintList';
import { useTranslation } from 'react-i18next';
import { useContextualHints } from '../../hooks/useContextualHints';
import type { WordAnalysis } from '@dosfilos/domain';

interface DetectivePhase1ObserveProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

const getWordTypes = (t: any) => [
  { value: 'verb',     label: t('detective.phase.observe.wordTypes.verb.label', { defaultValue: 'Verbo' }),     emoji: '⚡', description: t('detective.phase.observe.wordTypes.verb.description', { defaultValue: 'Expresa acción, estado o proceso' }) },
  { value: 'noun',     label: t('detective.phase.observe.wordTypes.noun.label', { defaultValue: 'Sustantivo' }), emoji: '🏷', description: t('detective.phase.observe.wordTypes.noun.description', { defaultValue: 'Nombra una persona, lugar o cosa' }) },
  { value: 'particle', label: t('detective.phase.observe.wordTypes.particle.label', { defaultValue: 'Partícula' }), emoji: '🔗', description: t('detective.phase.observe.wordTypes.particle.description', { defaultValue: 'Conector, preposición o partícula' }) },
  { value: 'pronoun',  label: t('detective.phase.observe.wordTypes.pronoun.label', { defaultValue: 'Pronombre' }),  emoji: '👆', description: t('detective.phase.observe.wordTypes.pronoun.description', { defaultValue: 'Reemplaza a un sustantivo' }) },
];

export const DetectivePhase1Observe: React.FC<DetectivePhase1ObserveProps> = ({ word, onComplete }) => {
  const { t } = useTranslation('hebrewTutor');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { hints } = useContextualHints(word, DetectivePhase.OBSERVE);

  const hasPreformative = (word.morphemes ?? []).some(
    m => m.role === MorphemeRole.PREFORMATIVE,
  );
  const hasWawPrefix = (word.morphemes ?? []).some(
    m => m.role === MorphemeRole.WAW_CONSECUTIVE || m.role === MorphemeRole.WAW_CONJUNCTIVE,
  );

  const isCorrect = selected === 'verb';

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
  };

  const handleContinue = () => {
    onComplete(selected!);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={1}
        name={t('detective.phase.observe.title', { defaultValue: 'Observación Inicial' })}
        question={t('detective.phase.observe.question', { defaultValue: 'Observa esta palabra. ¿Qué tipo de palabra es?' })}
      />

      {/* Contextual hints — resolved by HintEngine, no logic here */}
      <HintList hints={hints} />

      {/* Word type selection */}
      {!submitted ? (
        <div className="space-y-2">
          {getWordTypes(t).map(type => (
            <button
              key={type.value}
              onClick={() => setSelected(type.value)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                ${selected === type.value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-border hover:border-indigo-300 hover:bg-muted/50'}
              `}
            >
              <span className="text-xl">{type.emoji}</span>
              <div>
                <p className="font-semibold text-sm text-foreground">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
            </button>
          ))}
          <button
            disabled={!selected}
            onClick={handleSubmit}
            className="w-full mt-2 py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('detective.phase.observe.verifyAnswer', { defaultValue: 'Verificar respuesta' })}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isCorrect ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ {t('detective.phase.observe.correctTitle', { defaultValue: '¡Correcto! Esta es una forma verbal.' })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed">
                {word.syntacticFunction}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed border-t border-emerald-200 dark:border-emerald-800 pt-2">
                {hasPreformative
                  ? <span dangerouslySetInnerHTML={{ __html: t('detective.phase.observe.correctReasonPreformative', { 
                      defaultValue: 'Lo confirman el <strong>preformativo</strong> (la letra י que precede a la raíz) y las <strong>vocales temáticas</strong> del paradigma verbal.' 
                    }) + (hasWawPrefix ? ' ' + t('detective.phase.observe.wawPrefixHint', { defaultValue: 'La Waw del inicio es solo la conjunción, no parte del verbo.' }) : '') }} />
                  : <span dangerouslySetInnerHTML={{ __html: t('detective.phase.observe.correctReasonVowels', { 
                      defaultValue: 'Las <strong>vocales temáticas</strong> y la raíz identificable son la clave en esta forma verbal.' 
                    }) }} />
                }
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                <span dangerouslySetInnerHTML={{ __html: t('detective.phase.observe.incorrectTitle', { defaultValue: '✗ No exactamente. Esta palabra es un <strong>verbo</strong>.' }) }} />
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                {word.syntacticFunction}
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
