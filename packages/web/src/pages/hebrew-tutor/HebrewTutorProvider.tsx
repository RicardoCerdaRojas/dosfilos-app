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
import { FirebaseLexiconRepository } from './lexicon/FirebaseLexiconRepository';
import {
  AnalyzeVerseUseCase,
  GetBibleNavigationUseCase,
  GetVerseTextUseCase,
  SaveDetectiveSessionUseCase,
} from '@dosfilos/application';

interface HebrewTutorContextType {
  analyzeVerse: AnalyzeVerseUseCase;
  getBibleNavigation: GetBibleNavigationUseCase;
  getVerseText: GetVerseTextUseCase;
  checkCache: (reference: string) => Promise<import('@dosfilos/domain').VerseAnalysis | null>;
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
    const lexiconRepository = new FirebaseLexiconRepository();

    // Cast to include loadBook — MorphhbBibleProvider exposes it publicly
    const provider = bibleProvider as typeof bibleProvider & { loadBook(key: string): Promise<void> };

    return {
      analyzeVerse: new AnalyzeVerseUseCase(provider, analysisService, sessionRepository, lexiconRepository),
      getBibleNavigation: new GetBibleNavigationUseCase(provider),
      getVerseText: new GetVerseTextUseCase(provider),
      checkCache: (ref: string) => sessionRepository.getCachedAnalysis(ref),
      saveDetectiveSession: new SaveDetectiveSessionUseCase(detectiveRepository),
    };
  }, [apiKey]);

  return <HebrewTutorContext.Provider value={value}>{children}</HebrewTutorContext.Provider>;
};
