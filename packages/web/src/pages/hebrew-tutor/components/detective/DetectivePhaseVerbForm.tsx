/**
 * DetectivePhaseVerbForm
 *
 * Phase: VERB_FORM — Identifies the conjugation form of the verb.
 *
 * The student deduces the verb form from observable morphological indicators:
 *   Level 1: What structural pattern do you see?
 *     → Preformative present  → Imperfect family (Imperfect, Wayyiqtol, Jussive, Cohortative)
 *     → Afformative present   → Perfect family (Perfect, Weqatal)
 *     → Neither               → Base forms (Imperative, Infinitive, Participle)
 *
 *   Level 2: Refine based on specific markers
 *     → Preformative + Waw consecutive → Wayyiqtol
 *     → Preformative + ה-ָ suffix      → Cohortative
 *     → Preformative + apocopated      → Jussive
 *     → Afformative + Waw + qamets     → Weqatal
 *     → No affixes + nominal function  → Infinitive / Participle
 *     → No affixes + 2nd person order  → Imperative
 */

import React, { useState, useMemo } from 'react';
import type { WordAnalysis, MorphemeSegment } from '@dosfilos/domain';
import { VerbForm, MorphemeRole } from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';
import { DetectiveHeroCard } from './DetectiveHeroCard';

// ── Spanish labels for verb forms ─────────────────────────────────────────────

const VERB_FORM_LABELS: Record<string, string> = {
  [VerbForm.PERFECT]:            'Perfecto (Qatal)',
  [VerbForm.IMPERFECT]:          'Imperfecto (Yiqtol)',
  [VerbForm.WAYYIQTOL]:          'Wayyiqtol (Impf. Consecutivo)',
  [VerbForm.WEQATAL]:            'Weqatal (Pf. Consecutivo)',
  [VerbForm.IMPERATIVE]:         'Imperativo',
  [VerbForm.COHORTATIVE]:        'Cohortativo',
  [VerbForm.JUSSIVE]:            'Yusivo',
  [VerbForm.INF_CONSTRUCT]:      'Infinitivo Constructo',
  [VerbForm.INF_ABSOLUTE]:       'Infinitivo Absoluto',
  [VerbForm.PARTICIPLE_ACTIVE]:  'Participio Activo',
  [VerbForm.PARTICIPLE_PASSIVE]: 'Participio Pasivo',
};

function getFormLabel(form: string): string {
  return VERB_FORM_LABELS[form] ?? form;
}

// ── Structural pattern detection ──────────────────────────────────────────────

type StructuralPattern = 'preformative' | 'afformative' | 'base';

interface FormOption {
  value: string;
  label: string;
  hint: string;
  indicator: string;
}

/** Detect if morphemes contain a preformative or waw consecutive. */
function detectStructuralPattern(morphemes: readonly MorphemeSegment[]): StructuralPattern {
  const hasPreformative = morphemes.some(
    m => m.role === MorphemeRole.PREFORMATIVE || m.role === MorphemeRole.PREFIX_STEM,
  );
  const hasWawConsecutive = morphemes.some(m => m.role === MorphemeRole.WAW_CONSECUTIVE);
  const hasAfformative = morphemes.some(m => m.role === MorphemeRole.AFFORMATIVE);

  if (hasPreformative || hasWawConsecutive) return 'preformative';
  if (hasAfformative) return 'afformative';
  return 'base';
}

// ── Level 1 options ───────────────────────────────────────────────────────────

interface PatternOption {
  id: StructuralPattern;
  label: string;
  description: string;
  emoji: string;
}

function getPatternOptions(t: ReturnType<typeof useTranslation>['t']): PatternOption[] {
  return [
    {
      id: 'preformative',
      label: t('detective.phaseVerbForm.pattern.preformative.label', {
        defaultValue: 'Veo un preformativo (prefijo verbal)',
      }),
      description: t('detective.phaseVerbForm.pattern.preformative.desc', {
        defaultValue: 'La forma tiene un prefijo de persona (י, ת, א, נ) o un ו consecutivo antes del prefijo.',
      }),
      emoji: '🔤',
    },
    {
      id: 'afformative',
      label: t('detective.phaseVerbForm.pattern.afformative.label', {
        defaultValue: 'Veo una aformativa (sufijo verbal)',
      }),
      description: t('detective.phaseVerbForm.pattern.afformative.desc', {
        defaultValue: 'La forma termina en un sufijo de persona/número (תִּי, נוּ, תֶּם, etc.) sin preformativo.',
      }),
      emoji: '📎',
    },
    {
      id: 'base',
      label: t('detective.phaseVerbForm.pattern.base.label', {
        defaultValue: 'No veo preformativo ni aformativa clara',
      }),
      description: t('detective.phaseVerbForm.pattern.base.desc', {
        defaultValue: 'La forma parece reducida a la raíz, sin prefijos ni sufijos de conjugación.',
      }),
      emoji: '🔍',
    },
  ];
}

