/**
 * DetectivePhase3Prefix
 *
 * Phase 3: Prefix inspection. Student identifies whether the verb
 * has a binyan-indicator prefix (נ, ה, הת, מ) or none.
 * Based on Farfán lessons 1, 4, 5, 6.
 */

import React, { useState } from 'react';
import type { WordAnalysis } from '@dosfilos/domain';
import { Binyan } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';

interface DetectivePhase3PrefixProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

interface PrefixOption {
  id: string;
  prefix: string;
  binyanHint: string;
  description: string;
}

const PREFIX_OPTIONS: PrefixOption[] = [
  {
    id: 'nun',
    prefix: 'נִ',
    binyanHint: '→ Nifal (pasivo/reflexivo del Qal)',
    description: 'La נ asimila en perfecto; visible en imperfecto y participio',
  },
  {
    id: 'he_hifil',
    prefix: 'הִ',
    binyanHint: '→ Hifil (causativo activo)',
    description: 'Prefijo הִ con pataj en Hifil perfecto',
  },
  {
    id: 'he_hofal',
    prefix: 'הָ/הֻ',
    binyanHint: '→ Hofal (causativo pasivo)',
    description: 'Prefijo הָ (qamets-hatuf) o הֻ en Hofal',
  },
  {
    id: 'hitpael',
    prefix: 'הִתְ',
    binyanHint: '→ Hitpael (reflexivo intensivo)',
    description: 'El ת del Hitpael puede metathesizarse con ciertas letras',
  },
  {
    id: 'mem',
    prefix: 'מְ',
    binyanHint: '→ Participio derivado (Piel/Pual/Hifil/Hofal)',
    description: 'Participio de los binyanim derivados lleva מ-',
  },
  {
    id: 'none',
    prefix: '—',
    binyanHint: '→ Qal, Piel o Pual (sin prefijo propio de binyan)',
    description: 'Sin prefijo de binyan visible (Qal/Piel/Pual perfecto; waw-consecutive)',
  },
];

/** Determines the expected prefix based on the verb's binyan */
function getExpectedPrefixId(word: WordAnalysis): string {
  const binyan = word.verbMorphology?.binyan;
  if (!binyan) return 'none';
  switch (binyan) {
    case Binyan.NIFAL:   return 'nun';
    case Binyan.HIFIL:   return 'he_hifil';
    case Binyan.HOFAL:   return 'he_hofal';
    case Binyan.HITPAEL: return 'hitpael';
    default:             return 'none'; // QAL, PIEL, PUAL
  }
}

export const DetectivePhase3Prefix: React.FC<DetectivePhase3PrefixProps> = ({ word, onComplete }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const expectedId = getExpectedPrefixId(word);
  const isCorrect = selected === expectedId;
  const correctOption = PREFIX_OPTIONS.find(p => p.id === expectedId)!;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={3}
        name="Inspección de Prefijos"
        question="¿Reconoces algún prefijo de binyan en este verbo?"
      />

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <strong>Regla:</strong> Los binyanim derivados (Nifal, Hifil, Hofal, Hitpael) tienen
          prefijos propios que los identifican. El Qal, Piel y Pual no tienen prefijo de binyan propio.
        </p>
      </div>

      {!submitted ? (
        <div className="space-y-2">
          {PREFIX_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                ${selected === opt.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-border hover:border-indigo-300 hover:bg-muted/50'}
              `}
            >
              <span
                dir="rtl"
                lang="he"
                className="text-xl font-serif font-bold text-primary w-10 text-center flex-shrink-0"
              >
                {opt.prefix}
              </span>
              <div>
                <p className="font-semibold text-sm text-foreground">{opt.binyanHint}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
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
                ✅ ¡Correcto! Identificaste bien el prefijo.
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
                {correctOption.binyanHint}
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ No exactamente. La respuesta correcta es:
              </p>
              <p className="text-orange-700 dark:text-orange-300 text-sm font-bold mt-1">
                <span dir="rtl" lang="he">{correctOption.prefix}</span> {correctOption.binyanHint}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                {correctOption.description}
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
