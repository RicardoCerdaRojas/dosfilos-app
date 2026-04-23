/**
 * ModeSelectorInline
 *
 * Compact mode switcher designed to sit inline alongside the VerseNavBar
 * in a single header row. Hides the subtitle on narrow viewports.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpenIcon, SearchIcon } from 'lucide-react';
import type { TutorMode } from '../HebrewTutorPage';

interface ModeSelectorInlineProps {
  mode: TutorMode;
  onModeChange: (mode: TutorMode) => void;
}

const MODES = [
  {
    id: 'analyzer' as TutorMode,
    icon: BookOpenIcon,
    labelKey: 'modes.analyzer',
    labelDefault: 'Analizador',
    descKey: 'modes.analyzerDesc',
    descDefault: 'Morfología completa',
    activeClass: 'bg-background text-foreground border-border/60 shadow-sm',
    activeIconClass: 'text-foreground',
  },
  {
    id: 'discovery' as TutorMode,
    icon: SearchIcon,
    labelKey: 'modes.discovery',
    labelDefault: 'Modo Traducción',
    descKey: 'modes.discoveryDesc',
    descDefault: 'Traduce y compara',
    activeClass:
      'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40 shadow-sm',
    activeIconClass: 'text-indigo-600 dark:text-indigo-400',
  },
] as const;

export const ModeSelectorInline: React.FC<ModeSelectorInlineProps> = ({ mode, onModeChange }) => {
  const { t } = useTranslation('hebrewTutor');

  return (
    <div className="flex items-center gap-1 shrink-0">
      {MODES.map(({ id, icon: Icon, labelKey, labelDefault, descKey, descDefault, activeClass, activeIconClass }) => {
        const isActive = mode === id;
        return (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-xl border text-left
              transition-all duration-200 group
              ${isActive
                ? activeClass
                : 'bg-muted/20 border-border/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-border/40'}
            `}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? activeIconClass : 'opacity-60 group-hover:opacity-80'}`} />
            <div className="min-w-0">
              <div className={`text-xs font-semibold leading-none ${isActive ? '' : 'opacity-80'}`}>
                {t(labelKey, { defaultValue: labelDefault })}
              </div>
              <div className={`text-[10px] leading-tight mt-0.5 hidden lg:block ${isActive ? 'opacity-60' : 'opacity-40 group-hover:opacity-55'}`}>
                {t(descKey, { defaultValue: descDefault })}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
