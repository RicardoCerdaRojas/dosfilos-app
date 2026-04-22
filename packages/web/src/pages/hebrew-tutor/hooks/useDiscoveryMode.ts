/**
 * useDiscoveryMode
 *
 * Hook that drives the Discovery Mode ("Modo Descubrimiento") flow:
 *
 *  1. Student selects a verse via the shared navigation controls.
 *  2. The full analysis is executed via AnalyzeVerseUseCase but kept
 *     HIDDEN from the student — only used internally for validation.
 *  3. Words are presented one-by-one in RTL order (no skipping).
 *  4. For each word the student opens the detective (verb/nominal/particle).
 *  5. Word translations accumulate in a "translation builder".
 *  6. Once all words are done, the student edits their full translation.
 *  7. The expert analysis is revealed for side-by-side comparison.
 *
 * Design decision (Option C): a single Gemini call at the start; the
 * analysis data powers detective validation without ever being shown
 * until the student finishes.
 */

import { useState, useCallback, useEffect } from 'react';
import { useHebrewTutor } from '../HebrewTutorProvider';
import type { VerseAnalysis, WordAnalysis, BookIndex, HebrewVerse } from '@dosfilos/domain';

// ── Types ────────────────────────────────────────────────────────────────────

export type DiscoveryWordStatus = 'pending' | 'active' | 'completed';

export interface DiscoveryWordState {
  /** Index in the analysis.words array */
  readonly index: number;
  /** The full WordAnalysis from the hidden expert analysis */
  readonly word: WordAnalysis;
  /** Current status in the discovery flow */
  status: DiscoveryWordStatus;
  /** Student's translation for this word (set after detective) */
  studentTranslation: string;
  /** Whether detective was completed for this word */
  detectiveCompleted: boolean;
  /** Detective score (0-100) if applicable */
  detectiveScore?: number;
}

export type DiscoveryPhase =
  | 'idle'          // No verse selected
  | 'preparing'     // Running hidden analysis
  | 'investigating' // Student working through words
  | 'composing'     // Student editing full translation
  | 'comparing';    // Side-by-side comparison

export interface UseDiscoveryModeReturn {
  // Navigation state (shared with VerseAnalyzer)
  selectedBook: string;
  selectedChapter: number;
  selectedVerse: number;
  bookIndex: BookIndex | null;
  isLoadingIndex: boolean;
  error: string | null;

  // Discovery-specific state
  phase: DiscoveryPhase;
  /** Raw Hebrew verse for display during preparation */
  hebrewVerse: HebrewVerse | null;
  /** Words with their discovery state — available after 'preparing' */
  discoveryWords: DiscoveryWordState[];
  /** Index of the currently active word */
  activeWordIndex: number;
  /** The current active word's full WordAnalysis (for detective) */
  activeWord: WordAnalysis | null;
  /** Student's complete verse translation */
  studentFullTranslation: string;
  /** The hidden expert analysis — only exposed in 'comparing' phase */
  expertAnalysis: VerseAnalysis | null;
  /** Progress: number of completed words / total */
  completedCount: number;
  totalWords: number;
  /** Whether the verse reference for display */
  verseDisplayReference: string;

  // Actions
  setBook: (key: string) => void;
  setChapter: (chap: number) => void;
  setVerse: (v: number) => void;
  navigate: (book: string, chapter: number, verse: number) => void;
  nextVerse: () => void;
  prevVerse: () => void;

