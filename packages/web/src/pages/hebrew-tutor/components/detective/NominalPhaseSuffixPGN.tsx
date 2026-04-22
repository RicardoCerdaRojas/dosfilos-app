import React, { useState } from 'react';
import { DetectivePhase, Person, Gender, GrammaticalNumber } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import { ProgressiveHintList } from './ProgressiveHintList';
import { useContextualHints } from '../../hooks/useContextualHints';
import type { WordAnalysis } from '@dosfilos/domain';

interface NominalPhaseSuffixPGNProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

export const NominalPhaseSuffixPGN: React.FC<NominalPhaseSuffixPGNProps> = ({ word, onComplete }) => {
  const [person, setPerson] = useState<Person | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [number, setNumber] = useState<GrammaticalNumber | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { hints } = useContextualHints(word, DetectivePhase.NOMINAL_SUFFIX);

  const expectedSuffix = word.nominalMorphology?.suffix;
  const selectedAnswer = `${person}${gender}${number}`;
  const expectedAnswer = expectedSuffix ? `${expectedSuffix.person}${expectedSuffix.gender}${expectedSuffix.number}` : '';
  const isCorrect = selectedAnswer === expectedAnswer;

  const handleSubmit = () => {
    if (!person || !gender || !number) return;
    setSubmitted(true);
  };

  const handleContinue = () => {
    onComplete(selectedAnswer);
  };

  const isComplete = person && gender && number;

  const getLabel = (p: Person, g: Gender, n: GrammaticalNumber) => {
    const pStr = p === Person.FIRST ? '1ra' : p === Person.SECOND ? '2da' : '3ra';
    const gStr = g === Gender.MASCULINE ? 'Masc.' : g === Gender.FEMININE ? 'Fem.' : 'Común';
    const nStr = n === GrammaticalNumber.SINGULAR ? 'Sing.' : n === GrammaticalNumber.PLURAL ? 'Plural' : 'Dual';
    return `${pStr} ${gStr} ${nStr}`;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={7}
        name="Sufijo Pronominal"
        question="¿Cuál es la Persona, Género y Número (PGN) del sufijo pronominal?"
      />

      <ProgressiveHintList hints={hints} />

      {!submitted ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Persona</label>
              {[Person.FIRST, Person.SECOND, Person.THIRD].map(p => (
                <button
                  key={p}
                  onClick={() => setPerson(p)}
                  className={`w-full py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-colors
                    ${person === p ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' : 'border-border hover:border-indigo-300 text-muted-foreground'}`}
                >
                  {p === Person.FIRST ? '1ra' : p === Person.SECOND ? '2da' : '3ra'}
                </button>
              ))}
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Género</label>
              {[Gender.MASCULINE, Gender.FEMININE, Gender.COMMON].map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`w-full py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-colors
                    ${gender === g ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' : 'border-border hover:border-indigo-300 text-muted-foreground'}`}
                >
                  {g === Gender.MASCULINE ? 'Masc.' : g === Gender.FEMININE ? 'Fem.' : 'Común'}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Número</label>
              {[GrammaticalNumber.SINGULAR, GrammaticalNumber.PLURAL, GrammaticalNumber.DUAL].map(n => (
                <button
                  key={n}
                  onClick={() => setNumber(n)}
                  className={`w-full py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-colors
                    ${number === n ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' : 'border-border hover:border-indigo-300 text-muted-foreground'}`}
                >
                  {n === GrammaticalNumber.SINGULAR ? 'Sing.' : n === GrammaticalNumber.PLURAL ? 'Plur.' : 'Dual'}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!isComplete}
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                El PGN del sufijo es {expectedSuffix && getLabel(expectedSuffix.person, expectedSuffix.gender, expectedSuffix.number)}.
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ No exactamente.
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                El PGN del sufijo es {expectedSuffix && getLabel(expectedSuffix.person, expectedSuffix.gender, expectedSuffix.number)}.
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
