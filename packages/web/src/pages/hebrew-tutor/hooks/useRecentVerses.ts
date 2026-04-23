import { useState, useEffect, useCallback } from 'react';
import { HEBREW_BOOKS_CATALOG } from '@dosfilos/infrastructure';

const STORAGE_KEY = 'ht-recent-verses';
const MAX_ENTRIES = 5;

export interface RecentVerse {
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  analyzedAt: string; // ISO string
}

function readRecent(): RecentVerse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentVerse[];
  } catch {
    return [];
  }
}

export function addRecentVerse(book: string, chapter: number, verse: number): void {
  try {
    const bookName =
      HEBREW_BOOKS_CATALOG.find((b) => b.morphhbKey === book)?.nameSpanish ?? book;
    const entry: RecentVerse = { book, bookName, chapter, verse, analyzedAt: new Date().toISOString() };
    const existing = readRecent().filter((r) => !(r.book === book && r.chapter === chapter && r.verse === verse));
    const next = [entry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode etc.)
  }
}

export function useRecentVerses() {
  const [recents, setRecents] = useState<RecentVerse[]>(() => readRecent());

  const refresh = useCallback(() => setRecents(readRecent()), []);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [refresh]);

  return { recents, refresh };
}