  /** Start the discovery process (triggers hidden analysis) */
  startDiscovery: () => Promise<void>;
  /** Mark the current word's detective as complete with a translation */
  completeWord: (translation: string, detectiveScore?: number) => void;
  /** Skip the current word's detective (free-form translation only) */
  setWordTranslation: (translation: string) => void;
  /** Move to composing phase */
  finishInvestigation: () => void;
  /** Set the student's full translation */
  setStudentFullTranslation: (text: string) => void;
  /** Move to comparing phase */
  submitTranslation: () => void;
  /** Reset to idle */
  reset: () => void;
  /** Clear error */
  clearError: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDiscoveryMode(): UseDiscoveryModeReturn {
  const { analyzeVerse, getBibleNavigation, getVerseText } = useHebrewTutor();

  // Navigation state
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [bookIndex, setBookIndex] = useState<BookIndex | null>(null);
  const [isLoadingIndex, setIsLoadingIndex] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discovery state
  const [phase, setPhase] = useState<DiscoveryPhase>('idle');
  const [hebrewVerse, setHebrewVerse] = useState<HebrewVerse | null>(null);
  const [hiddenAnalysis, setHiddenAnalysis] = useState<VerseAnalysis | null>(null);
  const [discoveryWords, setDiscoveryWords] = useState<DiscoveryWordState[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [studentFullTranslation, setStudentFullTranslation] = useState('');

  // ── Persistence helpers ─────────────────────────────────────────────────

  const getStorageKey = useCallback((book: string, chapter: number, verse: number) => {
    return `hebrew_tutor_discovery_${book}_${chapter}_${verse}`;
  }, []);

  const saveProgress = useCallback((
    ph: DiscoveryPhase, 
    words: DiscoveryWordState[], 
    activeIdx: number, 
    fullTrans: string,
    analysis: VerseAnalysis | null
  ) => {
    if (!selectedBook || !analysis) return;
    try {
      const data = {
        phase: ph,
        discoveryWords: words,
        activeWordIndex: activeIdx,
        studentFullTranslation: fullTrans,
        hiddenAnalysis: analysis,
      };
      localStorage.setItem(getStorageKey(selectedBook, selectedChapter, selectedVerse), JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save discovery progress', e);
    }
  }, [selectedBook, selectedChapter, selectedVerse, getStorageKey]);

  // Save progress whenever these change
  useEffect(() => {
    if (phase !== 'idle' && phase !== 'preparing') {
      saveProgress(phase, discoveryWords, activeWordIndex, studentFullTranslation, hiddenAnalysis);
    }
  }, [phase, discoveryWords, activeWordIndex, studentFullTranslation, hiddenAnalysis, saveProgress]);

  // ── Book index loading ──────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedBook) {
      setBookIndex(null);
      return;
    }

    let cancelled = false;
    setIsLoadingIndex(true);
    setBookIndex(null);

    getBibleNavigation
      .getBookIndex(selectedBook)
      .then(({ bookIndex }) => {
        if (!cancelled) setBookIndex(bookIndex);
      })
      .catch((err) => {
        if (!cancelled)
          setError(`No se pudo cargar el libro: ${err instanceof Error ? err.message : String(err)}`);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingIndex(false);
      });

    return () => { cancelled = true; };
  }, [selectedBook]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation helpers ──────────────────────────────────────────────────

  const navigateToVerse = useCallback(
    (book: string, chapter: number, verse: number) => {
      // Reset discovery state on navigation
      setPhase('idle');
      setHiddenAnalysis(null);
      setDiscoveryWords([]);
      setActiveWordIndex(0);
      setStudentFullTranslation('');
      setHebrewVerse(null);

      setSelectedBook(book);
      setSelectedChapter(chapter);
      setSelectedVerse(verse);

      // Load raw Hebrew text for preview
      getVerseText
        .execute({ morphhbKey: book, chapter, verse })
        .then(setHebrewVerse)
        .catch(() => { /* silent — verse preview is optional */ });
    },
    [getVerseText],
  );

  const setBook = useCallback(
    (key: string) => navigateToVerse(key, 1, 1),
    [navigateToVerse],
  );

  const setChapter = useCallback(
    (chap: number) => navigateToVerse(selectedBook, chap, 1),
    [navigateToVerse, selectedBook],
  );

  const setVerse = useCallback(
    (v: number) => navigateToVerse(selectedBook, selectedChapter, v),
    [navigateToVerse, selectedBook, selectedChapter],
  );

  const nextVerse = useCallback(() => {
    if (!bookIndex) return;
    const versesInChapter = bookIndex.versesPerChapter[selectedChapter - 1] ?? 1;
    const totalChapters = bookIndex.versesPerChapter.length;
    if (selectedVerse < versesInChapter) {
      navigateToVerse(selectedBook, selectedChapter, selectedVerse + 1);
    } else if (selectedChapter < totalChapters) {
      navigateToVerse(selectedBook, selectedChapter + 1, 1);
    }
  }, [bookIndex, selectedBook, selectedChapter, selectedVerse, navigateToVerse]);

  const prevVerse = useCallback(() => {
    if (!bookIndex) return;
    if (selectedVerse > 1) {
      navigateToVerse(selectedBook, selectedChapter, selectedVerse - 1);
    } else if (selectedChapter > 1) {
      const prevChapterVerses = bookIndex.versesPerChapter[selectedChapter - 2] ?? 1;
      navigateToVerse(selectedBook, selectedChapter - 1, prevChapterVerses);
    }
  }, [bookIndex, selectedBook, selectedChapter, selectedVerse, navigateToVerse]);

  // ── Start discovery (hidden analysis) ───────────────────────────────────

  const startDiscovery = useCallback(async () => {
    if (!selectedBook) return;
    setPhase('preparing');
    setError(null);

    try {
      // 1. Try to restore progress
      const storageKey = getStorageKey(selectedBook, selectedChapter, selectedVerse);
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.discoveryWords && parsed.hiddenAnalysis) {
            setHiddenAnalysis(parsed.hiddenAnalysis);
            setDiscoveryWords(parsed.discoveryWords);
            setActiveWordIndex(parsed.activeWordIndex || 0);
            setStudentFullTranslation(parsed.studentFullTranslation || '');
            setPhase(parsed.phase || 'investigating');
            
            // Fetch the raw verse text so the preview has full punctuation (like sof pasuq)
            // even when restoring from local storage.
            getVerseText
              .execute({ morphhbKey: selectedBook, chapter: selectedChapter, verse: selectedVerse })
              .then(setHebrewVerse)
              .catch(() => { /* silent fallback */ });
              
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to restore discovery progress', e);
      }

      // 2. Fresh analysis
      const analysis = await analyzeVerse.execute({
        morphhbKey: selectedBook,
        chapter: selectedChapter,
        verse: selectedVerse,
        language: 'es',
        forceRefresh: false,
      });

      setHiddenAnalysis(analysis);

      // Fetch the raw verse text so the preview has full punctuation
      getVerseText
        .execute({ morphhbKey: selectedBook, chapter: selectedChapter, verse: selectedVerse })
        .then(setHebrewVerse)
        .catch(() => { /* silent fallback */ });

      // Build discovery word states — first word is active
      const words: DiscoveryWordState[] = analysis.words.map((w, i) => ({
        index: i,
        word: w,
        status: i === 0 ? 'active' : 'pending',
        studentTranslation: '',
        detectiveCompleted: false,
      }));

      setDiscoveryWords(words);
      setActiveWordIndex(0);
      setPhase('investigating');
      
      // Initial save
      saveProgress('investigating', words, 0, '', analysis);
    } catch (err) {
      setError(
        `Error al preparar el versículo: ${err instanceof Error ? err.message : String(err)}`,
      );
      setPhase('idle');
    }
  }, [analyzeVerse, selectedBook, selectedChapter, selectedVerse, getStorageKey, saveProgress]);

