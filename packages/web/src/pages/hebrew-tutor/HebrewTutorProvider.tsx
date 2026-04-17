/**
 * HebrewTutorContext
 *
 * Provides instantiated use cases to the Hebrew Tutor components.
 * Follows the same dependency-injection pattern as GreekTutorProvider.
 */

import React, { createContext, useContext, useMemo } from 'react';
import {
  MorphhbBibleProvider,
  GeminiHebrewService,
  FirebaseHebrewSessionRepository,
  FirestoreDetectiveSessionRepository,
} from '@dosfilos/infrastructure';
import {
  AnalyzeVerseUseCase,
  GetBibleNavigationUseCase,
  SaveDetectiveSessionUseCase,
} from '@dosfilos/application';

interface HebrewTutorContextType {
  analyzeVerse: AnalyzeVerseUseCase;
  getBibleNavigation: GetBibleNavigationUseCase;
  saveDetectiveSession: SaveDetectiveSessionUseCase;
}

const HebrewTutorContext = createContext<HebrewTutorContextType | null>(null);

export function useHebrewTutor(): HebrewTutorContextType {
  const ctx = useContext(HebrewTutorContext);
  if (!ctx) throw new Error('useHebrewTutor must be used inside HebrewTutorProvider');
  return ctx;
}

export const HebrewTutorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? '';

  const value = useMemo<HebrewTutorContextType>(() => {
    const bibleProvider = new MorphhbBibleProvider();
    const analysisService = new GeminiHebrewService(apiKey);
    const sessionRepository = new FirebaseHebrewSessionRepository();
    const detectiveRepository = new FirestoreDetectiveSessionRepository();

    // Cast to include loadBook — MorphhbBibleProvider exposes it publicly
    const provider = bibleProvider as typeof bibleProvider & { loadBook(key: string): Promise<void> };

    return {
      analyzeVerse: new AnalyzeVerseUseCase(provider, analysisService, sessionRepository),
      getBibleNavigation: new GetBibleNavigationUseCase(provider),
      saveDetectiveSession: new SaveDetectiveSessionUseCase(detectiveRepository),
    };
  }, [apiKey]);

  return <HebrewTutorContext.Provider value={value}>{children}</HebrewTutorContext.Provider>;
};
