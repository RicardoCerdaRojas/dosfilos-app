/**
 * DetectivePhase2Colors
 *
 * Phase 2: "Tirar los colores" — Student identifies the morphological
 * color sequence present in the verb following the Farfán color-coding
 * system documented in 1_codigo-colores.md.
 *
 * Color roles:
 *  🔵 Azul      → PREFIX_STEM / PREFORMATIVE
 *  ⚫ Gris       → ROOT_R1, ROOT_R2, ROOT_R3
 *  🟡 Ámbar     → THEME_VOWEL
 *  🔴 Rojo      → DAGESH_FORTE
 *  🟣 Violeta   → AFFORMATIVE / PRONOMINAL_SUFFIX
 */

import React, { useState } from 'react';
import type { WordAnalysis, MorphemeSegment } from '@dosfilos/domain';
import { MorphemeRole } from '@dosfilos/domain';
import { MorphemeSpan } from '../MorphemeSpan';
import { DetectiveHeroCard } from './DetectiveHeroCard';

interface DetectivePhase2ColorsProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

interface ColorOption {
  id: string;
  label: string;
  hex: string;
  description: string;
  checkFn: (morphemes: readonly MorphemeSegment[]) => boolean;
}

const COLOR_OPTIONS: ColorOption[] = [
  {
    id: 'prefix',
    label: 'Prefijo de Binyan (Verde)',
    hex: '#22c55e', // text-green-500
    description: 'Preformativos o prefijos característicos (נ, ה, י, ת, etc.)',
    checkFn: (ms) => ms.some(m => [MorphemeRole.PREFIX_STEM, MorphemeRole.PREFORMATIVE].includes(m.role)),
  },
  {
    id: 'root',
    label: 'Raíz Intacta',
    hex: '#64748b', // slate-500
    description: 'Letras radicales que contienen el significado base (sin color fonético)',
    checkFn: (ms) => ms.some(m => [MorphemeRole.ROOT_R1, MorphemeRole.ROOT_R2, MorphemeRole.ROOT_R3].includes(m.role)),
  },
  {
    id: 'dagesh',
    label: 'Dagesh Forte',
    hex: '#b91c1c', // text-red-700
    description: 'Duplicación de la consonante, típicamente en R2',
    checkFn: (ms) => ms.some(m => m.role === MorphemeRole.DAGESH_FORTE),
  },
  {
    id: 'vowel_a',
    label: 'Vocal Clase A (Rojo)',
    hex: '#ef4444',
    description: 'Pataj ( ַ ) o Qamets ( ָ )',
    checkFn: (ms) => ms.some(m => m.text.includes('\u05B7') || m.text.includes('\u05B8')),
  },
  {
    id: 'vowel_ei',
    label: 'Vocal Clase E/I (Verde)',
    hex: '#22c55e',
    description: 'Segol ( ֶ ), Tsere ( ֵ ) o Jireq ( ִ )',
    checkFn: (ms) => ms.some(m => m.text.includes('\u05B6') || m.text.includes('\u05B5') || m.text.includes('\u05B4')),
  },
  {
    id: 'vowel_ou',
    label: 'Vocal Clase O/U (Naranja)',
    hex: '#f97316', // text-orange-500
    description: 'Jolem ( ֹ ), Qibbuts ( ֻ ) o Shureq ( וּ )',
    checkFn: (ms) => ms.some(m => m.text.includes('\u05B9') || m.text.includes('\u05BB') || m.text.includes('\u05D5\u05BC')),
  },
  {
    id: 'sheva',
    label: 'Shevá / Reducidas (Púrpura)',
    hex: '#a855f7', // text-purple-500
    description: 'Shevá ( ְ ) y semivocales ( ֱ ,  ֲ ,  ֳ )',
    checkFn: (ms) => ms.some(m => m.text.includes('\u05B0') || m.text.includes('\u05B1') || m.text.includes('\u05B2') || m.text.includes('\u05B3')),
  },
];

/** Derive the "expected" sequence from the word's actual morphemes and text */
function deriveExpectedColorSequence(morphemes: readonly MorphemeSegment[]): string[] {
  const sequence: string[] = [];
  for (const option of COLOR_OPTIONS) {
    if (option.checkFn(morphemes)) {
      sequence.push(option.id);
    }
  }
  return sequence;
}

export const DetectivePhase2Colors: React.FC<DetectivePhase2ColorsProps> = ({ word, onComplete }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const expectedSequence = deriveExpectedColorSequence(word.morphemes ?? []);

  const toggleColor = (id: string) => {
    if (submitted) return;
    setSelected(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
  };

  const isCorrect = () => {
    const s = [...selected].sort().join(',');
    const e = [...expectedSequence].sort().join(',');
    return s === e;
  };

  const handleSubmit = () => {
    if (selected.length === 0) return;
    setSubmitted(true);
  };

  const answerLabel = selected.map(id => COLOR_OPTIONS.find(c => c.id === id)?.label ?? id).join(' + ');
  const correctLabel = expectedSequence.map(id => COLOR_OPTIONS.find(c => c.id === id)?.label ?? id).join(' + ');

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={2}
        name="Tirar los Colores"
        question="¿Qué colores morfológicos ves en este verbo?"
      />

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <strong>Recuerda:</strong> "Tirar los colores" significa identificar los elementos morfológicos
          presentes en el verbo — de derecha a izquierda. Selecciona todos los que veas.
        </p>
      </div>

      {!submitted ? (
        <div className="space-y-2">
          {COLOR_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => toggleColor(opt.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                ${selected.includes(opt.id)
                  ? 'border-[var(--sel-color)] bg-[var(--sel-color)]/10'
                  : 'border-border hover:bg-muted/50'}
              `}
              style={{ '--sel-color': opt.hex } as React.CSSProperties}
            >
              <span
                className="w-5 h-5 rounded-full flex-shrink-0"
                style={{ backgroundColor: opt.hex }}
              />
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
              {selected.includes(opt.id) && (
                <span className="text-xs font-bold" style={{ color: opt.hex }}>✓</span>
              )}
            </button>
          ))}

          <button
            disabled={selected.length === 0}
            onClick={handleSubmit}
            className="w-full mt-2 py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Verificar ({selected.length} seleccionados)
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isCorrect() ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ ¡Excelente! Identificaste correctamente los colores.
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
                Secuencia: <strong>{correctLabel}</strong>
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ No del todo. Revisa la secuencia correcta:
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                Tu respuesta: {answerLabel || '—'}
              </p>
              <p className="text-orange-700 dark:text-orange-300 text-xs font-semibold mt-1">
                Respuesta correcta: <strong>{correctLabel}</strong>
              </p>
            </div>
          )}
          <button
            onClick={() => onComplete(answerLabel)}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
};
