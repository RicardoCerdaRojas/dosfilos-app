import React, { useState } from 'react';
import { DetectivePhase, Person } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import { ProgressiveHintList } from './ProgressiveHintList';
import { useContextualHints } from '../../hooks/useContextualHints';
import type { WordAnalysis } from '@dosfilos/domain';

interface NominalPhasePersonProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

export const NominalPhasePerson: React.FC<NominalPhasePersonProps> = ({ word, onComplete }) => {
  const [selected, setSelected] = useState<Person | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { hints } = useContextualHints(word, DetectivePhase.NOMINAL_PERSON);

  const expectedPerson = word.nominalMorphology?.person;
  const isCorrect = selected === expectedPerson;

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
  };

  const handleContinue = () => {
    onComplete(selected!.toString());
  };

  const options = [
    { value: Person.FIRST, label: 'Primera (1ra)' },
    { value: Person.SECOND, label: 'Segunda (2da)' },
    { value: Person.THIRD, label: 'Tercera (3ra)' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={3}
        name="Persona"
        question="¿Cuál es la persona de este pronombre?"
      />

      <ProgressiveHintList hints={hints} />

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
                El pronombre está en {options.find(o => o.value === expectedPerson)?.label.toLowerCase()}.
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ No exactamente.
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                Este pronombre está en {options.find(o => o.value === expectedPerson)?.label.toLowerCase()}.
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
