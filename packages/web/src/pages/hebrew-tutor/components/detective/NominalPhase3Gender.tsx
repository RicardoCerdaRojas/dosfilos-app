import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DetectivePhase, Gender } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import { HintList } from './HintList';
import { useContextualHints } from '../../hooks/useContextualHints';
import type { WordAnalysis } from '@dosfilos/domain';

interface NominalPhase3GenderProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

export const NominalPhase3Gender: React.FC<NominalPhase3GenderProps> = ({ word, onComplete }) => {
  const { t } = useTranslation('hebrewTutor');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { hints } = useContextualHints(word, DetectivePhase.NOMINAL_GENDER);

  const expectedGender = word.nominalMorphology?.gender;
  // If undefined, default to something or allow it? Some words might not have gender.
  // Assuming it's typically set.
  const isCorrect = selected === expectedGender;

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

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={3}
        name={t('detective.phase.nominalGender.title', { defaultValue: 'Género' })}
        question={t('detective.phase.nominalGender.question', { defaultValue: '¿Cuál es el género de esta palabra?' })}
      />

      <HintList hints={hints} />

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
          {isCorrect ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ {t('detective.phase.nominalGender.correctTitle', { defaultValue: '¡Correcto!' })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed">
                {t('detective.phase.nominalGender.correctGender', { defaultValue: 'El género es {{gender}}.', gender: options.find(o => o.value === expectedGender)?.label.toLowerCase() })}
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ {t('detective.phase.nominalGender.incorrectTitle', { defaultValue: 'No exactamente.' })}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                {t('detective.phase.nominalGender.incorrectGender', { defaultValue: 'Esta palabra es de género {{gender}}.', gender: options.find(o => o.value === expectedGender)?.label.toLowerCase() })}
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
