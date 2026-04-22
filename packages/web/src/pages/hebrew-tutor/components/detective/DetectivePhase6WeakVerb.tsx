/**
 * DetectivePhase6WeakVerb — used for the STRONG_CONFIRM phase
 *
 * Phase 6: Confirm the verb's final classification after the strong-path
 * investigation. Asks the student two targeted questions:
 *
 *   Level 1: "Are all 3 radicals visibly intact?"
 *     → No  → means it IS a weak verb (miscategorized by triage — rare edge)
 *     → Yes → continue to Level 2
 *
 *   Level 2: "Is any radical a guttural consonant?"
 *     → No  → STRONG (pure strong)
 *     → Yes → GUTURAL_R1 / R2 / R3 (strong with phonological compensations)
 *
 * This 2-level structure is pedagogically consistent with the TRIAGE:
 * guturals are classified as "strong" (3 radicals intact) while teaching
 * their unique compensatory rules in a dedicated sub-step.
 *
 * Gutural compensatory rules (always shown for gutural verbs):
 *  1. Cannot take dagesh forte → vocal compensation (lengthening or hatef)
 *  2. Prefers Class-A vowels (patah/qamets) in adjacent positions
 *  3. Takes composite sheva (hatef) instead of simple sheva
 */

import React, { useState } from 'react';
import type { WordAnalysis } from '@dosfilos/domain';
import { VerbType } from '@dosfilos/domain';
import { MorphemeSpan } from '../MorphemeSpan';

interface DetectivePhase6WeakVerbProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

import { useTranslation } from 'react-i18next';

// ── Gutural classification options ───────────────────────────────────────────

interface GutturalOption {
  type: VerbType;
  label: string;
  rootTemplate: string;
  description: string;
  indicator: string;
}

