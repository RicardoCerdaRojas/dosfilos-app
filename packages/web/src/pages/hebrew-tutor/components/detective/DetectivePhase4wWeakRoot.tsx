/**
 * DetectivePhase4wWeakRoot
 *
 * Weak Verb Path — Phase 4w: "¿Qué le sucede a la raíz?"
 *
 * The student identifies which radical is weak and how it behaves:
 * elision, assimilation, contraction, or vowel replacement.
 * This connects the visual observation to the formal grammatical
 * categories of Weak verb types (I-ו, I-נ, II-Vocal, III-ה, etc.)
 */

import React, { useState } from 'react';
import type { WordAnalysis } from '@dosfilos/domain';
import { VerbType } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';

interface DetectivePhase4wWeakRootProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

interface WeaknessOption {
  id: string;
  label: string;
  sublabel: string;
  example: string;
  /** VerbTypes that map to this weakness */
  verbTypes: string[];
}

const WEAKNESS_OPTIONS: WeaknessOption[] = [
  {
    id: 'R1-missing',
    label: 'R1 falta o se convierte en vocal',
    sublabel: 'El primer radical desaparece o se vocaliza',
    example: 'I-ו / I-י  →  יָלַד → יֵלֵד (R1 ו→ י desaparece)',
    verbTypes: [VerbType.I_YOD_WAW, VerbType.I_ALEF],
  },
  {
    id: 'R2-vowel',
    label: 'R2 es una vocal larga (sin consonante)',
    sublabel: 'El segundo radical se contrajo en una vocal',
    example: 'II-Vocal → קום → יָקוּם (R2 es ו vocálico)',
    verbTypes: [VerbType.II_WAW_YOD],
  },
  {
    id: 'R2-R3-same',
    label: 'R2 y R3 son la misma letra',
    sublabel: 'Geminación — el verbo II-Duplicada',
    example: 'II-Dup → סבב → יָסֹב (R2=R3=ב)',
    verbTypes: [VerbType.GEMINATE],
  },
  {
    id: 'R3-he',
    label: 'R3 falta (desaparece) o cambió a otra vocal/letra',
    sublabel: 'La 3ra radical (casi siempre ה o א) desapareció o mutó',
    example: 'III-ה → גלה → יִגְלֶה (ה mutó) o וַיִּגֶל (desapareció)',
    verbTypes: [VerbType.III_HE, VerbType.III_ALEF],
  },
  {
    id: 'R1-nun',
    label: 'R1 es נ que se asimila al siguiente',
    sublabel: 'Nun se absorbe y crea dagesh',
    example: 'I-נ → נתן → יִתֵּן (נ→ dagesh en ת)',
    verbTypes: [VerbType.I_NUN],
  },
  {
    id: 'uncertain',
    label: 'No estoy seguro del tipo de debilidad',
    sublabel: 'Continuaré con la información disponible',
    example: '',
    verbTypes: [],
  },
];

export const DetectivePhase4wWeakRoot: React.FC<DetectivePhase4wWeakRootProps> = ({
  word,
  onComplete,
}) => {
  const [selected, setSelected]   = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const expectedVerbType = word.verbMorphology?.verbType ?? '';

  const isCorrect = (): boolean => {
    if (!selected) return false;
    const opt = WEAKNESS_OPTIONS.find(o => o.id === selected);
    return opt?.verbTypes.includes(expectedVerbType) ?? false;
  };

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
  };

  const correctOption = WEAKNESS_OPTIONS.find(opt =>
    opt.verbTypes.includes(expectedVerbType),
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={4}
        name="Tipo de Debilidad"
        question="¿Qué le sucede a la raíz de este verbo?"
      />

      {/* Hint */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
        <p className="text-xs text-amber-800 dark:text-amber-300">
          🔎 <strong>Observa:</strong> Descuenta los prefijos (en color). Luego, compara las letras restantes con la raíz original prestando atención a R1, R2 y R3 en ese orden.
          ¿Qué radical exacto es el que falta, mutó o se contrajo en el verbo que estás analizando?
        </p>
      </div>

      {/* Options */}
      {!submitted ? (
        <div className="space-y-2">
          {WEAKNESS_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`
                w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                ${selected === opt.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-border hover:bg-muted/50'}
              `}
            >
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${selected === opt.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.sublabel}</p>
                {selected === opt.id && opt.example && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1.5 font-mono">
                    → {opt.example}
                  </p>
                )}
              </div>
              {selected === opt.id && (
                <span className="text-indigo-500 font-bold text-sm flex-shrink-0 mt-0.5">✓</span>
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
        /* Feedback */
        <div className="space-y-4">
          {isCorrect() ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ ¡Correcto! Identificaste bien el tipo de debilidad.
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-2">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                No exactamente. La debilidad principal es:
              </p>
              <p className="text-sm font-medium text-foreground">
                {correctOption?.label ?? 'Debilidad mixta'}
              </p>
              {correctOption?.example && (
                <p className="text-xs font-mono text-orange-600 dark:text-orange-400">
                  → {correctOption.example}
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => {
              // The Panel's evaluateAnswer for WEAK_ROOT compares userAnswer === morph.verbType.
              // Send the verbType of the matched option so the panel can score correctly.
              const matched = WEAKNESS_OPTIONS.find(o => o.id === selected);
              const matchedVerbType = matched?.verbTypes.find(vt => vt === expectedVerbType);
              onComplete(matchedVerbType ?? selected ?? 'uncertain');
            }}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
};
