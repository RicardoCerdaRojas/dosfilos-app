/**
 * DetectivePhase4Dagesh
 *
 * Phase 4: Dagesh forte inspection. Student identifies whether
 * the verb has a dagesh forte in R2 (which identifies Piel, Pual, Hitpael).
 * Based on Farfán lessons 2, 3, 6.
 *
 * Mnemonic: "Se Ve eL KIMoNo" — consonants that cannot receive dagesh forte.
 */

import React, { useState } from 'react';
import type { WordAnalysis } from '@dosfilos/domain';
import { Binyan, MorphemeRole } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import { useTranslation } from 'react-i18next';

interface DetectivePhase4DageshProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

type DageshAnswer = 'yes' | 'no' | 'cannot'; // cannot = "SeLVeKiMoNo" consonant

const getAnswers = (t: any) => [
  {
    value: 'yes' as DageshAnswer,
    label: t('detective.phase4.options.yes.label', { defaultValue: '✓ Sí — hay dagesh forte en R2' }),
    description: t('detective.phase4.options.yes.description', { defaultValue: 'Indica duplicación: probablemente Piel, Pual o Hitpael' }),
    emoji: '⚡',
  },
  {
    value: 'no' as DageshAnswer,
    label: t('detective.phase4.options.no.label', { defaultValue: '✗ No — no hay dagesh forte en R2' }),
    description: t('detective.phase4.options.no.description', { defaultValue: 'Sin duplicación: probablemente Qal, Nifal, Hifil u Hofal' }),
    emoji: '❌',
  },
  {
    value: 'cannot' as DageshAnswer,
    label: t('detective.phase4.options.cannot.label', { defaultValue: '⚠ La consonante no puede recibir dagesh' }),
    description: t('detective.phase4.options.cannot.description', { defaultValue: 'Regla "Se Ve eL KIMoNo": ש ו ל כ י מ נ — estas letras no duplican' }),
    emoji: '🚫',
  },
];

/** True if this binyan normally has dagesh forte in R2 */
function hasDageshFort(word: WordAnalysis): boolean {
  const binyan = word.verbMorphology?.binyan;
  if (!binyan) return false;
  return [Binyan.PIEL, Binyan.PUAL, Binyan.HITPAEL].includes(binyan);
}

/** True if any morpheme is DAGESH_FORTE in the word */
function hasVisibleDagesh(word: WordAnalysis): boolean {
  return (word.morphemes ?? []).some(m => m.role === MorphemeRole.DAGESH_FORTE);
}

export const DetectivePhase4Dagesh: React.FC<DetectivePhase4DageshProps> = ({ word, onComplete }) => {
  const { t } = useTranslation('hebrewTutor');
  const [selected, setSelected] = useState<DageshAnswer | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const answers = getAnswers(t);
  const expectsDagesh = hasDageshFort(word);
  const visibleDagesh = hasVisibleDagesh(word);

  // Correct answer: if there's a dagesh morpheme → 'yes', else 'no'
  const expectedAnswer: DageshAnswer = visibleDagesh ? 'yes' : 'no';
  const isCorrect = selected === expectedAnswer || (selected === 'cannot' && !visibleDagesh && expectsDagesh === false);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={4}
        name={t('detective.phase4.hero.name', { defaultValue: 'Inspección de Dagesh' })}
        question={t('detective.phase4.hero.question', { defaultValue: '¿Hay dagesh forte en la segunda radical (R2)?' })}
      />

      {/* Mnemonic reference */}
      <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
        <p className="text-xs text-purple-800 dark:text-purple-300 font-semibold mb-1">
          {t('detective.phase4.hint.title', { defaultValue: 'Regla mnemotécnica: "Se Ve eL KIMoNo"' })}
        </p>
        <div dir="rtl" lang="he" className="text-lg text-purple-700 dark:text-purple-300 font-hebrew tracking-widest mb-1">
          ש ו ל כ י מ נ
        </div>
        <p 
          className="text-xs text-purple-700 dark:text-purple-400"
          dangerouslySetInnerHTML={{
            __html: t('detective.phase4.hint.descriptionHtml', {
              defaultValue: 'Estas consonantes <strong>no pueden recibir dagesh forte</strong>. Si R2 es una de ellas, el dagesh se compensa con una vocal larga.'
            })
          }}
        />
      </div>

      {!submitted ? (
        <div className="space-y-2">
          {answers.map(ans => (
            <button
              key={ans.value}
              onClick={() => setSelected(ans.value)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                ${selected === ans.value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-border hover:border-indigo-300 hover:bg-muted/50'}
              `}
            >
              <span className="text-xl w-8 text-center flex-shrink-0">{ans.emoji}</span>
              <div>
                <p className="font-semibold text-sm text-foreground">{ans.label}</p>
                <p className="text-xs text-muted-foreground">{ans.description}</p>
              </div>
            </button>
          ))}

          <button
            disabled={!selected}
            onClick={() => setSubmitted(true)}
            className="w-full mt-2 py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('detective.phase4.buttons.verify', { defaultValue: 'Verificar respuesta' })}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isCorrect ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                {t('detective.phase4.feedback.correctTitle', { defaultValue: '✅ ¡Correcto!' })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
                {visibleDagesh
                  ? t('detective.phase4.feedback.correctYes', { defaultValue: 'El dagesh forte en R2 es una señal clave de Piel, Pual o Hitpael.' })
                  : t('detective.phase4.feedback.correctNo', { defaultValue: 'Sin dagesh forte en R2. Esto apunta hacia Qal, Nifal, Hifil u Hofal.' })}
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                {t('detective.phase4.feedback.incorrectTitle', { defaultValue: '✗ Revisa nuevamente. La respuesta correcta es:' })}
              </p>
              <p className="text-orange-700 dark:text-orange-300 text-sm font-bold mt-1">
                {expectedAnswer === 'yes'
                  ? t('detective.phase4.feedback.incorrectYes', { defaultValue: '✓ Sí hay dagesh forte en R2' })
                  : t('detective.phase4.feedback.incorrectNo', { defaultValue: '✗ No hay dagesh forte en R2' })}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                {visibleDagesh
                  ? t('detective.phase4.feedback.incorrectExplanationVisible', { defaultValue: 'Busca el punto en el interior de la segunda radical.' })
                  : expectsDagesh
                    ? t('detective.phase4.feedback.incorrectExplanationCannot', { defaultValue: 'La consonante de R2 no puede recibir dagesh (regla "Se Ve eL KIMoNo").' })
                    : t('detective.phase4.feedback.incorrectExplanationExpects', { defaultValue: 'Este binyan no usa dagesh forte como marcador.' })}
              </p>
            </div>
          )}
          <button
            onClick={() => onComplete(selected!)}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            {t('detective.phase4.buttons.continue', { defaultValue: 'Continuar →' })}
          </button>
        </div>
      )}
    </div>
  );
};
