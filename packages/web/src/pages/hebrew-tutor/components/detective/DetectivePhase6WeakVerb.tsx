/**
 * DetectivePhase6WeakVerb
 *
 * Phase 6 — Lección 8: Strong vs. Weak verb classification.
 *
 * Decision tree:
 *   A) If 3 radicals visible → it's STRONG
 *   B) If only 2 radicals visible → weak. Preformative vowel determines type:
 *      - Qamets (open syllable) → II-Vowel (90%) | Geminate (10%)
 *      - Tsere               → I-Waw/Yod or III-He
 *      - Hireq               → III-He
 *      - Patah               → III-He or Hifil
 *      - Holem-vav           → I-Waw/Yod (Nifal or Hifil)
 */

import React, { useState } from 'react';
import type { WordAnalysis } from '@dosfilos/domain';
import { VerbType } from '@dosfilos/domain';
import { MorphemeSpan } from '../MorphemeSpan';

interface DetectivePhase6WeakVerbProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

interface WeakTypeOption {
  type: VerbType;
  label: string;
  rootTemplate: string;
  description: string;
  indicator: string; // what to look for
}

const STRONG: WeakTypeOption = {
  type: VerbType.STRONG,
  label: 'Fuerte',
  rootTemplate: 'פָּעַל',
  description: 'Tres radicales visibles, sin debilidades fonológicas',
  indicator: 'Las 3 radicales están presentes e intactas',
};

const WEAK_OPTIONS: WeakTypeOption[] = [
  {
    type: VerbType.I_ALEF,
    label: 'I-Alef',
    rootTemplate: 'אָ_ַל',
    description: 'Primera radical es Alef (א) — tiende a quiescerse',
    indicator: 'La raíz inicia con א',
  },
  {
    type: VerbType.I_NUN,
    label: 'I-Nun',
    rootTemplate: 'נָ_ַל',
    description: 'Primera radical es Nun (נ) — asimila al siguiente consonante',
    indicator: 'La raíz inicia con נ; se pierde con dagesh de asimilación',
  },
  {
    type: VerbType.I_YOD_WAW,
    label: 'I-Waw/Yod',
    rootTemplate: 'יָ_ַל',
    description: 'Primera radical es Waw o Yod — se debilita o cae en ciertos paradigmas',
    indicator: 'Vocal tsere bajo el preformativo; solo 2 radicales visibles',
  },
  {
    type: VerbType.II_WAW_YOD,
    label: 'II-Vocal (Hueco)',
    rootTemplate: 'קּוּם',
    description: 'Segunda radical es Waw o Yod — forma el núcleo vocálico de la raíz',
    indicator: 'Vocal larga en el núcleo (qamets en sílaba abierta bajo preformativo)',
  },
  {
    type: VerbType.III_HE,
    label: 'III-He',
    rootTemplate: 'גָּלָה',
    description: 'Tercera radical es He (ה) — aparece como vocal en muchas formas',
    indicator: 'Tsere o hireq bajo preformativo; solo 2 radicales + vocal',
  },
  {
    type: VerbType.III_ALEF,
    label: 'III-Alef',
    rootTemplate: 'מָצָא',
    description: 'Tercera radical es Alef (א) — tiende a quiescerse',
    indicator: 'La raíz termina en א',
  },
  {
    type: VerbType.GEMINATE,
    label: 'Geminado (Doble)',
    rootTemplate: 'סָבַב',
    description: 'Segunda y tercera radical son idénticas — solo 2 distintas visibles',
    indicator: 'Qamets en sílaba abierta bajo preformativo (10%); R2=R3',
  },
  {
    type: VerbType.GUTURAL_R1,
    label: 'Gutural R1',
    rootTemplate: 'עָמַד',
    description: 'Primera radical es gutural (א ה ח ע ר) — afecta vocales adyacentes',
    indicator: 'Vocal compuesta (hatef) bajo la gutural en lugar de shevá simple',
  },
  {
    type: VerbType.GUTURAL_R2,
    label: 'Gutural R2',
    rootTemplate: 'בָּחַר',
    description: 'Segunda radical es gutural — impide dagesh forte, causa compensación',
    indicator: 'Sin dagesh forte a pesar de ser Piel/Pual; vocal compensatoria larga',
  },
  {
    type: VerbType.GUTURAL_R3,
    label: 'Gutural R3',
    rootTemplate: 'שָׁמַע',
    description: 'Tercera radical es gutural — afecta patah furtivo y vocales finales',
    indicator: 'Patah furtivo antes de la gutural final',
  },
];

