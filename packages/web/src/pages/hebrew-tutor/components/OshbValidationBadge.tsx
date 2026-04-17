/**
 * OshbValidationBadge
 *
 * Shows whether the Gemini/Farfán analysis agrees with the OSHB
 * morphological code. Visible to the user and interactive (shows
 * OSHB code + Farfán analysis on hover/click).
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { OshbReference } from '@dosfilos/domain';

interface OshbValidationBadgeProps {
  oshb?: OshbReference;
}

export const OshbValidationBadge: React.FC<OshbValidationBadgeProps> = ({ oshb }) => {
  const { t } = useTranslation('hebrewTutor');
  const [open, setOpen] = useState(false);

  if (!oshb) return null;

  const confirmed = oshb.agreesWithFarfan;

  return (
    <div className="relative inline-block">
      <button
        id="oshb-badge-btn"
        onClick={() => setOpen((o) => !o)}
        title={confirmed ? t('verseAnalyzer.oshb.confirmed') : t('verseAnalyzer.oshb.differs')}
        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border cursor-pointer transition-all ${
          confirmed
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
        }`}
      >
        {confirmed ? '✓' : '~'} OSHB
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-1.5 z-20 w-56 rounded-lg bg-popover border border-border shadow-lg p-3 text-xs space-y-1.5"
          role="tooltip"
        >
          <div>
            <span className="font-medium text-muted-foreground">{t('verseAnalyzer.oshb.code')}: </span>
            <span className="font-mono text-foreground">{oshb.code}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">{t('verseAnalyzer.oshb.farfanAnalysis')}: </span>
            <span className="text-foreground">{oshb.farfanEquivalent}</span>
          </div>
          {oshb.note && (
            <p className="text-muted-foreground italic border-t border-border pt-1.5 mt-1">{oshb.note}</p>
          )}
        </div>
      )}
    </div>
  );
};
