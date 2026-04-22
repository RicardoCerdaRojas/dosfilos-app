import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DetectivePhase, MorphemeRole } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import { ProgressiveHintList } from './ProgressiveHintList';
import { useContextualHints } from '../../hooks/useContextualHints';
import type { WordAnalysis } from '@dosfilos/domain';

interface NominalPhase2ArticleProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

export const NominalPhase2Article: React.FC<NominalPhase2ArticleProps> = ({ word, onComplete }) => {
  const { t } = useTranslation('hebrewTutor');
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { hints } = useContextualHints(word, DetectivePhase.NOMINAL_ARTICLE);

  const hasArticle = (word.morphemes ?? []).some(m => m.role === MorphemeRole.DEFINITE_ARTICLE);
  const expectedAnswer = hasArticle ? 'yes' : 'no';
  const isCorrect = selected === expectedAnswer;

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
        step={2}
        name={t('detective.phase.nominalArticle.title', { defaultValue: 'Artículo Definido' })}
        question={t('detective.phase.nominalArticle.question', { defaultValue: '¿Esta palabra tiene el artículo definido (הַ)?' })}
      />

      <ProgressiveHintList hints={hints} />

      {!submitted ? (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelected('yes')}
            className={`
              p-4 rounded-xl border-2 transition-all font-semibold
              ${selected === 'yes'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
                : 'border-border hover:border-indigo-300 text-muted-foreground hover:text-foreground'}
            `}
          >
            {t('common.yes', { defaultValue: 'Sí' })}
          </button>
          <button
            onClick={() => setSelected('no')}
            className={`
              p-4 rounded-xl border-2 transition-all font-semibold
              ${selected === 'no'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
                : 'border-border hover:border-indigo-300 text-muted-foreground hover:text-foreground'}
            `}
          >
            {t('common.no', { defaultValue: 'No' })}
          </button>

          <div className="col-span-2 mt-4">
            <button
              disabled={!selected}
              onClick={handleSubmit}
              className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('detective.phase.nominalArticle.verifyAnswer', { defaultValue: 'Verificar respuesta' })}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {isCorrect ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ {t('detective.phase.nominalArticle.correctTitle', { defaultValue: '¡Correcto!' })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed">
                {hasArticle 
                  ? t('detective.phase.nominalArticle.hasArticle', { defaultValue: 'La palabra incluye el artículo definido. Observa cómo interactúa con la primera consonante de la palabra.' })
                  : t('detective.phase.nominalArticle.noArticle', { defaultValue: 'Esta palabra no tiene un artículo definido adjunto.' })}
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ {t('detective.phase.nominalArticle.incorrectTitle', { defaultValue: 'No es correcto.' })}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                {hasArticle
                  ? t('detective.phase.nominalArticle.incorrectHasArticle', { defaultValue: 'Esta palabra SÍ tiene el artículo definido.' })
                  : t('detective.phase.nominalArticle.incorrectNoArticle', { defaultValue: 'Esta palabra NO tiene el artículo definido.' })}
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
