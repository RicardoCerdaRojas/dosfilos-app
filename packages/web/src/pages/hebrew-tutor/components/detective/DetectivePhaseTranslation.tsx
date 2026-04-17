/**
 * DetectivePhaseTranslation
 *
 * Final synthesis phase — both strong and weak paths.
 *
 * After completing all morphological analysis steps, the student
 * demonstrates understanding by selecting the correct contextual
 * translation of the verb from a list of four options.
 *
 * The correct answer is `word.translation`.
 * Distractors are generated in runtime from available word data
 * and cover four intentional error patterns:
 *   1. Lexical gloss (meaning of root, not conjugated form)
 *   2. Wrong person or number (e.g. plural instead of singular)
 *   3. Wrong tense/aspect (future instead of narrative past)
 *   4. Alternative root synonym (plausible but incorrect)
 */

import React, { useState, useMemo } from 'react';
import type { WordAnalysis } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';

interface DetectivePhaseTranslationProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

interface TranslationOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

/** Shuffles an array in place using Fisher-Yates. */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates three plausible distractors from the word's available metadata.
 * Each distractor targets a distinct conceptual error so feedback is specific.
 */
function buildDistractors(word: WordAnalysis): string[] {
  const morph = word.verbMorphology;
  const distractors: string[] = [];

  // Error type 1: Lexical gloss — student confuses root meaning with contextual form
  if (word.rootMeaning && word.rootMeaning !== word.translation) {
    distractors.push(word.rootMeaning);
  } else if (word.lemmaGloss && word.lemmaGloss !== word.translation) {
    distractors.push(word.lemmaGloss);
  }

  // Error type 2: Wrong person / number — based on temporal value hints
  if (morph) {
    const temporalBase = morph.temporalValue ?? '';
    // Generate a plausible plural or different-person variant
    if (word.translation.startsWith('y ') || word.translation.startsWith('Y ')) {
      distractors.push(word.translation.replace(/^(y |Y )/, 'y ellos '));
    } else {
      distractors.push(`ellos ${word.translation}`);
    }

    // Error type 3: Wrong tense — replace narrative past hint with future
    if (temporalBase.toLowerCase().includes('narrativo') || temporalBase.toLowerCase().includes('pasado')) {
      // Strip leading conjunction if any and convert to a future-sounding form
      const stripped = word.translation.replace(/^(y |Y )/, '');
      distractors.push(`${stripped}á`);
    } else if (temporalBase.toLowerCase().includes('futuro') || temporalBase.toLowerCase().includes('imperfecto')) {
      const stripped = word.translation.replace(/^(y |Y )/, '');
      distractors.push(`${stripped}ó`);
    }
  }

  // Error type 4: Fallback — syntactic function misread
  if (word.syntacticFunction && word.syntacticFunction !== word.translation) {
    distractors.push(`(${word.syntacticFunction})`);
  }

  // Deduplicate and remove anything equal to the correct translation
  const unique = [...new Set(distractors)].filter(d => d !== word.translation);

  // Pad to exactly 3 if needed with generic academic distractors
  const fallbacks = [
    'ser, estar',
    'él habló',
    'y sucedió que',
    'acontecer',
  ];
  let idx = 0;
  while (unique.length < 3 && idx < fallbacks.length) {
    const fb = fallbacks[idx++];
    if (fb !== word.translation && !unique.includes(fb)) unique.push(fb);
  }

  return unique.slice(0, 3);
}

export const DetectivePhaseTranslation: React.FC<DetectivePhaseTranslationProps> = ({
  word,
  onComplete,
}) => {
  const [selected, setSelected]   = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const correct = word.translation;

  const options: TranslationOption[] = useMemo(() => {
    const distractors = buildDistractors(word);
    const all: TranslationOption[] = [
      { id: 'correct', text: correct, isCorrect: true },
      ...distractors.map((d, i) => ({ id: `d${i}`, text: d, isCorrect: false })),
    ];
    return shuffle(all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.hebrewText]);

  const isCorrect = selected === correct;

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={6}
        name="Traducción Contextual"
        question="Ahora que analizaste el verbo completo, ¿cómo lo traduce al español en este contexto?"
      />

      {/* Instructional hint */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
        <p className="text-xs text-amber-800 dark:text-amber-300">
          <strong>Recuerda:</strong> La traducción contextual no es solo el significado del lexema (raíz),
          sino la forma verbal completa con su tiempo, persona y número en el versículo.
        </p>
      </div>

      {!submitted ? (
        <div className="space-y-2">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.text)}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all
                ${selected === opt.text
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-border hover:bg-muted/50'}
              `}
            >
              {/* Radio indicator */}
              <span className={`
                w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                ${selected === opt.text
                  ? 'border-indigo-500 bg-indigo-500'
                  : 'border-muted-foreground'}
              `}>
                {selected === opt.text && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </span>
              <span
                dir="auto"
                className={`text-sm font-medium ${
                  selected === opt.text
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-foreground'
                }`}
              >
                {opt.text}
              </span>
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
        /* Feedback */
        <div className="space-y-4">
          {isCorrect ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-1">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                Correcto. Esa es la traducción contextual del verbo.
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Lograste cerrar el ciclo completo: identificación morfológica → traducción contextual.
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-2">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                No exactamente. La traducción contextual correcta es:
              </p>
              <p className="text-base font-bold text-foreground">
                "{correct}"
              </p>
              <p className="text-xs text-muted-foreground">
                Recuerda integrar el tiempo verbal ({word.verbMorphology?.temporalValue ?? 'forma verbal'}),
                la persona y el número al momento de traducir.
              </p>
            </div>
          )}

          <button
            onClick={() => onComplete(selected ?? '')}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            Ver resultado final →
          </button>
        </div>
      )}
    </div>
  );
};
