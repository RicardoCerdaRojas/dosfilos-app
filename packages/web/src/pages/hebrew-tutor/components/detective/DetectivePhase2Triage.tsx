/**
 * DetectivePhase2Triage
 *
 * Phase 2 — "Triage": The student visually counts the root radicals
 * they can identify. This observation is the decision point that
 * sends them down the Strong Verb or Weak Verb investigation path.
 *
 * When the student misclassifies a weak verb as strong, a Socratic
 * guided mini-flow activates: contextual hints per verb type prompt
 * the student to re-evaluate without giving the answer directly.
 * If they fail a second time, a direct correction is shown.
 *
 * The component ALWAYS emits the grammatically correct path via
 * `onComplete`, ensuring the student never gets stuck in the wrong
 * investigation path.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import type { WordAnalysis } from '@dosfilos/domain';
import { VerbType } from '@dosfilos/domain';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DetectivePhase2TriageProps {
  word: WordAnalysis;
  /** The grammatically correct path, derived by the orchestrator */
  expectedPath: 'strong' | 'weak';
  /** The verb type from the backend, used for contextual Socratic hints */
  verbType: VerbType;
  /** Called with the CORRECT path when the student finishes this phase */
  onComplete: (answer: string) => void;
}

interface TriageOption {
  id: 'three' | 'three-transformed' | 'two' | 'one-or-none';
  label: string;
  sublabel: string;
  emoji: string;
  hint: string;
}

/**
 * State machine for the Socratic guided flow:
 *   selecting     → student picks an option for the first time
 *   guided_hint   → student was wrong; showing contextual hints
 *   reselecting   → student picks again after seeing hints
 *   resolved      → final state (correct or corrected)
 */
type TriageState = 'selecting' | 'guided_hint' | 'reselecting' | 'resolved';

// ── Options ───────────────────────────────────────────────────────────────────

const getOptions = (t: (key: string, opts?: Record<string, unknown>) => string): TriageOption[] => [
  {
    id: 'three',
    label: t('detective.phase.triage.options.three.label', { defaultValue: 'Veo 3 radicales claras' }),
    sublabel: t('detective.phase.triage.options.three.sublabel', { defaultValue: 'Las 3 letras de la raíz están presentes como consonantes' }),
    emoji: '💪',
    hint: t('detective.phase.triage.options.three.hint', { defaultValue: 'Ejemplo: כָּתַב → k-t-b todas visibles como consonantes' }),
  },
  {
    id: 'three-transformed',
    label: t('detective.phase.triage.options.threeTransformed.label', { defaultValue: 'Veo 3 letras, pero una está transformada' }),
    sublabel: t('detective.phase.triage.options.threeTransformed.sublabel', { defaultValue: 'Una radical funciona como vocal en vez de consonante' }),
    emoji: '🔄',
    hint: t('detective.phase.triage.options.threeTransformed.hint', { defaultValue: 'Ejemplo: קוּם → la Waw (וּ) tiene Shureq, actúa como vocal, no como consonante' }),
  },
  {
    id: 'two',
    label: t('detective.phase.triage.options.two.label', { defaultValue: 'Solo veo 2 radicales' }),
    sublabel: t('detective.phase.triage.options.two.sublabel', { defaultValue: 'Una radical parece faltar o estar oculta' }),
    emoji: '🔍',
    hint: t('detective.phase.triage.options.two.hint', { defaultValue: 'Puede ser un verbo débil — la raíz se contrajo' }),
  },
  {
    id: 'one-or-none',
    label: t('detective.phase.triage.options.oneOrNone.label', { defaultValue: 'Veo 1 radical o ninguna' }),
    sublabel: t('detective.phase.triage.options.oneOrNone.sublabel', { defaultValue: 'La forma está muy contraída' }),
    emoji: '⚠️',
    hint: t('detective.phase.triage.options.oneOrNone.hint', { defaultValue: 'Verbo débil — requiere la tabla de la Lección 8' }),
  },
];

/** Map from triage option to investigation path */
const PATH_MAP: Record<TriageOption['id'], 'strong' | 'weak'> = {
  'three':             'strong',
  'three-transformed': 'weak',
  'two':               'weak',
  'one-or-none':       'weak',
};

// ── Socratic Hints ────────────────────────────────────────────────────────────

/**
 * Returns a contextual Socratic hint based on the verb type.
 * These prompts guide the student to discover the answer without
 * revealing it directly.
 */