  // ── Word completion ─────────────────────────────────────────────────────

  const completeWord = useCallback(
    (translation: string, detectiveScore?: number) => {
      setDiscoveryWords((prev) => {
        const updated = [...prev];
        // Mark current word as completed
        updated[activeWordIndex] = {
          ...updated[activeWordIndex],
          status: 'completed',
          studentTranslation: translation,
          detectiveCompleted: true,
          detectiveScore,
        };

        // Activate next pending word if available
        const nextIdx = updated.findIndex((w, i) => i > activeWordIndex && w.status === 'pending');
        if (nextIdx !== -1) {
          updated[nextIdx] = { ...updated[nextIdx], status: 'active' };
          setActiveWordIndex(nextIdx);
        }

        return updated;
      });
    },
    [activeWordIndex],
  );

  const setWordTranslation = useCallback(
    (translation: string) => {
      setDiscoveryWords((prev) => {
        const updated = [...prev];
        updated[activeWordIndex] = {
          ...updated[activeWordIndex],
          status: 'completed',
          studentTranslation: translation,
          detectiveCompleted: false,
        };

        const nextIdx = updated.findIndex((w, i) => i > activeWordIndex && w.status === 'pending');
        if (nextIdx !== -1) {
          updated[nextIdx] = { ...updated[nextIdx], status: 'active' };
          setActiveWordIndex(nextIdx);
        }

        return updated;
      });
    },
    [activeWordIndex],
  );

  // ── Phase transitions ───────────────────────────────────────────────────

  const finishInvestigation = useCallback(() => {
    // Auto-build initial full translation from word translations
    const assembled = discoveryWords
      .map((w) => w.studentTranslation)
      .filter(Boolean)
      .join(' ');
    setStudentFullTranslation(assembled);
    setPhase('composing');
  }, [discoveryWords]);

  const submitTranslation = useCallback(() => {
    setPhase('comparing');
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setHiddenAnalysis(null);
    setDiscoveryWords([]);
    setActiveWordIndex(0);
    setStudentFullTranslation('');
    
    // Clear storage for this verse
    if (selectedBook) {
      try {
        localStorage.removeItem(getStorageKey(selectedBook, selectedChapter, selectedVerse));
      } catch (_e) { /* localStorage unavailable (e.g. private mode) */ }
    }
  }, [selectedBook, selectedChapter, selectedVerse, getStorageKey]);

  // ── Derived values ──────────────────────────────────────────────────────

  const completedCount = discoveryWords.filter((w) => w.status === 'completed').length;
  const totalWords = discoveryWords.length;
  const activeWord = discoveryWords[activeWordIndex]?.word ?? null;
  const verseDisplayReference = hiddenAnalysis?.reference
    ?? hebrewVerse?.displayReference
    ?? `${selectedBook} ${selectedChapter}:${selectedVerse}`;

  return {
    // Navigation
    selectedBook,
    selectedChapter,
    selectedVerse,
    bookIndex,
    isLoadingIndex,
    error,

    // Discovery
    phase,
    hebrewVerse,
    discoveryWords,
    activeWordIndex,
    activeWord,
    studentFullTranslation,
    expertAnalysis: phase === 'comparing' ? hiddenAnalysis : null,
    completedCount,
    totalWords,
    verseDisplayReference,

    // Navigation actions
    setBook,
    setChapter,
    setVerse,
    navigate: (b, c, v) => navigateToVerse(b, c, v),
    nextVerse,
    prevVerse,

    // Discovery actions
    startDiscovery,
    completeWord,
    setWordTranslation,
    finishInvestigation,
    setStudentFullTranslation,
    submitTranslation,
    reset,
    clearError: () => setError(null),
  };
}
