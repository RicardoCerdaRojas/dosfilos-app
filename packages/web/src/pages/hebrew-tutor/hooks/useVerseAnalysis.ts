/**
 * useVerseAnalysis
 *
 * Hook that drives the verse analysis flow:
 *  - Lazy-loads navigation index for the selected book
 *  - Triggers verse analysis on demand
 *  - Manages loading/error states
 */

import { useState, useCallback, useEffect } from 'react';
import { useHebrewTutor } from '../HebrewTutorProvider';
import { useAuthorization } from '../../../hooks/useAuthorization';
import type { VerseAnalysis, BookIndex } from '@dosfilos/domain';

interface UseVerseAnalysisState {
  /** Currently selected book key (morphhb key) */
  selectedBook: string;
  selectedChapter: number;
  selectedVerse: number;
  /** Navigation data for the selected book */
  bookIndex: BookIndex | null;
  /** Most recent analysis result */
  analysis: VerseAnalysis | null;
  isLoadingIndex: boolean;
  isAnalyzing: boolean;
  error: string | null;
  canReanalyze: boolean;
}

interface UseVerseAnalysisActions {
  setBook: (key: string) => void;
  setChapter: (chap: number) => void;
  setVerse: (v: number) => void;
  analyze: (forceRefresh?: boolean) => Promise<void>;
  clearError: () => void;
}

export function useVerseAnalysis(): UseVerseAnalysisState & UseVerseAnalysisActions {
  const { analyzeVerse, getBibleNavigation } = useHebrewTutor();

  const [selectedBook, setSelectedBook] = useState('Jonah');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [bookIndex, setBookIndex] = useState<BookIndex | null>(null);
  const [analysis, setAnalysis] = useState<VerseAnalysis | null>(null);
  const [isLoadingIndex, setIsLoadingIndex] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isAdmin } = useAuthorization();
  const [refreshCounts, setRefreshCounts] = useState<Record<string, number>>({});
  
  const currentKey = `${selectedBook}_${selectedChapter}_${selectedVerse}`;
  const canReanalyze = isAdmin || (refreshCounts[currentKey] || 0) < 2;

  // Load navigation index whenever the book changes
  useEffect(() => {
    let cancelled = false;
    setIsLoadingIndex(true);
    setBookIndex(null);
    setAnalysis(null);

    getBibleNavigation
      .getBookIndex(selectedBook)
      .then(({ bookIndex }) => {
        if (!cancelled) {
          setBookIndex(bookIndex);
          // Reset chapter/verse to 1:1 when switching books
          setSelectedChapter(1);
          setSelectedVerse(1);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(`No se pudo cargar el libro: ${err instanceof Error ? err.message : String(err)}`);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingIndex(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBook]); // eslint-disable-line react-hooks/exhaustive-deps

  const analyze = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh && !canReanalyze) {
        setError('Límite de actualizaciones alcanzado para este versículo.');
        return;
      }
      
      setIsAnalyzing(true);
      setError(null);
      try {
        const result = await analyzeVerse.execute({
          morphhbKey: selectedBook,
          chapter: selectedChapter,
          verse: selectedVerse,
          language: 'es',
          forceRefresh,
        });

        if (forceRefresh && !isAdmin) {
          setRefreshCounts((prev) => ({
            ...prev,
            [currentKey]: (prev[currentKey] || 0) + 1,
          }));
        }

        setAnalysis(result);
      } catch (err) {
        setError(
          `Error al analizar el versículo: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [analyzeVerse, selectedBook, selectedChapter, selectedVerse, canReanalyze, currentKey, isAdmin],
  );

  const setBook = useCallback((key: string) => {
    setSelectedBook(key);
    setAnalysis(null);
  }, []);

  const setChapter = useCallback((chap: number) => {
    setSelectedChapter(chap);
    setAnalysis(null);
  }, []);

  const setVerse = useCallback((v: number) => {
    setSelectedVerse(v);
    setAnalysis(null);
  }, []);

  return {
    selectedBook,
    selectedChapter,
    selectedVerse,
    bookIndex,
    analysis,
    isLoadingIndex,
    isAnalyzing,
    error,
    canReanalyze,
    setBook,
    setChapter,
    setVerse,
    analyze,
    clearError: () => setError(null),
  };
}
