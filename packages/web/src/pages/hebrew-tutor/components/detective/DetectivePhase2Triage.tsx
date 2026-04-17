/**
 * DetectivePhase2Triage
 *
 * Phase 2 — "Triage": The student visually counts the root radicals
 * they can identify. This observation is the decision point that
 * sends them down the Strong Verb or Weak Verb investigation path.
 *
 * Pedagogical note:
 *  A strong verb shows all 3 root radicals clearly.
 *  A weak verb has at least one radical that elides, assimilates,
 *  or is replaced by a vowel (I-ו, II-vocal, III-ה, etc.).
 */

import React, { useState } from 'react';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import type { WordAnalysis } from '@dosfilos/domain';

interface DetectivePhase2TriageProps {
  word: WordAnalysis;
  /** Called with 'strong' or 'weak' when the student confirms their observation */
  onComplete: (answer: string) => void;
}

interface TriageOption {
  id: 'three' | 'two' | 'one-or-none';
  label: string;
  sublabel: string;
  emoji: string;
  hint: string;
}

const OPTIONS: TriageOption[] = [
  {
    id: 'three',
    label: 'Veo 3 radicales claras',
    sublabel: 'Todas las letras de la raíz están presentes',
    emoji: '💪',
    hint: 'Ejemplo: כָּתַב → ك-ت-ب (k-t-b) todas visibles',
  },
  {
    id: 'two',
    label: 'Solo veo 2 radicales',
    sublabel: 'Una radical parece faltar o estar oculta',
    emoji: '🔍',
    hint: 'Puede ser un verbo débil — la raíz se contrajo',
  },
  {
    id: 'one-or-none',
    label: 'Veo 1 radical o ninguna',
    sublabel: 'La forma está muy contraída',
    emoji: '⚠️',
    hint: 'Verbo débil — requiere la tabla de la Lección 8',
  },
];

/** Map from triage option to investigation path */
const PATH_MAP: Record<TriageOption['id'], 'strong' | 'weak'> = {
  'three':       'strong',
  'two':         'weak',
  'one-or-none': 'weak',
};

export const DetectivePhase2Triage: React.FC<DetectivePhase2TriageProps> = ({ word, onComplete }) => {
  const [selected, setSelected] = useState<TriageOption['id'] | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    const path = PATH_MAP[selected];
    onComplete(path);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={2}
        name="Reconocimiento de Raíz"
        question="¿Cuántas letras radicales puedes identificar?"
      />

      {/* Hint */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
        <p className="text-xs text-amber-800 dark:text-amber-300">
          <strong>Clave:</strong> Un verbo hebreo tiene 3 radicales (R1, R2, R3).
          Los verbos <em>fuertes</em> las muestran todas.
          Los verbos <em>débiles</em> pueden perder, contraer o transformar alguna de ellas.
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {OPTIONS.map(opt => (
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
            <span className="text-2xl mt-0.5 flex-shrink-0">{opt.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${selected === opt.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.sublabel}</p>
              {selected === opt.id && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1.5 italic">
                  → {opt.hint}
                </p>
              )}
            </div>
            {selected === opt.id && (
              <span className="text-indigo-500 font-bold text-sm flex-shrink-0 mt-0.5">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Path preview label */}
      {selected && (
        <div className={`
          rounded-xl p-3 text-xs font-medium animate-in fade-in duration-200
          ${PATH_MAP[selected] === 'strong'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'}
        `}>
          {PATH_MAP[selected] === 'strong' ? (
            <>💪 <strong>Camino Verbo Fuerte:</strong> Tiraremos los colores morfológicos (Lec. 1-7)</>
          ) : (
            <>🔬 <strong>Camino Verbo Débil:</strong> Usaremos la tabla de la vocal del preformativo (Lec. 8)</>
          )}
        </div>
      )}

      {/* Confirm button */}
      <button
        disabled={!selected}
        onClick={handleConfirm}
        className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Continuar investigación →
      </button>
    </div>
  );
};
