/**
 * VerbTable
 *
 * Summary table of all verbs found in the analyzed verse.
 * Shows: word, transliteration, binyan, form, PGN (person/gender/number),
 * state, root, and translation at a glance.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { VerseAnalysis } from '@dosfilos/domain';

interface VerbTableProps {
  verbTable: VerseAnalysis['verbTable'];
}

export const VerbTable: React.FC<VerbTableProps> = ({ verbTable }) => {
  const { t } = useTranslation('hebrewTutor');

  if (!verbTable?.length) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>📊</span>
        {t('verseAnalyzer.analysis.verbTable')}
      </h3>

      <div className="overflow-x-auto print:overflow-visible rounded-xl border border-border">
        <table className="w-full text-sm border-collapse verb-table">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
              <th className="text-right px-3 py-2.5 font-medium border-b border-border">Palabra</th>
              <th className="text-left px-3 py-2.5 font-medium border-b border-border">Translit.</th>
              <th className="text-left px-3 py-2.5 font-medium border-b border-border">Binyan</th>
              <th className="text-left px-3 py-2.5 font-medium border-b border-border">Forma</th>
              <th className="text-center px-3 py-2.5 font-medium border-b border-border">Pers.</th>
              <th className="text-center px-3 py-2.5 font-medium border-b border-border">Gén.</th>
              <th className="text-center px-3 py-2.5 font-medium border-b border-border">Núm.</th>
              <th className="text-left px-3 py-2.5 font-medium border-b border-border">Raíz</th>
              <th className="text-left px-3 py-2.5 font-medium border-b border-border">Traducción</th>
            </tr>
          </thead>
          <tbody>
            {verbTable.map((row, i) => (
              <tr
                key={i}
                className="hover:bg-muted/20 transition-colors border-b border-border/50 last:border-0 print:break-inside-avoid"
              >
                <td className="px-3 py-2.5 text-right">
                  <span dir="rtl" className="font-serif text-base text-foreground">{row.hebrewForm}</span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground italic text-xs">{row.transliteration}</td>
                <td className="px-3 py-2.5">
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-semibold px-1.5 py-0.5 rounded">
                    {row.binyan ?? '—'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-foreground/80">
                  {row.verbForm
                    ? t(`verseAnalyzer.verbForms.${row.verbForm}`, { defaultValue: row.verbForm })
                    : '—'}
                </td>
                <td className="px-3 py-2.5 text-center text-xs text-foreground/80">{row.pgn ? row.pgn[0] : '—'}</td>
                <td className="px-3 py-2.5 text-center text-xs text-foreground/80">{row.pgn ? row.pgn[1]?.toUpperCase() : '—'}</td>
                <td className="px-3 py-2.5 text-center text-xs text-foreground/80">{row.pgn ? row.pgn[2]?.toUpperCase() : '—'}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    {row.root && (
                      <span dir="rtl" className="font-serif text-sm text-violet-700 dark:text-violet-400">
                        {row.root}
                      </span>
                    )}
                    {row.verbType && (
                      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-tight">
                        {t(`verseAnalyzer.verbTypes.${row.verbType}`, { defaultValue: row.verbType })}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-foreground/80">{row.rootTranslation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
