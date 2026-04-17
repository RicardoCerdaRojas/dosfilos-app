import { useState, useEffect, useCallback } from 'react';
import type { HintDefinition } from '@dosfilos/domain';
import { hintRepository } from '../../pages/hebrew-tutor/hints/FirebaseHintRepository';
import { invalidateHintCache } from '../../pages/hebrew-tutor/hooks/useContextualHints';

interface UseAdminHintsResult {
  hints: HintDefinition[];
  isLoading: boolean;
  error: Error | null;
  createHint: (hint: Omit<HintDefinition, 'id'>) => Promise<void>;
  updateHint: (id: string, patch: Partial<Omit<HintDefinition, 'id'>>) => Promise<void>;
  deleteHint: (id: string) => Promise<void>;
  toggleHint: (id: string, enabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAdminHints(): UseAdminHintsResult {
  const [hints, setHints] = useState<HintDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadHints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await hintRepository.listAll();
      setHints(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error loading hints'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHints();
  }, [loadHints]);

  const wrapMutation = async (mutation: () => Promise<void>) => {
    try {
      await mutation();
      invalidateHintCache();
      await loadHints();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Mutation failed'));
      throw err;
    }
  };

  const createHint = (hint: Omit<HintDefinition, 'id'>) =>
    wrapMutation(async () => {
      await hintRepository.create(hint);
    });

  const updateHint = (id: string, patch: Partial<Omit<HintDefinition, 'id'>>) =>
    wrapMutation(async () => {
      await hintRepository.update(id, patch);
    });

  const deleteHint = (id: string) =>
    wrapMutation(async () => {
      // Local hints cannot be deleted from firestore directly.
      // But we call delete on the repository. It will attempt to delete the remote override if any,
      // or try to delete a local ID which won't exist in Firestore. The UI should probably warn about local hints.
      await hintRepository.delete(id);
    });

  const toggleHint = (id: string, enabled: boolean) =>
    wrapMutation(async () => {
      await hintRepository.toggleEnabled(id, enabled);
    });

  return {
    hints,
    isLoading,
    error,
    createHint,
    updateHint,
    deleteHint,
    toggleHint,
    refresh: loadHints,
  };
}
