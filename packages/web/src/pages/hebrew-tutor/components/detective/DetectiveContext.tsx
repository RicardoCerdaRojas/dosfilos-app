/**
 * DetectiveContext
 *
 * Lightweight React context for sharing cross-cutting data between
 * the detective panel and deeply nested phase components (e.g., DetectiveHeroCard).
 *
 * This avoids prop-drilling adjacentWords through every intermediate phase component.
 */

import { createContext, useContext } from 'react';

/** Minimal word info needed for the adjacent context display */
export interface AdjacentWordInfo {
  hebrewText: string;
  transliteration?: string;
}

export interface DetectiveContextValue {
  /** Adjacent words for contextual display in the hero card */
  adjacentWords?: {
    prev?: AdjacentWordInfo | null;
    next?: AdjacentWordInfo | null;
  };
}

const DetectiveContext = createContext<DetectiveContextValue>({});

export const DetectiveContextProvider = DetectiveContext.Provider;

/** Hook to access detective-level context from any nested phase component */
export function useDetectiveContext(): DetectiveContextValue {
  return useContext(DetectiveContext);
}
