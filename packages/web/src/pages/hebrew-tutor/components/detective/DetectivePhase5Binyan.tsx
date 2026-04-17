/**
 * DetectivePhase5Binyan
 *
 * Strong Verb Path — Phase 5: Binyan diagnosis as a guided deductive wizard.
 *
 * Uses the same binary decision-tree from binyan-wizard.ts as the weak path.
 * The morphological elimination process is identical — only the contextual
 * framing differs (strong verbs have all three radicals visible).
 */

import React, { useState, useCallback } from 'react';
import type { WordAnalysis } from '@dosfilos/domain';
import { DetectiveHeroCard } from './DetectiveHeroCard';
import {
  BINYAN_WIZARD_TREE,
  WIZARD_START_NODE,
  getExpectedAnswer,
  isBinyanResult,
  type BinyanResult,
  type CompletedStep,
} from '../../utils/binyan-wizard';

interface DetectivePhase5BinyanProps {
  word: WordAnalysis;
  onComplete: (answer: string) => void;
}

type WizardState =
  | { kind: 'question'; nodeId: string; error: string | null }
  | { kind: 'result'; result: BinyanResult };

export const DetectivePhase5Binyan: React.FC<DetectivePhase5BinyanProps> = ({
  word,
  onComplete,
}) => {
  const binyan = word.verbMorphology?.binyan;

  const [wizardState, setWizardState] = useState<WizardState>({
    kind: 'question',
    nodeId: WIZARD_START_NODE,
    error: null,
  });
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);

  const handleAnswer = useCallback(
    (answer: 'yes' | 'no') => {
      if (wizardState.kind !== 'question' || !binyan) return;

      const { nodeId } = wizardState;
      const node = BINYAN_WIZARD_TREE[nodeId];
      if (!node) return;

      const expected = getExpectedAnswer(nodeId, binyan);

      if (answer !== expected) {
        const feedback = answer === 'yes' ? node.wrongYesFeedback : node.wrongNoFeedback;
        setWizardState({ kind: 'question', nodeId, error: feedback });
        return;
      }

      const branch      = answer === 'yes' ? node.yesBranch      : node.noBranch;
      const elimination = answer === 'yes' ? node.yesElimination : node.noElimination;

      setCompletedSteps(prev => [...prev, { nodeId, answer, elimination }]);

      if (isBinyanResult(branch)) {
        setWizardState({ kind: 'result', result: branch });
      } else {
        setWizardState({ kind: 'question', nodeId: branch, error: null });
      }
    },
    [wizardState, binyan],
  );

  const dismissError = useCallback(() => {
    if (wizardState.kind === 'question') {
      setWizardState({ ...wizardState, error: null });
    }
  }, [wizardState]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      <DetectiveHeroCard
        word={word}
        step={5}
        name="Diagnóstico de Binyan"
        question="Proceso de eliminación morfológica"
      />

      {/* ── Breadcrumb: completed elimination steps ──────────────────────────────────────── */}
      {completedSteps.length > 0 && (
        <div className="space-y-1.5">
          {completedSteps.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-3 py-2 rounded-lg
                bg-emerald-50 dark:bg-emerald-950/20
                border border-emerald-200 dark:border-emerald-800"
            >
              <span className="text-emerald-500 text-xs mt-0.5 shrink-0">✓</span>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">{step.elimination}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Active question node ─────────────────────────────────────────────── */}
      {wizardState.kind === 'question' && (() => {
        const node = BINYAN_WIZARD_TREE[wizardState.nodeId];
        if (!node) return null;

        return (
          <div className="space-y-4">

            {/* Observation hint */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                🔎 <strong>Observa:</strong> {node.observationHint}
              </p>
            </div>

            {/* Question */}
            <div className="text-center px-2">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {node.question}
              </p>
            </div>

            {/* Error feedback */}
            {wizardState.error ? (
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-700 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                <p className="text-orange-700 dark:text-orange-300 font-semibold text-xs">
                  ⚠️ No exactamente…
                </p>
                <p className="text-orange-600 dark:text-orange-400 text-xs leading-relaxed">
                  {wizardState.error}
                </p>
                <button
                  onClick={dismissError}
                  className="text-xs font-semibold text-orange-700 dark:text-orange-300
                    underline underline-offset-2 hover:text-orange-900 transition-colors"
                >
                  Intentar de nuevo →
                </button>
              </div>
            ) : (
              /* Yes / No answer buttons */
              <div className="grid grid-cols-2 gap-3">
                <button
                  id={`wizard-yes-${node.id}`}
                  onClick={() => handleAnswer('yes')}
                  className="flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border-2
                    border-emerald-300 dark:border-emerald-700
                    bg-emerald-50 dark:bg-emerald-950/20
                    hover:bg-emerald-100 dark:hover:bg-emerald-950/40
                    text-emerald-700 dark:text-emerald-300
                    font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-xl">✓</span>
                  <span className="text-xs text-center leading-tight">{node.yesLabel}</span>
                </button>

                <button
                  id={`wizard-no-${node.id}`}
                  onClick={() => handleAnswer('no')}
                  className="flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border-2
                    border-slate-300 dark:border-slate-600
                    bg-slate-50 dark:bg-slate-800/30
                    hover:bg-slate-100 dark:hover:bg-slate-700/30
                    text-slate-700 dark:text-slate-300
                    font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-xl">✗</span>
                  <span className="text-xs text-center leading-tight">{node.noLabel}</span>
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Final result ─────────────────────────────────────────────────────── */}
      {wizardState.kind === 'result' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Result card */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl p-5 text-center space-y-3">
            <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">
              ✅ ¡Diagnóstico completado!
            </p>
            <div>
              <div
                dir="rtl"
                lang="he"
                className="text-4xl font-serif font-bold text-emerald-700 dark:text-emerald-300"
              >
                {wizardState.result.hebrewName}
              </div>
              <p className="text-lg font-bold text-foreground mt-1">{wizardState.result.label}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed text-left">
              {wizardState.result.summary}
            </p>
          </div>

          {/* Deductive trail summary */}
          {completedSteps.length > 0 && (
            <div className="space-y-1.5 px-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Tu razonamiento deductivo:
              </p>
              {completedSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 text-xs shrink-0 mt-0.5 font-bold">→</span>
                  <p className="text-xs text-muted-foreground">{step.elimination}</p>
                </div>
              ))}
              <div className="flex items-start gap-2 mt-1">
                <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">★</span>
                <p className="text-xs font-semibold text-foreground">
                  Resultado: {wizardState.result.label} ({wizardState.result.hebrewName})
                </p>
              </div>
            </div>
          )}

          <button
            id="phase5-continue"
            onClick={() => onComplete(wizardState.result.binyan)}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm
              hover:bg-indigo-600 transition-colors"
          >
            Continuar →
          </button>
        </div>
      )}
    </div>
  );
};
