/**
 * DetectivePhase3wPreformative
 *
 * Weak Verb Path — Phase 3w: "Vocal del Preformativo"
 *
 * Implements the Farfán Lección 8 diagnostic table:
 * the student identifies the vowel under the preformative prefix,
 * then the system shows what verb type/binyan that vowel suggests.
 *
 * Reference: docs/hebreo/lecciones/leccion-8.md — Section II & III
 *
 * Decision tree (simplified):
 *  pataj  + 3 radicals → Hifil
 *  jireq  + 3 radicals → Qal / Nifal
 *  shevá  + 3 radicals → Piel / Pual
 *  qamets + 2 radicals → II-Vocal (90%) / II-Duplicada (10%)
 *  tsere  + 2 radicals → I-ו / III-ה (Qal)
 *  jireq  + 2 radicals → III-ה (Qal)
 *  pataj  + 2 radicals → III-ה (Qal / Hifil)
 *  jolem-vav            → I-ו (Nifal / Hifil)
 */

import React, { useState } from 'react';
import type { WordAnalysis } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';

interface DetectivePhase3wPreformativeProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

interface VowelOption {
  id: string;
  /** Hebrew vowel name */
  name: string;
  /** Visual representation (transliteration symbol) */
  symbol: string;
  /** Unicode Hebrew vowel character for display */
  unicode: string;
  /** What verb type this suggests (Lec. 8 table) */
  suggests: string;
}

const VOWEL_OPTIONS: VowelOption[] = [
  {
    id: 'qamets',
    name: 'Qamets',
    symbol: 'ā',
    unicode: 'בָ',
    suggests: 'II-Vocal (90%) o II-Duplicada — tema Qal o Hifil',
  },
  {
    id: 'tsere',
    name: 'Tsere',
    symbol: 'ē',
    unicode: 'בֵ',
    suggests: 'I-ו/י u ocasionalmente III-ה — tema Qal',
  },
  {
    id: 'jireq',
    name: 'Jireq',
    symbol: 'i',
    unicode: 'בִ',
    suggests: 'III-ה (Qal) o Qal/Nifal (si 3 radicales)',
  },
  {
    id: 'pataj',
    name: 'Pataj',
    symbol: 'a',
    unicode: 'בַ',
    suggests: 'III-ה (Qal o Hifil) o Hifil (con raíz fuerte después)',
  },
  {
    id: 'sheva',
    name: 'Shevá vocal',
    symbol: 'ə',
    unicode: 'בְ',
    suggests: 'Piel o Pual (si hay 3 radicales visibles). ⚠️ ¡OJO! Si el verbo inicia con Waw Consecutiva (וַ), el Shevá suele ser una reducción de la vocal original.',
  },
  {
    id: 'qamets-hatuf',
    name: 'Qamets-Hatuf',
    symbol: 'o',
    unicode: 'בָ֑',
    suggests: 'Hofal',
  },
  {
    id: 'jolem-vav',
    name: 'Jolem-Vav',
    symbol: 'ô',
    unicode: 'בֹו',
    suggests: 'I-ו — tema Nifal o Hifil',
  },
];

export const DetectivePhase3wPreformative: React.FC<DetectivePhase3wPreformativeProps> = ({
  word,
  onComplete,
}) => {
  const [selected, setSelected]   = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const selectedOption = VOWEL_OPTIONS.find(o => o.id === selected);

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={3}
        name="Vocal del Preformativo"
        question="¿Qué vocal tiene el preformativo de este verbo?"
      />

      {/* Lec. 8 reference hint */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          📖 <strong>Lección 8 (Farfán):</strong> La vocal bajo el preformativo del imperfecto
          es la clave más rápida para clasificar un verbo débil.
          Busca la vocal bajo la letra prefijada (י, ת, נ, א).
        </p>
      </div>

      {/* Vowel options */}
      {!submitted ? (
        <div className="space-y-2">
          {VOWEL_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                ${selected === opt.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-border hover:bg-muted/50'}
              `}
            >
              {/* Hebrew vowel example */}
              <span
                dir="rtl"
                lang="he"
                className="text-2xl font-serif w-10 text-center flex-shrink-0 text-foreground"
              >
                {opt.unicode}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${selected === opt.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'}`}>
                  {opt.name}
                  <span className="ml-1.5 text-xs font-mono text-muted-foreground">({opt.symbol})</span>
                </p>
                {selected === opt.id && (
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.suggests}</p>
                )}
              </div>
              {selected === opt.id && (
                <span className="text-indigo-500 font-bold text-sm flex-shrink-0">✓</span>
              )}
            </button>
          ))}

          <button
            disabled={!selected}
            onClick={handleSubmit}
            className="w-full mt-2 py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Verificar →
          </button>
        </div>
      ) : (
        /* Feedback panel */
        <div className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 space-y-2">
            <p className="text-indigo-700 dark:text-indigo-300 font-semibold text-sm">
              Vocal identificada: <strong>{selectedOption?.name} ({selectedOption?.symbol})</strong>
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">
              Según la tabla de Farfán (Lec. 8), esta vocal sugiere:
            </p>
            <p className="text-sm font-medium text-foreground bg-white dark:bg-card rounded-lg px-3 py-2 border border-indigo-100 dark:border-indigo-800">
              {selectedOption?.suggests}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Continuaremos verificando esta hipótesis en los siguientes pasos.
            </p>
          </div>

          <button
            onClick={() => onComplete(selected ?? '')}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
};
