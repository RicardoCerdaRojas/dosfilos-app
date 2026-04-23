/**
 * HebrewTutorPage
 *
 * Entry point for the Hebrew Tutor module.
 * Owns mode state and toolbar collapsed state (persisted in localStorage).
 * Passes both as props so each page can render the unified collapsible toolbar.
 */

import React, { useState } from 'react';
import { HebrewTutorProvider } from './HebrewTutorProvider';
import { VerseAnalyzerPage } from './VerseAnalyzerPage';
import { DiscoveryModePage } from './DiscoveryModePage';

export type TutorMode = 'analyzer' | 'discovery';

const TOOLBAR_KEY = 'ht-toolbar-collapsed';

export const HebrewTutorPage: React.FC = () => {
  const [mode, setMode] = useState<TutorMode>('analyzer');
  const [toolbarCollapsed, setToolbarCollapsed] = useState(() => {
    try { return localStorage.getItem(TOOLBAR_KEY) === 'true'; } catch { return false; }
  });

  const toggleToolbar = () => {
    setToolbarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(TOOLBAR_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-background print:block print:h-auto">
      <HebrewTutorProvider>
        {mode === 'analyzer'
          ? <VerseAnalyzerPage
              mode={mode}
              onModeChange={setMode}
              toolbarCollapsed={toolbarCollapsed}
              onToggleToolbar={toggleToolbar}
            />
          : <DiscoveryModePage
              mode={mode}
              onModeChange={setMode}
              toolbarCollapsed={toolbarCollapsed}
              onToggleToolbar={toggleToolbar}
            />}
      </HebrewTutorProvider>
    </div>
  );
};