// ── Level 2 options per pattern ───────────────────────────────────────────────

function getFormOptions(
  pattern: StructuralPattern,
  t: ReturnType<typeof useTranslation>['t'],
): FormOption[] {
  switch (pattern) {
    case 'preformative':
      return [
        {
          value: VerbForm.WAYYIQTOL,
          label: getFormLabel(VerbForm.WAYYIQTOL),
          hint: t('detective.phaseVerbForm.forms.wayyiqtol.hint', {
            defaultValue: 'Prefijo ו consecutivo + dagesh en el preformativo',
          }),
          indicator: t('detective.phaseVerbForm.forms.wayyiqtol.indicator', {
            defaultValue: 'Narrativo pasado secuencial: "y él hizo…"',
          }),
        },
        {
          value: VerbForm.IMPERFECT,
          label: getFormLabel(VerbForm.IMPERFECT),
          hint: t('detective.phaseVerbForm.forms.imperfect.hint', {
            defaultValue: 'Preformativo de persona SIN ו consecutivo',
          }),
          indicator: t('detective.phaseVerbForm.forms.imperfect.indicator', {
            defaultValue: 'Acción incompleta o futura: "él hará…"',
          }),
        },
        {
          value: VerbForm.COHORTATIVE,
          label: getFormLabel(VerbForm.COHORTATIVE),
          hint: t('detective.phaseVerbForm.forms.cohortative.hint', {
            defaultValue: 'Preformativo + sufijo ה-ָ (qamets-he final)',
          }),
          indicator: t('detective.phaseVerbForm.forms.cohortative.indicator', {
            defaultValue: 'Deseo/voluntad en 1ª persona: "que yo haga…"',
          }),
        },
        {
          value: VerbForm.JUSSIVE,
          label: getFormLabel(VerbForm.JUSSIVE),
          hint: t('detective.phaseVerbForm.forms.jussive.hint', {
            defaultValue: 'Forma apocopada (acortada) del imperfecto, 3ª persona',
          }),
          indicator: t('detective.phaseVerbForm.forms.jussive.indicator', {
            defaultValue: 'Deseo/mandato indirecto: "que él haga…"',
          }),
        },
      ];

    case 'afformative':
      return [
        {
          value: VerbForm.PERFECT,
          label: getFormLabel(VerbForm.PERFECT),
          hint: t('detective.phaseVerbForm.forms.perfect.hint', {
            defaultValue: 'Aformativa de persona sin ו con qamets previo',
          }),
          indicator: t('detective.phaseVerbForm.forms.perfect.indicator', {
            defaultValue: 'Acción completada: "él hizo / él ha hecho"',
          }),
        },
        {
          value: VerbForm.WEQATAL,
          label: getFormLabel(VerbForm.WEQATAL),
          hint: t('detective.phaseVerbForm.forms.weqatal.hint', {
            defaultValue: 'Forma perfecta precedida de וְ (waw + shevá)',
          }),
          indicator: t('detective.phaseVerbForm.forms.weqatal.indicator', {
            defaultValue: 'Futuro consecutivo: "y él hará…"',
          }),
        },
      ];

    case 'base':
      return [
        {
          value: VerbForm.IMPERATIVE,
          label: getFormLabel(VerbForm.IMPERATIVE),
          hint: t('detective.phaseVerbForm.forms.imperative.hint', {
            defaultValue: 'Orden directa, 2ª persona, sin preformativo',
          }),
          indicator: t('detective.phaseVerbForm.forms.imperative.indicator', {
            defaultValue: 'Mandato directo: "¡haz!" / "¡ve!"',
          }),
        },
        {
          value: VerbForm.INF_CONSTRUCT,
          label: getFormLabel(VerbForm.INF_CONSTRUCT),
          hint: t('detective.phaseVerbForm.forms.infConstruct.hint', {
            defaultValue: 'Forma nominal del verbo, frecuentemente con preposición (ל)',
          }),
          indicator: t('detective.phaseVerbForm.forms.infConstruct.indicator', {
            defaultValue: 'Funciona como sustantivo: "para hacer" / "al hacer"',
          }),
        },
        {
          value: VerbForm.INF_ABSOLUTE,
          label: getFormLabel(VerbForm.INF_ABSOLUTE),
          hint: t('detective.phaseVerbForm.forms.infAbsolute.hint', {
            defaultValue: 'Forma enfática sin prefijos, refuerza el verbo principal',
          }),
          indicator: t('detective.phaseVerbForm.forms.infAbsolute.indicator', {
            defaultValue: 'Énfasis verbal: "ciertamente hizo" (precede al verbo finito)',
          }),
        },
        {
          value: VerbForm.PARTICIPLE_ACTIVE,
          label: getFormLabel(VerbForm.PARTICIPLE_ACTIVE),
          hint: t('detective.phaseVerbForm.forms.participleActive.hint', {
            defaultValue: 'Patrón qōṭēl (o variantes), funciona como adjetivo/sustantivo',
          }),
          indicator: t('detective.phaseVerbForm.forms.participleActive.indicator', {
            defaultValue: 'Agente de acción continua: "el que hace" / "haciendo"',
          }),
        },
        {
          value: VerbForm.PARTICIPLE_PASSIVE,
          label: getFormLabel(VerbForm.PARTICIPLE_PASSIVE),
          hint: t('detective.phaseVerbForm.forms.participlePassive.hint', {
            defaultValue: 'Patrón qāṭūl, indica resultado pasivo',
          }),
          indicator: t('detective.phaseVerbForm.forms.participlePassive.indicator', {
            defaultValue: 'Resultado pasivo: "lo hecho" / "escrito"',
          }),
        },
      ];
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DetectivePhaseVerbFormProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

export const DetectivePhaseVerbForm: React.FC<DetectivePhaseVerbFormProps> = ({
  word,
  onComplete,
}) => {
  const { t } = useTranslation('hebrewTutor');

  // State
  const [selectedPattern, setSelectedPattern] = useState<StructuralPattern | null>(null);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Derived
  const expectedForm = word.verbMorphology?.verbForm ?? VerbForm.PERFECT;
  const expectedPattern = detectStructuralPattern(word.morphemes ?? []);
  const patternOptions = useMemo(() => getPatternOptions(t), [t]);
  const formOptions = useMemo(
    () => (selectedPattern ? getFormOptions(selectedPattern, t) : []),
    [selectedPattern, t],
  );

  const patternCorrect = selectedPattern === expectedPattern;
  const formCorrect = selectedForm === expectedForm;
  const isFullyCorrect = patternCorrect && formCorrect;

  const canSubmit = selectedPattern !== null && selectedForm !== null;

  const handlePatternSelect = (p: StructuralPattern) => {
    setSelectedPattern(p);
    setSelectedForm(null); // Reset form when pattern changes
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={5}
        name={t('detective.phaseVerbForm.title', { defaultValue: 'Forma Verbal' })}
        question={t('detective.phaseVerbForm.question', {
          defaultValue: '¿Cuál es la forma (conjugación) de este verbo?',
        })}
      />

      {/* Educational hint */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <span
            dangerouslySetInnerHTML={{
              __html: t('detective.phaseVerbForm.hint', {
                defaultValue:
                  '<strong>Clave:</strong> La forma verbal se deduce de los <em>indicadores morfológicos</em>: preformativos (prefijos), aformativas (sufijos) y la presencia o ausencia del ו consecutivo.',
              }),
            }}
          />
        </p>
      </div>

      {!submitted ? (
        <div className="space-y-4">
          {/* ── Level 1: Structural pattern ─────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('detective.phaseVerbForm.level1.title', {
                defaultValue: 'Paso 1 — ¿Qué patrón estructural observas?',
              })}
            </p>
            <div className="space-y-1.5">
              {patternOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handlePatternSelect(opt.id)}
                  className={`
                    w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all
                    ${selectedPattern === opt.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-border hover:border-indigo-300 hover:bg-muted/50'}
                  `}
                >
                  <span className="text-base mt-0.5 shrink-0">{opt.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                  {selectedPattern === opt.id && (
                    <span className="text-indigo-500 font-bold text-sm shrink-0 mt-0.5">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Level 2: Specific form ─────────────────────────────────── */}
          {selectedPattern !== null && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('detective.phaseVerbForm.level2.title', {
                  defaultValue: 'Paso 2 — ¿Cuál es la forma exacta?',
                })}
              </p>

              {/* Modal hint for preformative family */}
              {selectedPattern === 'preformative' && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-semibold">
                    {t('detective.phaseVerbForm.level2.modalHint', {
                      defaultValue:
                        '💡 El yusivo y cohortativo son variantes modales del imperfecto. Busca marcadores específicos.',
                    })}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                {formOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedForm(opt.value)}
                    className={`
                      w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all
                      ${selectedForm === opt.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                        : 'border-border hover:border-indigo-300 hover:bg-muted/50'}
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.hint}</p>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 italic">
                        {opt.indicator}
                      </p>
                    </div>
                    {selectedForm === opt.value && (
                      <span className="text-indigo-500 font-bold text-sm shrink-0 mt-0.5">✓</span>
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
            {t('detective.phaseVerbForm.verifyBtn', { defaultValue: 'Verificar forma verbal' })}
          </button>
        </div>
      ) : (
        /* ── Feedback ─────────────────────────────────────────────────── */
        <div className="space-y-4">
          {isFullyCorrect ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅{' '}
                {t('detective.phaseVerbForm.correct.title', {
                  defaultValue: '¡Excelente! Identificaste correctamente la forma verbal.',
                })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs">
                <strong>{getFormLabel(expectedForm)}</strong>
                {' — '}
                {formOptions.find((o) => o.value === expectedForm)?.indicator ??
                  getFormOptions(expectedPattern, t).find((o) => o.value === expectedForm)?.indicator ??
                  ''}
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-2">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ✗{' '}
                {t('detective.phaseVerbForm.incorrect.title', {
                  defaultValue: 'No del todo. Revisemos:',
                })}
              </p>

              {/* Pattern feedback */}
              {!patternCorrect && (
                <div className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                  <p>
                    <strong>
                      {t('detective.phaseVerbForm.incorrect.patternLabel', {
                        defaultValue: 'Patrón estructural:',
                      })}
                    </strong>{' '}
                    {t('detective.phaseVerbForm.incorrect.patternMsg', {
                      defaultValue:
                        'Esta forma tiene patrón «{{correct}}». Tu selección fue «{{selected}}».',
                      correct:
                        patternOptions.find((p) => p.id === expectedPattern)?.label ?? expectedPattern,
                      selected:
                        patternOptions.find((p) => p.id === selectedPattern)?.label ?? selectedPattern,
                    })}
                  </p>
                </div>
              )}

              {/* Form feedback */}
              <div className="text-xs space-y-1">
                <p className="text-orange-700 dark:text-orange-300 font-semibold">
                  {t('detective.phaseVerbForm.incorrect.correctForm', {
                    defaultValue: 'La forma correcta es:',
                  })}{' '}
                  <strong>{getFormLabel(expectedForm)}</strong>
                </p>
                {/* Show the indicator for the correct form */}
                {(() => {
                  const correctOpts = getFormOptions(expectedPattern, t);
                  const correctOpt = correctOpts.find((o) => o.value === expectedForm);
                  return correctOpt ? (
                    <div className="mt-2 p-2 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg space-y-1">
                      <p className="text-orange-800 dark:text-orange-200">
                        <strong>
                          {t('detective.phaseVerbForm.incorrect.indicatorLabel', {
                            defaultValue: 'Indicador clave:',
                          })}
                        </strong>{' '}
                        {correctOpt.hint}
                      </p>
                      <p className="text-orange-700 dark:text-orange-300 italic">
                        {correctOpt.indicator}
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          <button
            onClick={() => onComplete(selectedForm ?? '')}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            {t('common.continue', { defaultValue: 'Continuar →' })}
          </button>
        </div>
      )}
    </div>
  );
};