const getGutturalOptions = (t: any): GutturalOption[] => [
  {
    type: VerbType.STRONG,
    label: t('detective.phase6.options.strong.label', { defaultValue: 'Ninguna — Fuerte Puro' }),
    rootTemplate: 'פָּקַד',
    description: t('detective.phase6.options.strong.desc', { defaultValue: 'La raíz no contiene ninguna letra gutural.' }),
    indicator: t('detective.phase6.options.strong.indicator', { defaultValue: 'Comportamiento regular en todas sus conjugaciones.' }),
  },
  {
    type: VerbType.GUTURAL_R1,
    label: t('detective.phase6.options.r1.label', { defaultValue: 'Gutural en R1 (Pe)' }),
    rootTemplate: 'עָמַד',
    description: t('detective.phase6.options.r1.desc', { defaultValue: 'Primera radical de la raíz es gutural (א ה ח ע ר).' }),
    indicator: t('detective.phase6.options.r1.indicator', { defaultValue: 'Efecto común: Rechaza shevá simple inicial y prefiere shevá compuesto (hatef), aunque a veces la gutural queda silente (quiescente).' }),
  },
  {
    type: VerbType.GUTURAL_R2,
    label: t('detective.phase6.options.r2.label', { defaultValue: 'Gutural en R2 (Ayin)' }),
    rootTemplate: 'בָּחַר',
    description: t('detective.phase6.options.r2.desc', { defaultValue: 'Segunda radical de la raíz es gutural.' }),
    indicator: t('detective.phase6.options.r2.indicator', { defaultValue: 'Efecto común: Impide dagesh forte en Piel/Pual/Hitpael, forzando alargamiento compensatorio de la vocal anterior.' }),
  },
  {
    type: VerbType.GUTURAL_R3,
    label: t('detective.phase6.options.r3.label', { defaultValue: 'Gutural en R3 (Lamed)' }),
    rootTemplate: 'שָׁמַע',
    description: t('detective.phase6.options.r3.desc', { defaultValue: 'Tercera radical de la raíz es gutural.' }),
    indicator: t('detective.phase6.options.r3.indicator', { defaultValue: 'Efecto común: Exige una vocal Clase-A (pataj) antes de ella, a veces insertando un "pataj furtivo" al final de la palabra.' }),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export const DetectivePhase6WeakVerb: React.FC<DetectivePhase6WeakVerbProps> = ({ word, onComplete }) => {
  const { t } = useTranslation('hebrewTutor');
  // Level 1: do all 3 radicals appear intact?
  const [radicalsIntact, setRadicalsIntact] = useState<boolean | null>(null);
  // Level 2: which guttural type (or STRONG for none)
  const [selectedType, setSelectedType]     = useState<VerbType | null>(null);
  const [submitted, setSubmitted]           = useState(false);

  const gutturalOptions = getGutturalOptions(t);
  
  // Normalize the expected type for this Strong/Guttural check.
  // Since the Triage now correctly routes weak verbs to the Weak path,
  // this phase will ONLY receive: STRONG, I_ALEF, GUTURAL_R1/R2/R3.
  let expectedType = (word.verbMorphology?.verbType as VerbType | undefined) ?? VerbType.STRONG;

  // Normalize Alef types to their corresponding guttural positions
  if (expectedType === VerbType.I_ALEF) expectedType = VerbType.GUTURAL_R1;
  if (expectedType === VerbType.III_ALEF) expectedType = VerbType.GUTURAL_R3;

  const isGutturalType  = expectedType === VerbType.GUTURAL_R1 ||
                          expectedType === VerbType.GUTURAL_R2 ||
                          expectedType === VerbType.GUTURAL_R3;

  // ── Evaluation logic ────────────────────────────────────────────────────
  // Simple and clean: the student says radicals are intact (they should be,
  // since only strong/guttural verbs reach this phase), then identifies
  // the guttural type or confirms it's a pure strong verb.

  let isCorrect = false;
  let correctLabel = gutturalOptions.find(o => o.type === expectedType) ?? gutturalOptions[0];

  if (radicalsIntact === false) {
    // Wrong — all radicals ARE intact for strong/guttural verbs
    isCorrect = false;
    correctLabel = gutturalOptions.find(o => o.type === expectedType) ?? gutturalOptions[0];
  } else if (radicalsIntact === true) {
    // Correct first step — now check if they identified the right type
    isCorrect = selectedType === expectedType;
    if (!isCorrect) {
      correctLabel = gutturalOptions.find(o => o.type === expectedType) ?? gutturalOptions[0];
    }
  }

  // Final answer for the summary panel
  const finalAnswer = radicalsIntact === false ? expectedType : (selectedType ?? VerbType.STRONG);
  const canSubmit    = radicalsIntact !== null && (radicalsIntact === false || selectedType !== null);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Phase header */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
          {t('detective.phase6.title', { defaultValue: 'Fase 6 · Confirmación Final' })}
        </p>
        <h3 className="text-base font-semibold text-foreground">
          {t('detective.phase6.subtitle', { defaultValue: 'Revisión de Consonantes' })}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2 leading-snug"
           dangerouslySetInnerHTML={{ __html: t('detective.phase6.intro', { defaultValue: 'Ya confirmamos que el TRIAGE clasificó este verbo como <strong>fuerte</strong> (3 radicales visibles). Ahora precisemos si alguna de ellas es gutural.' }) }} />
      </div>

      {/* The verb display */}
      <div className="bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/30 dark:to-slate-950/30 rounded-2xl p-6 text-center">
        <div dir="rtl" lang="he" className="text-5xl font-hebrew leading-relaxed mb-2 text-foreground">
          {word.morphemes && word.morphemes.length > 0 ? (
            <MorphemeSpan segments={word.morphemes} variant="text" />
          ) : (
            word.hebrewText
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('detective.phase6.rootLabel', { defaultValue: 'Raíz:' })} <span dir="rtl" lang="he" className="font-hebrew">{word.root}</span> — {word.rootMeaning}
        </p>
      </div>

      {!submitted ? (
        <div className="space-y-4">

          {/* ── Level 1: Radicals intact ─────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('detective.phase6.level1.question', { defaultValue: 'Nivel 1 — ¿Están las 3 radicales visibles e intactas?' })}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setRadicalsIntact(true); setSelectedType(null); }}
                className={`
                  py-3 rounded-xl border-2 font-semibold text-sm transition-all
                  ${radicalsIntact === true
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-border hover:bg-muted/50 text-foreground'}
                `}
              >
                {t('detective.phase6.level1.yes.label', { defaultValue: '✓ Sí, las 3 están' })}
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{t('detective.phase6.level1.yes.desc', { defaultValue: 'Ninguna letra desaparece' })}</p>
              </button>
              <button
                onClick={() => { setRadicalsIntact(false); setSelectedType(VerbType.STRONG); }}
                className={`
                  py-3 rounded-xl border-2 font-semibold text-sm transition-all
                  ${radicalsIntact === false
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
                    : 'border-border hover:bg-muted/50 text-foreground'}
                `}
              >
                {t('detective.phase6.level1.no.label', { defaultValue: '✗ Falta alguna' })}
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{t('detective.phase6.level1.no.desc', { defaultValue: 'Una radical cae o asimila' })}</p>
              </button>
            </div>
          </div>

          {/* ── Level 2: Guttural check (only if radicals intact) ────────── */}
          {radicalsIntact === true && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('detective.phase6.level2.question', { defaultValue: 'Nivel 2 — ¿Alguna radical es gutural (א ה ח ע ר)?' })}
              </p>

              {/* Educational hint box */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-semibold">{t('detective.phase6.level2.hint.title', { defaultValue: '📘 Las guturales alteran vocales adyacentes, pero NO eliminan radicales.' })}</p>
                <p dangerouslySetInnerHTML={{ __html: t('detective.phase6.level2.hint.subtitle', { defaultValue: 'Por eso el TRIAGE las clasifica como <strong>fuertes</strong>, aunque con compensaciones:' }) }} />
                <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400 mt-1">
                  <li>{t('detective.phase6.level2.hint.bullet1', { defaultValue: 'No aceptan dagesh forte → vocal compensatoria larga' })}</li>
                  <li>{t('detective.phase6.level2.hint.bullet2', { defaultValue: 'Prefieren vocales Clase-A (pataj/qamets) en posiciones adyacentes' })}</li>
                  <li>{t('detective.phase6.level2.hint.bullet3', { defaultValue: 'Toman shevá compuesto (hatef) en vez de shevá simple' })}</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                {gutturalOptions.map(opt => (
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span dir="rtl" lang="he" className="font-hebrew text-sm text-primary">{opt.rootTemplate}</span>
                        <span className="font-semibold text-xs text-foreground">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.indicator}</p>
                    </div>
                    {selectedType === opt.type && (
                      <span className="text-indigo-500 font-bold text-sm flex-shrink-0 mt-0.5">✓</span>
                    )}
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
            {t('detective.phase6.verifyBtn', { defaultValue: 'Verificar clasificación' })}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {isCorrect ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-1">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm"
                 dangerouslySetInnerHTML={{ __html: t('detective.phase6.correct.title', { defaultValue: '✅ ¡Clasificación correcta! Verbo <strong>{{label}}</strong>.', label: correctLabel.label }).replace('{{label}}', correctLabel.label) }} />
              <p className="text-emerald-600 dark:text-emerald-400 text-xs">{correctLabel.description}</p>
              {isGutturalType && (
                <p className="text-emerald-600 dark:text-emerald-400 text-xs border-t border-emerald-200 dark:border-emerald-800 pt-2 mt-2">
                  <strong>{t('detective.phase6.indicatorLabel', { defaultValue: 'Indicador clave:' })}</strong> {correctLabel.indicator}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-1">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm"
                 dangerouslySetInnerHTML={{ __html: t('detective.phase6.incorrect.title', { defaultValue: '✗ La clasificación correcta es: <strong>{{label}}</strong>', label: correctLabel.label }).replace('{{label}}', correctLabel.label) }} />
              <p className="text-orange-600 dark:text-orange-400 text-xs">{correctLabel.description}</p>
              <p className="text-orange-600 dark:text-orange-400 text-xs">
                <strong>{t('detective.phase6.indicatorLabel', { defaultValue: 'Indicador clave:' })}</strong> {correctLabel.indicator}
              </p>
            </div>
          )}
          <button
            onClick={() => onComplete(finalAnswer)}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors"
          >
            {t('detective.phase6.continueBtn', { defaultValue: 'Ver resumen final →' })}
          </button>
        </div>
      )}
    </div>
  );
};
