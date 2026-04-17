/**
 * DetectiveProgress
 *
 * Vertical timeline showing the investigation phases and their
 * completion state: pending | active | correct | incorrect.
 *
 * The display is path-aware:
 *  - Before TRIAGE: shows Phase 1-2 (shared) + placeholder for path phases
 *  - After TRIAGE:  shows Phase 1-2 + the 4 phases of the chosen path
 *
 * Typography hierarchy:
 *  - Phase number: [10px] muted — secondary information
 *  - Phase name:   14px / medium — primary label, color-coded by state
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Circle, Loader2 } from 'lucide-react';
import { DetectivePhase } from '@dosfilos/domain';

type InvestigationPath = 'strong' | 'weak' | null;

interface PhaseConfig {
  phase: DetectivePhase;
  label: string;
  icon: string;
  /** Visual step number (1-6) */
  step: number;
}

// ── Phase configurations per path ─────────────────────────────────────────────

const getSharedPhases = (t: any): PhaseConfig[] => [
  { phase: DetectivePhase.OBSERVE, label: t('detective.progress.phases.observe', { defaultValue: 'Observación' }), icon: '', step: 1 },
  { phase: DetectivePhase.TRIAGE,  label: t('detective.progress.phases.triage', { defaultValue: 'Triage' }),      icon: '', step: 2 },
];

const getStrongPhases = (t: any): PhaseConfig[] => [
  { phase: DetectivePhase.COLORS,        label: t('detective.progress.phases.colors', { defaultValue: 'Los Colores' }),   icon: '', step: 3 },
  { phase: DetectivePhase.DAGESH,        label: t('detective.progress.phases.dagesh', { defaultValue: 'Dagesh' }),        icon: '', step: 4 },
  { phase: DetectivePhase.BINYAN,        label: t('detective.progress.phases.binyan', { defaultValue: 'Binyan' }),        icon: '', step: 5 },
  { phase: DetectivePhase.STRONG_CONFIRM,label: t('detective.progress.phases.strongConfirm', { defaultValue: 'Clasificación' }), icon: '', step: 6 },
  { phase: DetectivePhase.TRANSLATION,   label: t('detective.progress.phases.translation', { defaultValue: 'Traducción' }),   icon: '', step: 7 },
];

const getWeakPhases = (t: any): PhaseConfig[] => [
  { phase: DetectivePhase.PREFORMATIVE, label: t('detective.progress.phases.preformative', { defaultValue: 'Preformativo' }), icon: '', step: 3 },
  { phase: DetectivePhase.WEAK_ROOT,    label: t('detective.progress.phases.weakRoot', { defaultValue: 'Raíz Débil' }),   icon: '', step: 4 },
  { phase: DetectivePhase.WEAK_BINYAN,  label: t('detective.progress.phases.weakBinyan', { defaultValue: 'Binyan' }),       icon: '', step: 5 },
  { phase: DetectivePhase.TRANSLATION,  label: t('detective.progress.phases.translation', { defaultValue: 'Traducción' }),  icon: '', step: 6 },
];

