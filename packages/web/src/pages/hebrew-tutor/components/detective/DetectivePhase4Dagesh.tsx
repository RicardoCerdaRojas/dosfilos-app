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

interface DetectivePhase4DageshProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

type DageshAnswer = 'yes' | 'no' | 'cannot'; // cannot = "SeLVeKiMoNo" consonant

const ANSWERS = [
  {
    value: 'yes' as DageshAnswer,
    label: '✓ Sí — hay dagesh forte en R2',
    description: 'Indica duplicación: probablemente Piel, Pual o Hitpael',
    emoji: '⚡',
  },
  {
    value: 'no' as DageshAnswer,
    label: '✗ No — no hay dagesh forte en R2',
    description: 'Sin duplicación: probablemente Qal, Nifal, Hifil u Hofal',
    emoji: '❌',
  },
  {
    value: 'cannot' as DageshAnswer,
    label: '⚠ La consonante no puede recibir dagesh',
    description: 'Regla "Se Ve eL KIMoNo": ש ו ל כ י מ נ — estas letras no duplican',
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
  const [selected, setSelected] = useState<DageshAnswer | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
        name="Inspección de Dagesh"
        question="¿Hay dagesh forte en la segunda radical (R2)?"
      />

      {/* Mnemonic reference */}
      <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
        <p className="text-xs text-purple-800 dark:text-purple-300 font-semibold mb-1">
          Regla mnemotécnica: "Se Ve eL KIMoNo"
        </p>
        <div dir="rtl" lang="he" className="text-lg text-purple-700 dark:text-purple-300 font-serif tracking-widest mb-1">
          ש ו ל כ י מ נ
        </div>
        <p className="text-xs text-purple-700 dark:text-purple-400">
          Estas consonantes <strong>no pueden recibir dagesh forte</strong>.
          Si R2 es una de ellas, el dagesh se compensa con una vocal larga.
        </p>
      </div>

      {!submitted ? (
        <div className="space-y-2">
          {ANSWERS.map(ans => (
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
            Verificar respuesta
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isCorrect ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ ¡Correcto!
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
                {visibleDagesh
                  ? 'El dagesh forte en R2 es una señal clave de Piel, Pual o Hitpael.'
                  : 'Sin dagesh forte en R2. Esto apunta hacia Qal, Nifal, Hifil u Hofal.'}
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ Revisa nuevamente. La respuesta correcta es:
              </p>
              <p className="text-orange-700 dark:text-orange-300 text-sm font-bold mt-1">
                {expectedAnswer === 'yes'
                  ? '✓ Sí hay dagesh forte en R2'
                  : '✗ No hay dagesh forte en R2'}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                {visibleDagesh
                  ? 'Busca el punto en el interior de la segunda radical.'
                  : expectsDagesh
                    ? 'La consonante de R2 no puede recibir dagesh (regla "Se Ve eL KIMoNo").'
                    : 'Este binyan no usa dagesh forte como marcador.'}
              </p>
            </div>
          )}
          <button
            onClick={() => onComplete(selected!)}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
};
