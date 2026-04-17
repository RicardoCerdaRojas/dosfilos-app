import React, { useState } from 'react';
import { DetectivePhase, NominalState } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import { HintList } from './HintList';
import { useContextualHints } from '../../hooks/useContextualHints';
import type { WordAnalysis } from '@dosfilos/domain';

interface NominalPhase5StateProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

export const NominalPhase5State: React.FC<NominalPhase5StateProps> = ({ word, onComplete }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { hints } = useContextualHints(word, DetectivePhase.NOMINAL_STATE);

  const expectedState = word.nominalMorphology?.state;
  const isCorrect = selected === expectedState;

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
  };

  const handleContinue = () => {
    onComplete(selected!);
  };

  const options = [
    { value: NominalState.ABSOLUTE, label: 'Absoluto', description: 'Forma independiente' },
    { value: NominalState.CONSTRUCT, label: 'Constructo', description: 'Unido a la siguiente palabra' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={5}
        name="Estado"
        question="¿En qué estado se encuentra esta palabra?"
      />

      <HintList hints={hints} />

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
            Verificar respuesta
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isCorrect ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ ¡Correcto!
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed">
                Está en estado {options.find(o => o.value === expectedState)?.label.toLowerCase()}.
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ No exactamente.
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                El estado correcto es {options.find(o => o.value === expectedState)?.label.toLowerCase()}.
              </p>
            </div>
          )}
          <button
            onClick={handleContinue}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
};