/** Placeholder phases shown before TRIAGE determines the path */
const getPendingPathPhases = (t: any): PhaseConfig[] => [
  { phase: -1 as DetectivePhase, label: t('detective.progress.phases.pending', { defaultValue: 'Camino por definir…' }), icon: '', step: 3 },
  { phase: -2 as DetectivePhase, label: t('detective.progress.phases.pending', { defaultValue: 'Camino por definir…' }), icon: '', step: 4 },
  { phase: -3 as DetectivePhase, label: t('detective.progress.phases.pending', { defaultValue: 'Camino por definir…' }), icon: '', step: 5 },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface PhaseStatus {
  phase: DetectivePhase;
  correct?: boolean;
}

interface DetectiveProgressProps {
  currentPhase: DetectivePhase;
  completedPhases: PhaseStatus[];
  activePath: InvestigationPath;
}

type PhaseState = 'pending' | 'active' | 'correct' | 'incorrect';

export const DetectiveProgress: React.FC<DetectiveProgressProps> = ({
  currentPhase,
  completedPhases,
  activePath,
}) => {
  const { t } = useTranslation('hebrewTutor');

  // Build the visible phase list based on the current path
  const pathPhases: PhaseConfig[] = activePath === 'strong'
    ? getStrongPhases(t)
    : activePath === 'weak'
      ? getWeakPhases(t)
      : getPendingPathPhases(t);

  const sharedPhases = getSharedPhases(t);
  const allPhases: PhaseConfig[] = [...sharedPhases, ...pathPhases];

  const getState = (phase: DetectivePhase): PhaseState => {
    // Placeholder phases are always pending
    if ((phase as number) < 0) return 'pending';
    const completed = completedPhases.find(p => p.phase === phase);
    if (completed) return completed.correct ? 'correct' : 'incorrect';
    if (phase === currentPhase) return 'active';
    return 'pending';
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Path badge – shown after TRIAGE */}
      {activePath && (
        <div className={`
          mb-3 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-center
          ${activePath === 'strong'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'}
        `}>
          {activePath === 'strong' ? t('detective.progress.strongPathBadge', { defaultValue: '💪 Camino Fuerte' }) : t('detective.progress.weakPathBadge', { defaultValue: '🔬 Camino Débil' })}
        </div>
      )}

      {allPhases.map((config, idx) => {
        const state  = getState(config.phase);
        const isLast = idx === allPhases.length - 1;
        const isPending = (config.phase as number) < 0;

        // Show a divider between shared and path phases
        const showDivider = idx === sharedPhases.length && activePath !== null;

        return (
          <React.Fragment key={`${config.phase}-${idx}`}>
            {showDivider && (
              <div className={`
                mx-1 mb-2 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-center
                ${activePath === 'strong'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}
              `}>
                {activePath === 'strong' ? t('detective.progress.strongVerbLabel', { defaultValue: 'Verbo Fuerte' }) : t('detective.progress.weakVerbLabel', { defaultValue: 'Verbo Débil' })}
              </div>
            )}

            <div className="flex items-start gap-2.5">

              {/* ── State icon + connector line ───────────────────────── */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300
                    ${state === 'active'    ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20 scale-110' : ''}
                    ${state === 'correct'   ? 'bg-emerald-500 text-white' : ''}
                    ${state === 'incorrect' ? 'bg-orange-500 text-white' : ''}
                    ${state === 'pending'   ? 'bg-muted text-muted-foreground/60' : ''}
                    ${isPending             ? 'opacity-40' : ''}
                  `}
                >
                  {state === 'active'    && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {state === 'correct'   && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {state === 'incorrect' && <XCircle className="w-3.5 h-3.5" />}
                  {state === 'pending'   && <Circle className="w-3 h-3" />}
                </div>

                {!isLast && (
                  <div
                    className={`
                      w-px flex-1 min-h-[14px] mt-0.5 transition-colors duration-300
                      ${state === 'correct' || state === 'incorrect'
                        ? 'bg-border'
                        : 'bg-border/40'}
                    `}
                  />
                )}
              </div>

              {/* ── Label block ───────────────────────────────────────── */}
              <div className={`pb-3 pt-0.5 flex flex-col gap-0.5 ${isLast ? 'pb-0' : ''} ${isPending ? 'opacity-40' : ''}`}>
                {/* Phase number — secondary */}
                <span
                  className={`
                    text-[10px] font-semibold uppercase tracking-widest leading-none
                    ${state === 'active'    ? 'text-indigo-500 dark:text-indigo-400' : ''}
                    ${state === 'correct'   ? 'text-emerald-500 dark:text-emerald-400' : ''}
                    ${state === 'incorrect' ? 'text-orange-500 dark:text-orange-400' : ''}
                    ${state === 'pending'   ? 'text-muted-foreground/50' : ''}
                  `}
                >
                  {t('detective.progress.phaseStep', { defaultValue: 'Fase {{step}}', step: config.step })}
                </span>

                {/* Phase name — primary */}
                <span
                  className={`
                    text-sm leading-snug transition-colors
                    ${state === 'active'
                      ? 'font-semibold text-indigo-600 dark:text-indigo-300'
                      : 'font-medium'}
                    ${state === 'correct'   ? 'text-emerald-700 dark:text-emerald-300' : ''}
                    ${state === 'incorrect' ? 'text-orange-700 dark:text-orange-300' : ''}
                    ${state === 'pending'   ? 'text-muted-foreground' : ''}
                  `}
                >
                  {config.label}
                </span>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
