/**
 * useAdminLexicon
 *
 * React hook for SuperAdmin CRUD of the Hebrew lexical glossary.
 * Follows the same pattern as useAdminHints.
 *
 * Provides the full list of entries (including disabled) and mutation
 * helpers for create, update, toggle, and delete operations.
 */

import { useState, useEffect, useCallback } from 'react';
import type { LexicalEntry } from '@dosfilos/domain';
import { FirebaseLexiconRepository } from '@/pages/hebrew-tutor/lexicon/FirebaseLexiconRepository';

const repository = new FirebaseLexiconRepository();

export function useAdminLexicon() {
  const [entries, setEntries] = useState<LexicalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await repository.getForAdmin();
      setEntries(data);
    } catch (error) {
      console.error('useAdminLexicon: failed to load entries', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createEntry = useCallback(
    async (payload: Omit<LexicalEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      await repository.create(payload);
      await load();
    },
    [load],
  );

  const updateEntry = useCallback(
    async (id: string, payload: Partial<Omit<LexicalEntry, 'id' | 'createdAt' | 'updatedAt'>>) => {
      await repository.update(id, payload);
      await load();
    },
    [load],
  );

  const toggleEntry = useCallback(
    async (id: string, enabled: boolean) => {
      await repository.toggle(id, enabled);
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, enabled } : e)));
    },
    [],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      await repository.delete(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [],
  );

  return {
    entries,
    isLoading,
    createEntry,
    updateEntry,
    toggleEntry,
    deleteEntry,
  };
}
