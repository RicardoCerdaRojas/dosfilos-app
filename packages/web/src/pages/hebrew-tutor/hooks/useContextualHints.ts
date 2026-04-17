/**
 * useContextualHints
 *
 * React hook that resolves which hints apply for the current word and phase.
 *
 * - Loads the hint catalog from Firestore once per app session (cached).
 * - Falls back to local defaults immediately while loading or on error.
 * - Applies HintEngine.resolveHints() to return only relevant hints.
 */

import { useState, useEffect, useRef } from 'react';
import type { WordAnalysis, HintDefinition } from '@dosfilos/domain';
import { resolveHints } from '../hints/hint-engine';
import { hintRepository } from '../hints/FirebaseHintRepository';
import { DEFAULT_HINTS } from '../hints/default-hints';

// ── Module-level cache so Firestore is only queried once per session ──────

let cachedCatalog: HintDefinition[] | null = null;
let catalogLoading = false;
const listeners: Array<(catalog: HintDefinition[]) => void> = [];

async function loadCatalog(): Promise<void> {
  if (cachedCatalog !== null || catalogLoading) return;
  catalogLoading = true;

  try {
    const catalog = await hintRepository.listAll();
    cachedCatalog = catalog;
    listeners.forEach(fn => fn(catalog));
  } catch {
    cachedCatalog = DEFAULT_HINTS;
    listeners.forEach(fn => fn(DEFAULT_HINTS));
  } finally {
    catalogLoading = false;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────

interface UseContextualHintsResult {
  hints: HintDefinition[];
  isLoading: boolean;
}

/**
 * @param word    - The word being analyzed in the current wizard session.
 * @param phase   - The numeric value of the active DetectivePhase.
 */
export function useContextualHints(
  word: WordAnalysis | null,
  phase: number,
): UseContextualHintsResult {
  // Start with local defaults immediately so there is no empty-hints flash
  const [catalog, setCatalog] = useState<HintDefinition[]>(
    cachedCatalog ?? DEFAULT_HINTS,
  );
  const [isLoading, setIsLoading] = useState(cachedCatalog === null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (cachedCatalog !== null) {
      setCatalog(cachedCatalog);
      setIsLoading(false);
      return;
    }

    // Subscribe to the one-shot load
    const handler = (loaded: HintDefinition[]) => {
      if (mounted.current) {
        setCatalog(loaded);
        setIsLoading(false);
      }
    };
    listeners.push(handler);
    loadCatalog();

    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const hints = word ? resolveHints(catalog, word, phase) : [];

  return { hints, isLoading };
}

/**
 * Invalidates the module-level cache so the next hook mount triggers a
 * fresh Firestore read. Call this after admin CRUD operations.
 */
export function invalidateHintCache(): void {
  cachedCatalog = null;
}