export const DetectivePhase6WeakVerb: React.FC<DetectivePhase6WeakVerbProps> = ({ word, onComplete }) => {
  const [isWeak, setIsWeak] = useState<boolean | null>(null);
  const [selectedType, setSelectedType] = useState<VerbType | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const expectedType = word.verbMorphology?.verbType ?? VerbType.STRONG;
  const isExpectedStrong = expectedType === VerbType.STRONG;

  const finalAnswer = isWeak === false ? VerbType.STRONG : selectedType;
  const isCorrect = finalAnswer === expectedType;
  const correctOption = isExpectedStrong
    ? STRONG
    : WEAK_OPTIONS.find(o => o.type === expectedType);

  const canSubmit = isWeak === false || (isWeak === true && selectedType !== null);

  // The preformative vowel table from Lección 8
  const preformativeTable = [
    { vowel: 'Qamets (ā)', types: 'II-Vocal (90%) o Geminado (10%)' },
    { vowel: 'Tsere (ē)', types: 'I-Waw/Yod o III-He' },
    { vowel: 'Hireq (i)', types: 'III-He' },
    { vowel: 'Patah (a)', types: 'III-He o Hifil' },
    { vowel: 'Jolem-vav (ō)', types: 'I-Waw/Yod (Nifal/Hifil)' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
          Fase 6 · Clasificación Final (Lección 8)
        </p>
        <h3 className="text-base font-semibold text-foreground">
          Revisión de Consonantes
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2 leading-snug">
          Sabemos que no perdió letras visibles (Fase 2), pero ¿acaso de sus 3 letras incluye alguna consonante gutural o débil que alteró las vocales?
        </p>
      </div>

      {/* The verb */}
      <div className="bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/30 dark:to-slate-950/30 rounded-2xl p-6 text-center">
        <div dir="rtl" lang="he" className="text-5xl font-serif leading-relaxed mb-2 text-foreground">
          {word.morphemes && word.morphemes.length > 0 ? (
            <MorphemeSpan segments={word.morphemes} variant="text" />
          ) : (
            word.hebrewText
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Raíz: <span dir="rtl" lang="he" className="font-serif">{word.root}</span> — {word.rootMeaning}
        </p>
      </div>

      {!submitted ? (
        <div className="space-y-4">
          {/* Step A: Strong or Weak? */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setIsWeak(false); setSelectedType(null); }}
              className={`
                py-3 rounded-xl border-2 font-semibold text-sm transition-all
                ${isWeak === false
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                  : 'border-border hover:bg-muted/50'}
              `}
            >
              💪 Fuerte Puro
              <p className="text-xs font-normal text-muted-foreground mt-0.5 px-2">Sin letras débiles ni guturales</p>
            </button>
            <button
              onClick={() => setIsWeak(true)}
              className={`
                py-3 rounded-xl border-2 font-semibold text-sm transition-all
                ${isWeak === true
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
                  : 'border-border hover:bg-muted/50'}
              `}
            >
              🧲 Con Irregularidad
              <p className="text-xs font-normal text-muted-foreground mt-0.5 px-2">Contiene gutural, alef o debilidad</p>
            </button>
          </div>

          {/* Step B: Weak type + Lección 8 table */}
          {isWeak === true && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Lección 8 preformative vowel reference */}
              <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-xl p-3">
                <p className="text-xs font-semibold text-violet-800 dark:text-violet-300 mb-2">
                  📖 Lección 8 — Clave por vocal del preformativo:
                </p>
                <div className="space-y-1">
                  {preformativeTable.map(row => (
                    <div key={row.vowel} className="flex items-start gap-2 text-xs">
                      <span className="text-violet-600 dark:text-violet-400 font-semibold w-28 flex-shrink-0">{row.vowel}</span>
                      <span className="text-muted-foreground">→ {row.types}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {WEAK_OPTIONS.map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => setSelectedType(opt.type)}
                    className={`
                      w-full flex items-start gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all
                      ${selectedType === opt.type
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                        : 'border-border hover:border-indigo-300 hover:bg-muted/50'}
                    `}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span dir="rtl" lang="he" className="font-serif text-sm text-primary">{opt.rootTemplate}</span>
                        <span className="font-semibold text-xs text-foreground">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.indicator}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            disabled={!canSubmit}
            onClick={() => setSubmitted(true)}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Verificar clasificación
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isCorrect ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ ¡Clasificación correcta! Verbo <strong>{correctOption?.label}</strong>.
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
                {correctOption?.description}
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗ La clasificación correcta es: <strong>{correctOption?.label}</strong>
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                {correctOption?.description}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                <strong>Indicador clave:</strong> {correctOption?.indicator}
              </p>
            </div>
          )}
          <button
            onClick={() => onComplete(finalAnswer ?? VerbType.STRONG)}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors"
          >
            Ver resumen final →
          </button>
        </div>
      )}
    </div>
  );
};