function getSocraticHint(
  verbType: VerbType,
  t: (key: string, opts?: Record<string, unknown>) => string,
): { title: string; hint: string; rules: string[] } {
  switch (verbType) {
    case VerbType.II_WAW_YOD:
      return {
        title: t('detective.phase.triage.socratic.hollow.title', {
          defaultValue: '🔎 Observa con más cuidado...',
        }),
        hint: t('detective.phase.triage.socratic.hollow.hint', {
          defaultValue: 'Observa la letra central. ¿Es una consonante real o está funcionando como vocal (Shureq וּ / Jolem וֹ)? En los verbos huecos, la Waw o Yod se convierte en vocal y deja de ser una radical consonántica.',
        }),
        rules: [
          t('detective.phase.triage.socratic.hollow.rule1', {
            defaultValue: 'Una Waw con Shureq (וּ) o Jolem (וֹ) no es una consonante — es una vocal.',
          }),
          t('detective.phase.triage.socratic.hollow.rule2', {
            defaultValue: 'Si la "radical" central es vocal, realmente solo hay 2 radicales consonánticas.',
          }),
        ],
      };

    case VerbType.I_NUN:
      return {
        title: t('detective.phase.triage.socratic.inun.title', {
          defaultValue: '🔎 ¿Estás seguro de que ves 3 radicales?',
        }),
        hint: t('detective.phase.triage.socratic.inun.hint', {
          defaultValue: '¿Puedes encontrar la primera radical (Nun)? En algunos verbos, el Nun inicial se asimila al dagesh de la siguiente letra y desaparece de la escritura.',
        }),
        rules: [
          t('detective.phase.triage.socratic.inun.rule1', {
            defaultValue: 'Busca si hay un dagesh forte en la segunda letra — puede ser un Nun asimilado.',
          }),
          t('detective.phase.triage.socratic.inun.rule2', {
            defaultValue: 'Si no encuentras el Nun, el verbo es débil (Pe-Nun).',
          }),
        ],
      };

    case VerbType.I_YOD_WAW:
      return {
        title: t('detective.phase.triage.socratic.iyod.title', {
          defaultValue: '🔎 Revisa la primera radical...',
        }),
        hint: t('detective.phase.triage.socratic.iyod.hint', {
          defaultValue: '¿La primera letra es realmente una radical, o es un preformativo? En verbos Pe-Yod, la Yod/Waw inicial puede caer o transformarse en ciertas conjugaciones.',
        }),
        rules: [
          t('detective.phase.triage.socratic.iyod.rule1', {
            defaultValue: 'La Yod/Waw inicial a veces desaparece y su ausencia se compensa con una vocal larga.',
          }),
          t('detective.phase.triage.socratic.iyod.rule2', {
            defaultValue: 'Compara con la raíz original: ¿se conserva esa primera letra?',
          }),
        ],
      };

    case VerbType.III_HE:
      return {
        title: t('detective.phase.triage.socratic.iiihe.title', {
          defaultValue: '🔎 Mira la última letra...',
        }),
        hint: t('detective.phase.triage.socratic.iiihe.hint', {
          defaultValue: 'Mira la última letra. ¿Es una He (ה) que podría ser un sufijo de mater lectionis en vez de una radical verdadera? En los verbos Lamed-He, la tercera radical se transforma.',
        }),
        rules: [
          t('detective.phase.triage.socratic.iiihe.rule1', {
            defaultValue: 'La He final no siempre es una radical — puede ser un indicador vocálico.',
          }),
          t('detective.phase.triage.socratic.iiihe.rule2', {
            defaultValue: 'En ciertas conjugaciones, la He desaparece completamente.',
          }),
        ],
      };

    case VerbType.III_ALEF:
      return {
        title: t('detective.phase.triage.socratic.iiialef.title', {
          defaultValue: '🔎 Observa el final de la palabra...',
        }),
        hint: t('detective.phase.triage.socratic.iiialef.hint', {
          defaultValue: 'La última letra Álef (א) a veces se vuelve quiescente y altera el patrón vocálico final. ¿Notas alguna irregularidad en las vocales finales?',
        }),
        rules: [
          t('detective.phase.triage.socratic.iiialef.rule1', {
            defaultValue: 'Un Álef quiescente deja de funcionar como consonante.',
          }),
          t('detective.phase.triage.socratic.iiialef.rule2', {
            defaultValue: 'Esto causa cambios vocálicos que marcan al verbo como débil.',
          }),
        ],
      };

    case VerbType.GEMINATE:
      return {
        title: t('detective.phase.triage.socratic.geminate.title', {
          defaultValue: '🔎 Compara la segunda y tercera radical...',
        }),
        hint: t('detective.phase.triage.socratic.geminate.hint', {
          defaultValue: '¿Las dos últimas radicales son la misma letra? Los verbos geminados a veces contraen esa doble radical en una sola con dagesh.',
        }),
        rules: [
          t('detective.phase.triage.socratic.geminate.rule1', {
            defaultValue: 'Si R2 y R3 son la misma letra, puede tratarse de un verbo geminado.',
          }),
          t('detective.phase.triage.socratic.geminate.rule2', {
            defaultValue: 'En ciertas formas, la letra duplicada se contrae y aparece un dagesh.',
          }),
        ],
      };

    default:
      return {
        title: t('detective.phase.triage.socratic.default.title', {
          defaultValue: '🔎 Vuelve a observar...',
        }),
        hint: t('detective.phase.triage.socratic.default.hint', {
          defaultValue: 'Recuerda que en los verbos débiles, una radical puede caer, asimilarse o convertirse en vocal. Mira cada letra cuidadosamente.',
        }),
        rules: [
          t('detective.phase.triage.socratic.default.rule1', {
            defaultValue: 'Una letra que funciona como vocal no cuenta como radical consonántica.',
          }),
          t('detective.phase.triage.socratic.default.rule2', {
            defaultValue: 'Compara la forma verbal con las 3 letras de la raíz original.',
          }),
        ],
      };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export const DetectivePhase2Triage: React.FC<DetectivePhase2TriageProps> = ({
  word,
  expectedPath,
  verbType,
  onComplete,
}) => {
  const { t } = useTranslation('hebrewTutor');
  const [selected, setSelected]       = useState<TriageOption['id'] | null>(null);
  const [triageState, setTriageState] = useState<TriageState>('selecting');
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState<boolean | null>(null);

  const options = getOptions(t);

  const studentPath = selected ? PATH_MAP[selected] : null;
  const isStudentCorrect = studentPath === expectedPath;

  // ── First attempt ─────────────────────────────────────────────────────────

  const handleFirstSubmit = () => {
    if (!selected) return;

    if (isStudentCorrect) {
      setFirstAttemptCorrect(true);
      setTriageState('resolved');
    } else {
      setFirstAttemptCorrect(false);
      setTriageState('guided_hint');
    }
  };

  // ── After guided hints, student re-evaluates ──────────────────────────────

  const handleStartReselection = () => {
    setSelected(null);
    setTriageState('reselecting');
  };

  const handleSecondSubmit = () => {
    if (!selected) return;
    // Whether correct or not, resolve and always send the correct path
    setTriageState('resolved');
  };

  // ── Final: always emit the correct path ───────────────────────────────────

  const handleContinue = () => {
    onComplete(expectedPath);
  };

  // ── Socratic hints ────────────────────────────────────────────────────────

  const socratic = getSocraticHint(verbType, t);

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderOptions = (disabled: boolean) => (
    <div className="space-y-2">
      {options.map(opt => (
        <button
          key={opt.id}
          disabled={disabled}
          onClick={() => !disabled && setSelected(opt.id)}
          className={`
            w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
            ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
            ${selected === opt.id
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
              : disabled ? 'border-border' : 'border-border hover:bg-muted/50'}
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
  );

  const renderPathPreview = () => {
    if (!selected) return null;
    const path = PATH_MAP[selected];
    return (
      <div className={`
        rounded-xl p-3 text-xs font-medium animate-in fade-in duration-200
        ${path === 'strong'
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
          : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'}
      `}>
        {path === 'strong' ? (
          <span dangerouslySetInnerHTML={{ __html: t('detective.phase.triage.pathStrong', { defaultValue: '💪 <strong>Camino Verbo Fuerte:</strong> Tiraremos los colores morfológicos (Lec. 1-7)' }) }} />
        ) : (
          <span dangerouslySetInnerHTML={{ __html: t('detective.phase.triage.pathWeak', { defaultValue: '🔬 <strong>Camino Verbo Débil:</strong> Usaremos la tabla de la vocal del preformativo (Lec. 8)' }) }} />
        )}
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <DetectiveHeroCard
        word={word}
        step={2}
        name={t('detective.phase.triage.title', { defaultValue: 'Reconocimiento de Raíz' })}
        question={t('detective.phase.triage.question', { defaultValue: '¿Cuántas letras radicales puedes identificar?' })}
      />

      {/* General hint */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
        <p className="text-xs text-amber-800 dark:text-amber-300">
          <span dangerouslySetInnerHTML={{ __html: t('detective.phase.triage.hint', { defaultValue: '<strong>Clave:</strong> Un verbo hebreo tiene 3 radicales (R1, R2, R3). Los verbos <em>fuertes</em> las muestran todas como consonantes. Los verbos <em>débiles</em> pueden perder, contraer o transformar alguna de ellas.' }) }} />
        </p>
      </div>

      {/* ── STATE: selecting (first attempt) ──────────────────────────────── */}
      {triageState === 'selecting' && (
        <>
          {renderOptions(false)}
          {renderPathPreview()}
          <button
            disabled={!selected}
            onClick={handleFirstSubmit}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('detective.phase.triage.continueInvestigation', { defaultValue: 'Continuar investigación →' })}
          </button>
        </>
      )}

      {/* ── STATE: guided_hint (Socratic hints after wrong answer) ────────── */}
      {triageState === 'guided_hint' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Show their locked-in wrong answer */}
          {renderOptions(true)}

          {/* Socratic guidance card */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-4 space-y-3">
            <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">
              {socratic.title}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {socratic.hint}
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-700 dark:text-amber-400">
              {socratic.rules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleStartReselection}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            {t('detective.phase.triage.reEvaluate', { defaultValue: 'Volver a evaluar →' })}
          </button>
        </div>
      )}

      {/* ── STATE: reselecting (second attempt after hints) ───────────────── */}
      {triageState === 'reselecting' && (
        <>
          {/* Compact reminder of the Socratic hint */}
          <div className="bg-amber-50/60 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300 italic">
              💡 {socratic.hint}
            </p>
          </div>

          {renderOptions(false)}
          {renderPathPreview()}

          <button
            disabled={!selected}
            onClick={handleSecondSubmit}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {t('detective.phase.triage.confirmReEvaluation', { defaultValue: 'Confirmar evaluación →' })}
          </button>
        </>
      )}

      {/* ── STATE: resolved (final feedback) ──────────────────────────────── */}
      {triageState === 'resolved' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {firstAttemptCorrect ? (
            /* Correct on first try */
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-1">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ {t('detective.phase.triage.correctTitle', { defaultValue: '¡Correcto! Identificaste bien el tipo de verbo.' })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs">
                {expectedPath === 'strong'
                  ? t('detective.phase.triage.correctStrong', { defaultValue: 'Las 3 radicales están presentes como consonantes. Vamos por el Camino Fuerte.' })
                  : t('detective.phase.triage.correctWeak', { defaultValue: 'Detectaste que una radical se ha transformado. Vamos por el Camino Débil.' })}
              </p>
            </div>
          ) : isStudentCorrect ? (
            /* Correct on second try (after guided hints) */
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-1">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                ✅ {t('detective.phase.triage.guidedCorrectTitle', { defaultValue: '¡Muy bien! Corregiste tu observación.' })}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs">
                {t('detective.phase.triage.guidedCorrectDesc', { defaultValue: 'Después de revisar las pistas, identificaste correctamente que una radical se ha transformado. ¡Así se aprende!' })}
              </p>
            </div>
          ) : (
            /* Still wrong after second try — direct correction */
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-2">
              <p className="text-orange-700 dark:text-orange-300 font-semibold text-sm">
                ⚠️ {t('detective.phase.triage.correctionTitle', { defaultValue: 'Este verbo es en realidad un verbo débil.' })}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs leading-relaxed">
                {socratic.hint}
              </p>
              <p className="text-orange-700 dark:text-orange-300 text-xs font-semibold">
                {t('detective.phase.triage.correctionPath', { defaultValue: 'Continuaremos por el Camino Débil para investigarlo correctamente.' })}
              </p>
            </div>
          )}

          {/* Path badge */}
          <div className={`
            rounded-xl p-3 text-xs font-medium
            ${expectedPath === 'strong'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'}
          `}>
            {expectedPath === 'strong' ? (
              <span dangerouslySetInnerHTML={{ __html: t('detective.phase.triage.pathStrong', { defaultValue: '💪 <strong>Camino Verbo Fuerte:</strong> Tiraremos los colores morfológicos (Lec. 1-7)' }) }} />
            ) : (
              <span dangerouslySetInnerHTML={{ __html: t('detective.phase.triage.pathWeak', { defaultValue: '🔬 <strong>Camino Verbo Débil:</strong> Usaremos la tabla de la vocal del preformativo (Lec. 8)' }) }} />
            )}
          </div>

          <button
            onClick={handleContinue}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors"
          >
            {t('detective.phase.triage.continueInvestigation', { defaultValue: 'Continuar investigación →' })}
          </button>
        </div>
      )}
    </div>
  );
};
