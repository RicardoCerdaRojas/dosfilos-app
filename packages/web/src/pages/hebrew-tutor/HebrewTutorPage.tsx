/**
 * HebrewTutorPage
 *
 * Entry point for the Hebrew Tutor module, wrapped in the provider.
 * Routes to the active tool (currently: VerseAnalyzer only).
 */

import React from 'react';
import { HebrewTutorProvider } from './HebrewTutorProvider';
import { VerseAnalyzerPage } from './VerseAnalyzerPage';

export const HebrewTutorPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-background print:block print:h-auto">
      <HebrewTutorProvider>
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 print:p-0 print:overflow-visible print:block print:h-auto">
          <VerseAnalyzerPage />
        </div>
      </HebrewTutorProvider>
    </div>
  );
};
