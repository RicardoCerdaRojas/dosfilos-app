/**
 * DetectivePhaseHeader
 *
 * Shared single-row header for every investigation phase in the Detective Wizard.
 * Renders a compact phase badge (number + name) and the primary question
 * on the same horizontal line, avoiding the vertical waste of the previous
 * two-block pattern.
 *
 * Usage:
 *   <DetectivePhaseHeader step={2} name="Reconocimiento de Raíz"
 *     question="¿Cuántas letras radicales puedes identificar?" />
 */

import React from 'react';

interface DetectivePhaseHeaderProps {
  /** Visual step number shown in the badge (1-based) */
  step: number;
  /** Short display name of the phase, e.g. "Triage" */
  name: string;
  /** The primary question the student must answer */
  question: string;
}

export const DetectivePhaseHeader: React.FC<DetectivePhaseHeaderProps> = ({
  step,
  name,
  question,
}) => (
  <div className="mb-5 pb-4 border-b border-border">
    {/* Compact single-line bar: badge · question */}
    <div className="flex items-start gap-3">
      {/* Phase badge */}
      <div className="flex-shrink-0 flex flex-col items-center pt-0.5">
        <div className="w-6 h-6 rounded-md bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center leading-none">
          {step}
        </div>
      </div>

      {/* Texts */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-none mb-1">
          {name}
        </p>
        <h3 className="text-sm font-semibold text-foreground leading-snug">
          {question}
        </h3>
      </div>
    </div>
  </div>
);
