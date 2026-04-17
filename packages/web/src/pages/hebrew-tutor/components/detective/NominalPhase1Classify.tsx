import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DetectivePhase, GrammaticalCategory } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import { HintList } from './HintList';
import { useContextualHints } from '../../hooks/useContextualHints';
import type { WordAnalysis } from '@dosfilos/domain';

interface NominalPhase1ClassifyProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

const getCategoryGroups = (t: any) => [
  { value: 'noun',     label: t('detective.phase.nominalClassify.groups.noun.label', { defaultValue: 'Sustantivo' }), emoji: '🏷', description: t('detective.phase.nominalClassify.groups.noun.description', { defaultValue: 'Nombra una persona, lugar o cosa' }) },
  { value: 'adjective', label: t('detective.phase.nominalClassify.groups.adjective.label', { defaultValue: 'Adjetivo' }), emoji: '✨', description: t('detective.phase.nominalClassify.groups.adjective.description', { defaultValue: 'Describe a un sustantivo' }) },
  { value: 'pronoun',  label: t('detective.phase.nominalClassify.groups.pronoun.label', { defaultValue: 'Pronombre' }),  emoji: '👆', description: t('detective.phase.nominalClassify.groups.pronoun.description', { defaultValue: 'Reemplaza a un sustantivo' }) },
  { value: 'particle', label: t('detective.phase.nominalClassify.groups.particle.label', { defaultValue: 'Partícula / Preposición' }), emoji: '🔗', description: t('detective.phase.nominalClassify.groups.particle.description', { defaultValue: 'Conector, preposición o partícula' }) },
];

function getCategoryGroup(category: GrammaticalCategory): string {
  if (category === GrammaticalCategory.NOUN || category === GrammaticalCategory.PROPER_NOUN) {
    return 'noun';
  }
  if (category === GrammaticalCategory.ADJECTIVE) {
    return 'adjective';
  }
  if (category === GrammaticalCategory.PRONOUN || 
      category === GrammaticalCategory.PERSONAL_PRONOUN || 
      category === GrammaticalCategory.DEMONSTRATIVE_PRONOUN || 
      category === GrammaticalCategory.RELATIVE_PRONOUN) {
    return 'pronoun';
  }
  return 'particle';
}

export const NominalPhase1Classify: React.FC<NominalPhase1ClassifyProps> = ({ word, onComplete }) => {
  const { t } = useTranslation('hebrewTutor');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { hints } = useContextualHints(word, DetectivePhase.NOMINAL_CLASSIFY);

  const expectedGroup = getCategoryGroup(word.category);
  const isCorrect = selected === expectedGroup;

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
        name={t('detective.phase.nominalClassify.title', { defaultValue: 'Clasificación' })}
        question={t('detective.phase.nominalClassify.question', { defaultValue: 'Observa esta palabra. ¿Qué tipo de palabra es?' })}
      />

      <HintList hints={hints} />

      {!submitted ? (
        <div className="space-y-2">
          {getCategoryGroups(t).map(type => (
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
            {t('detective.phase.nominalClassify.verifyAnswer', { defaultValue: 'Verificar respuesta' })}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isCorrect ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ {t('detective.phase.nominalClassify.correctTitle', { defaultValue: '¡Correcto!' })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed">
                {word.syntacticFunction}
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                <span dangerouslySetInnerHTML={{ __html: t('detective.phase.nominalClassify.incorrectTitle', { defaultValue: '✗ No exactamente. Esta palabra es un <strong>{{category}}</strong>.', category: getCategoryGroups(t).find(g => g.value === expectedGroup)?.label.toLowerCase() }) }} />
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
