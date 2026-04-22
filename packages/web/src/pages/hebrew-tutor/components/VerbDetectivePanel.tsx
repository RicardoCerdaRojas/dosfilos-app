/**
 * VerbDetectivePanel
 *
 * Standalone lateral panel (Sheet) for the "Modo Detective" pedagogical tool.
 * Guides the student through a bifurcated 6-phase investigation to identify
 * a Hebrew verb's binyan and type, following Prof. Farfán's methodology.
 *
 * Flow:
 *  Phase 1: OBSERVE  (both paths)
 *  Phase 2: TRIAGE   (both paths) → forks into STRONG or WEAK path
 *
 *  Strong path: COLORS → DAGESH → BINYAN → STRONG_CONFIRM
 *  Weak path:   PREFORMATIVE → WEAK_ROOT → WEAK_BINYAN
 *
 * Features:
 *  - Drag handle on the left edge to resize panel width (persisted in localStorage)
 *  - Drag handle on sidebar right edge to resize sidebar width (persisted in localStorage)
 *  - Firestore session persistence via SaveDetectiveSessionUseCase
 *
 * Integration:
 *  - State lives in VerseAnalysisResult.tsx
 *  - Session persistence via useHebrewTutor().saveDetectiveSession
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import type { WordAnalysis, DetectivePhaseResult } from '@dosfilos/domain';
import { DetectivePhase, VerbType } from '@dosfilos/domain';
import { useHebrewTutor } from '../HebrewTutorProvider';
import { useFirebase } from '@/context/firebase-context';
import { DetectiveProgress } from './detective/DetectiveProgress';
import { DetectivePhase1Observe }        from './detective/DetectivePhase1Observe';
import { DetectivePhase2Triage }         from './detective/DetectivePhase2Triage';
import { DetectivePhase2Colors }         from './detective/DetectivePhase2Colors';
import { DetectivePhase4Dagesh }         from './detective/DetectivePhase4Dagesh';
import { DetectivePhase5Binyan }         from './detective/DetectivePhase5Binyan';
// DetectivePhase6WeakVerb is kept for the STRONG_CONFIRM phase only
import { DetectivePhase6WeakVerb }       from './detective/DetectivePhase6WeakVerb';
import { DetectivePhase3wPreformative }  from './detective/DetectivePhase3wPreformative';
import { DetectivePhase4wWeakRoot }      from './detective/DetectivePhase4wWeakRoot';
import { DetectivePhase5wWeakBinyan }    from './detective/DetectivePhase5wWeakBinyan';
import { DetectivePhaseTranslation }     from './detective/DetectivePhaseTranslation';
import { DetectivePhaseVerbForm }        from './detective/DetectivePhaseVerbForm';
import { DetectiveResultSummary }        from './detective/DetectiveResultSummary';
import { DetectiveContextProvider }      from './detective/DetectiveContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const PANEL_STORAGE_KEY   = 'detective-panel-width';
const SIDEBAR_STORAGE_KEY = 'detective-sidebar-width';
const DEFAULT_PANEL_WIDTH   = 580;
const MIN_PANEL_WIDTH       = 340;
const MAX_PANEL_WIDTH       = 900;
const DEFAULT_SIDEBAR_WIDTH = 176;   // ~w-44
const MIN_SIDEBAR_WIDTH     = 130;
const MAX_SIDEBAR_WIDTH     = 260;

// ── Investigation paths ───────────────────────────────────────────────────────

type InvestigationPath = 'strong' | 'weak' | null;

/**
 * Ordered phase sequences for each investigation path.
 * Phases 1-2 are shared; the rest diverge based on TRIAGE result.
 * The weak path ends at WEAK_BINYAN (Phase 5) — no Phase 6 needed
 * since the verb type was already established in WEAK_ROOT (Phase 4).
 *
 * The weak path is DYNAMIC: the PREFORMATIVE phase is only included
 * when the verb actually has a preformative morpheme (Imperfect forms).
 * Perfect, Infinitive, Imperative, and Participle forms skip it.
 */
const STRONG_PATH: DetectivePhase[] = [
  DetectivePhase.OBSERVE,
  DetectivePhase.TRIAGE,
  DetectivePhase.COLORS,
  DetectivePhase.DAGESH,
  DetectivePhase.BINYAN,
  DetectivePhase.VERB_FORM,
  DetectivePhase.STRONG_CONFIRM,
  DetectivePhase.TRANSLATION,
];

/** Checks whether the word has a preformative morpheme (Imperfect prefix). */
function hasPreformative(word: WordAnalysis): boolean {
  return (word.morphemes ?? []).some(m => m.role === 'PREFORMATIVE');
}

/** Builds the weak path sequence, conditionally including PREFORMATIVE. */
function getWeakPath(word: WordAnalysis): DetectivePhase[] {
  const phases = [
    DetectivePhase.OBSERVE,
    DetectivePhase.TRIAGE,
  ];
  if (hasPreformative(word)) {
    phases.push(DetectivePhase.PREFORMATIVE);
  }
  phases.push(
    DetectivePhase.WEAK_ROOT,
    DetectivePhase.WEAK_BINYAN,
    DetectivePhase.VERB_FORM,
    DetectivePhase.TRANSLATION,
  );
  return phases;
}

/** Returns the next phase for the given path, or null if session is complete. */
function getNextPhase(
  current: DetectivePhase,
  path: InvestigationPath,
  word: WordAnalysis,
): DetectivePhase | null {
  const sequence = path === 'weak' ? getWeakPath(word) : STRONG_PATH;
  const idx = sequence.indexOf(current);
  if (idx === -1 || idx >= sequence.length - 1) return null;
  return sequence[idx + 1];
}

/** Returns the set of phases that should be skipped for this word. */
function getSkippedPhases(word: WordAnalysis, path: InvestigationPath): Set<DetectivePhase> {
  const skipped = new Set<DetectivePhase>();
  if (path === 'weak' && !hasPreformative(word)) {
    skipped.add(DetectivePhase.PREFORMATIVE);
  }
  return skipped;
}

// ── Resize hooks ─────────────────────────────────────────────────────────────

/**
 * Generic hook for a left-edge drag handle that increases width when dragging left.
 */
function useDragResizeLeft(
  storageKey: string,
  defaultWidth: number,
  minWidth: number,
  maxWidth: number,
) {
  const [width, setWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? Math.min(maxWidth, Math.max(minWidth, parseInt(stored, 10))) : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartW = useRef<number>(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartW.current = width;
    setIsDragging(true);
  }, [width]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const delta = dragStartX.current - e.clientX;
      const next  = Math.min(maxWidth, Math.max(minWidth, dragStartW.current + delta));
      setWidth(next);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      try { localStorage.setItem(storageKey, String(width)); } catch { /* ignore */ }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, [isDragging, maxWidth, minWidth, storageKey, width]);

  useEffect(() => {
    if (!isDragging) {
      try { localStorage.setItem(storageKey, String(width)); } catch { /* ignore */ }
    }
  }, [width, isDragging, storageKey]);

  return { width, isDragging, onMouseDown };
}

/**
 * Generic hook for a right-edge drag handle that increases width when dragging right.
 */
function useDragResizeRight(
  storageKey: string,
  defaultWidth: number,
  minWidth: number,
  maxWidth: number,
) {
  const [width, setWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? Math.min(maxWidth, Math.max(minWidth, parseInt(stored, 10))) : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartW = useRef<number>(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartW.current = width;
    setIsDragging(true);
  }, [width]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current;
      const next  = Math.min(maxWidth, Math.max(minWidth, dragStartW.current + delta));
      setWidth(next);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      try { localStorage.setItem(storageKey, String(width)); } catch { /* ignore */ }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, [isDragging, maxWidth, minWidth, storageKey, width]);

  useEffect(() => {
    if (!isDragging) {
      try { localStorage.setItem(storageKey, String(width)); } catch { /* ignore */ }
    }
  }, [width, isDragging, storageKey]);

  return { width, isDragging, onMouseDown };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface VerbDetectivePanelProps {
  word: WordAnalysis | null;
  verseReference: string;
  isOpen: boolean;
  onClose: () => void;
  /** Discovery Mode callback — fired when the full investigation finishes. */
  onDiscoveryComplete?: (translation: string, score: number) => void;
  /** Adjacent words for contextual display in the hero card */
  adjacentWords?: {
    prev?: { hebrewText: string; transliteration?: string } | null;
    next?: { hebrewText: string; transliteration?: string } | null;
  };
}

// ── Investigation path routing ────────────────────────────────────────────────

/**
 * Verb types that follow the STRONG investigation path.
 *
 * - STRONG:      fully regular — no missing/transformed radicals
 * - I_ALEF:      Pe-Alef verbs behave near-regularly (alef quiesces quietly)
 * - III_ALEF:    Lamed-Alef verbs show all 3 radicals as consonants. The final
 *                alef is quiescent but visually present — a student correctly
 *                observes "3 clear radicals" in triage. The STRONG_CONFIRM phase
 *                normalises III_ALEF → GUTURAL_R3 for the sub-classification step.
 * - GUTURAL_R*:  all 3 radicals present; root is altered by vocal compensation,
 *                not by radical loss — therefore classified as strong in TRIAGE
 */
const STRONG_VERB_TYPES = new Set<VerbType>([
  VerbType.STRONG,
  VerbType.I_ALEF,
  VerbType.III_ALEF,
  VerbType.GUTURAL_R1,
  VerbType.GUTURAL_R2,
  VerbType.GUTURAL_R3,
]);

/**
 * Cross-validates the backend's verbType against the actual morpheme evidence.
 *
 * Strategy:
 *  1. Strip the lexical root (word.root) down to its base consonants (הלך → [ה,ל,ך]).
 *  2. Extract the consonants actually present in root morphemes (ROOT_R1/R2/R3).
 *  3. Find which root consonant is missing from the surface form.
 *  4. Map the missing position to a grammatical weak-verb type.
 *
 * This is fully pattern-based and does NOT hardcode specific verbs.
 * It handles the case where the backend re-numbers radicals in shortened forms
 * (e.g., הלך → לֵךְ: backend labels ל as ROOT_R1, ך as ROOT_R3, making it look
 * like R2 is missing — but comparing against the root ה·ל·ך shows R1 (ה) dropped).
 */
function getEffectiveVerbClassification(word: WordAnalysis): {
  verbType: VerbType;
  path: 'strong' | 'weak';
} {
  const backendType = (word.verbMorphology?.verbType as VerbType | undefined) ?? VerbType.STRONG;
  const morphemes = word.morphemes ?? [];

  // ── Step 1: Extract base root consonants from the lexical root string ─────
  // Hebrew base consonants are U+05D0–U+05EA. Strip vowels, cantillation, dagesh.
  const rootConsonants = (word.root ?? '')
    .replace(/[\u0591-\u05C7\uFB1E]/g, '')  // strip niqqud, cantillation, dagesh
    .split('')
    .filter(c => c >= '\u05D0' && c <= '\u05EA');

  // ── Step 2: Consonants actually present in root morphemes ─────────────────
  const rootMorphemeRoles = new Set(['ROOT_R1', 'ROOT_R2', 'ROOT_R3']);
  const presentConsonants = new Set<string>();
  for (const m of morphemes) {
    if (!rootMorphemeRoles.has(m.role)) continue;
    const clean = (m.text ?? '').replace(/[\u0591-\u05C7\uFB1E]/g, '');
    for (const c of clean) {
      if (c >= '\u05D0' && c <= '\u05EA') presentConsonants.add(c);
    }
  }

  // ── Step 3: Find missing root consonant(s) ────────────────────────────────
  const missingPositions: number[] = [];
  for (let i = 0; i < rootConsonants.length; i++) {
    if (!presentConsonants.has(rootConsonants[i])) {
      missingPositions.push(i); // 0=R1, 1=R2, 2=R3
    }
  }

  const missingCount = missingPositions.length;

  // ── Step 4: If backend says strong but consonants are missing → override ──
  if (STRONG_VERB_TYPES.has(backendType) && missingCount > 0) {
    let inferredType = backendType;
    const firstMissing = missingPositions[0];

    if (firstMissing === 0) {
      // R1 dropped: Pe-Yod/Waw (הלך→לך, ילד→לד) or Pe-Nun (נתן→תן)
      // Distinguish: if R1 is נ → I_NUN, otherwise I_YOD_WAW
      const r1 = rootConsonants[0];
      inferredType = r1 === '\u05E0' ? VerbType.I_NUN : VerbType.I_YOD_WAW;
    } else if (firstMissing === 1) {
      // R2 absent / acting as vowel: Hollow verb (קום→קם, שים→שם)
      inferredType = VerbType.II_WAW_YOD;
    } else if (firstMissing === 2) {
      // R3 dropped: Lamed-He (גלה→גל) or Lamed-Alef (מצא→מצ)
      inferredType = VerbType.III_HE;
    }

    console.warn(
      `[Detective] Backend classified "${word.root}" as ${backendType} but ` +
      `${missingCount} root consonant(s) missing at position(s) [${missingPositions.join(',')}]. ` +
      `Overriding to ${inferredType} (weak path).`
    );

    return { verbType: inferredType, path: 'weak' };
  }

  // Backend classification is consistent with morpheme evidence
  const path = STRONG_VERB_TYPES.has(backendType) ? 'strong' as const : 'weak' as const;
  return { verbType: backendType, path };
}

// ── Preformative vowel derivation (Lección 8 table) ──────────────────────────

function getExpectedPreformativeVowel(word: WordAnalysis): string {
  const extractVowel = (text: string): string | null => {
    if (text.includes('\u05B8') && text.includes('\u05D5')) return 'jolem-vav'; // Kamatz male / Jolem vav approximation
    if (text.includes('\u05B9') && text.includes('\u05D5')) return 'jolem-vav'; // Holam haser + vav
    if (text.includes('\u05B9')) return 'jolem-vav'; // Holam haser
    if (text.includes('\u05B8')) return 'qamets'; // Qamets (could be hatuf, but visually qamets)
    if (text.includes('\u05B5')) return 'tsere'; // Tsere
    if (text.includes('\u05B4')) return 'jireq'; // Jireq
    if (text.includes('\u05B7')) return 'pataj'; // Pataj
    if (text.includes('\u05B0')) return 'sheva'; // Sheva
    return null;
  };

  // 1. Try to find the exact vowel in the preformative morpheme (strictly verb/pronominal prefix)
  const preformative = word.morphemes?.find(m => m.role === 'PREFIX_VERB' || m.role === 'PREFIX_PRONOMINAL');
  if (preformative && preformative.text) {
    const vowel = extractVowel(preformative.text);
    if (vowel) return vowel;
  }

  // 2. Scan the full word text for the preformative consonant (א, י, ת, נ)
  // This correctly captures visual vowel reductions caused by Waw Consecutives.
  const text = word.hebrewText;
  const eitan = ['\u05D0', '\u05D9', '\u05EA', '\u05E0']; // Alef, Yod, Tav, Nun
  let preformativeCharIndex = -1;

  for (let i = 0; i < text.length; i++) {
    if (eitan.includes(text[i])) {
      // The preformative should be near the start of the word (within first 5 chars)
      // to avoid matching radical letters.
      if (i <= 4) {
        preformativeCharIndex = i;
        break;
      }
    }
  }

  if (preformativeCharIndex !== -1) {
    let j = preformativeCharIndex + 1;
    let vowelStr = '';
    // Collect all diacritics immediately following the preformative consonant
    while (j < text.length && text.charCodeAt(j) >= 0x0591 && text.charCodeAt(j) <= 0x05C7) {
      vowelStr += text[j];
      j++;
    }
    // Also include following waw if it might be a holam vav
    if (j < text.length && text[j] === '\u05D5') {
      vowelStr += text[j];
    }
    
    const vowel = extractVowel(vowelStr);
    if (vowel) return vowel;
  }

  // 3. Fallback to theoretical derivation if visual parsing completely fails
  const verbType = word.verbMorphology?.verbType as VerbType | undefined;
  switch (verbType) {
    case VerbType.II_WAW_YOD:  return 'qamets';
    case VerbType.GEMINATE:    return 'qamets';
    case VerbType.I_YOD_WAW:   return 'tsere';
    case VerbType.III_HE:      return 'tsere';
    case VerbType.III_ALEF:    return 'jireq';
    case VerbType.I_NUN:       return 'jireq';
    default:                   return 'pataj';
  }
}

// ── Correct-answer derivation ─────────────────────────────────────────────────

function getCorrectAnswer(word: WordAnalysis, phase: DetectivePhase): string {
  const morph = word.verbMorphology;
  switch (phase) {
    // Shared
    case DetectivePhase.OBSERVE:
      return 'verb';
    case DetectivePhase.TRIAGE: {
      // Uses morphological cross-validation to override backend misclassifications
      const { path } = getEffectiveVerbClassification(word);
      return path;
    }

    // Strong path
    case DetectivePhase.COLORS:
      return (word.morphemes ?? []).map(m => m.role).join(', ');
    case DetectivePhase.DAGESH:
      return (word.morphemes ?? []).some(m => m.role === 'DAGESH_FORTE') ? 'yes' : 'no';
    case DetectivePhase.BINYAN:
      return morph?.binyan ?? '';
    case DetectivePhase.STRONG_CONFIRM:
      return morph?.verbType ?? 'STRONG';

    // Weak path
    case DetectivePhase.PREFORMATIVE:
      return getExpectedPreformativeVowel(word); // validated — not observational
    case DetectivePhase.WEAK_ROOT:
      return morph?.verbType ?? '';
    case DetectivePhase.WEAK_BINYAN:
      return morph?.binyan ?? '';

    // Both paths — verb form
    case DetectivePhase.VERB_FORM:
      return morph?.verbForm ?? '';

    // Both paths — synthesis
    case DetectivePhase.TRANSLATION:
      return word.translation ?? '';

    default:
      return '';
  }
}

/** Whether a user answer is correct for a given phase. */
function evaluateAnswer(
  word: WordAnalysis,
  phase: DetectivePhase,
  userAnswer: string,
): boolean {
  const correct = getCorrectAnswer(word, phase);
  const morph   = word.verbMorphology;

  // COLORS is observational — the student maps morphemes visually;
  // any answer earns credit (the learning is in the color interaction itself).
  if (phase === DetectivePhase.COLORS) return true;

  // PREFORMATIVE is now validated against the Lección 8 table.
  // The student must identify the correct vowel under the preformative prefix.
  if (phase === DetectivePhase.PREFORMATIVE)
    return userAnswer === getExpectedPreformativeVowel(word);

  // Dagesh
  if (phase === DetectivePhase.DAGESH) {
    const hasDagesh = (word.morphemes ?? []).some(m => m.role === 'DAGESH_FORTE');
    return (userAnswer === 'yes' && hasDagesh) || (userAnswer !== 'yes' && !hasDagesh);
  }

  // Binyan both paths
  if (
    phase === DetectivePhase.BINYAN ||
    phase === DetectivePhase.WEAK_BINYAN
  ) return userAnswer === morph?.binyan;

  // Verb type — weak root: use cross-validated verbType so the student is evaluated
  // against observable morpheme evidence, not the backend's potentially wrong classification.
  if (phase === DetectivePhase.WEAK_ROOT) {
    const { verbType: effectiveType } = getEffectiveVerbClassification(word);
    return userAnswer === effectiveType;
  }

  // Strong confirm: compare directly against backend verbType (always reliable here
  // since only genuine strong/guttural verbs reach this phase after our Triage fix)
  if (phase === DetectivePhase.STRONG_CONFIRM) return userAnswer === morph?.verbType;

  // Verb form — both paths
  if (phase === DetectivePhase.VERB_FORM)
    return userAnswer === morph?.verbForm;

  // Translation synthesis — both paths
  if (phase === DetectivePhase.TRANSLATION)
    return userAnswer.trim() === word.translation.trim();

  return userAnswer.trim().toLowerCase() === correct.trim().toLowerCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export const VerbDetectivePanel: React.FC<VerbDetectivePanelProps> = ({
  word,
  verseReference,
  isOpen,
  onClose,
  onDiscoveryComplete,
  adjacentWords,
}) => {
  const { saveDetectiveSession } = useHebrewTutor();
  const { user } = useFirebase();

  // Outer panel width (dragged from left edge)
  const {
    width:        panelWidth,
    isDragging:   isPanelDragging,
    onMouseDown:  onPanelHandleMouseDown,
  } = useDragResizeLeft(PANEL_STORAGE_KEY, DEFAULT_PANEL_WIDTH, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH);

  // Inner sidebar width (dragged from right edge of sidebar)
  const {
    width:        sidebarWidth,
    isDragging:   isSidebarDragging,
    onMouseDown:  onSidebarHandleMouseDown,
  } = useDragResizeRight(SIDEBAR_STORAGE_KEY, DEFAULT_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH);

  const anyDragging = isPanelDragging || isSidebarDragging;

  // ── Session state ─────────────────────────────────────────────────────────

  const [currentPhase, setCurrentPhase]         = useState<DetectivePhase>(DetectivePhase.OBSERVE);
  const [activePath, setActivePath]             = useState<InvestigationPath>(null);
  const [completedPhases, setCompletedPhases]   = useState<Array<{ phase: DetectivePhase; correct: boolean }>>([]);
  const [phaseResults, setPhaseResults]         = useState<DetectivePhaseResult[]>([]);
  const [sessionScore, setSessionScore]         = useState<number>(0);
  const [performanceLabel, setPerformanceLabel] = useState<'excellent' | 'good' | 'needs-practice'>('good');
  const [showSummary, setShowSummary]           = useState(false);
  const [isSaving, setIsSaving]                 = useState(false);

  const resetSession = useCallback(() => {
    setCurrentPhase(DetectivePhase.OBSERVE);
    setActivePath(null);
    setCompletedPhases([]);
    setPhaseResults([]);
    setSessionScore(0);
    setPerformanceLabel('good');
    setShowSummary(false);
    setIsSaving(false);
  }, []);

  // Reset state whenever the investigated word changes
  useEffect(() => {
    resetSession();
  }, [word?.hebrewText, resetSession]);

  // ── Phase completion handler ───────────────────────────────────────────────

  const handlePhaseComplete = useCallback(async (
    phase: DetectivePhase,
    userAnswer: string,
  ) => {
    if (!word) return;

    const correctAnswer = getCorrectAnswer(word, phase);
    const isCorrect     = evaluateAnswer(word, phase, userAnswer);

    const result: DetectivePhaseResult = {
      phase,
      userAnswer,
      correctAnswer,
      correct: isCorrect,
      completedAt: new Date(),
    };

    const updatedResults = [...phaseResults, result];
    setPhaseResults(updatedResults);
    setCompletedPhases(prev => [...prev, { phase, correct: isCorrect }]);

    // If TRIAGE completed, determine path from the CORRECT grammatical classification.
    // The Triage component always emits the correct path (not the student's raw guess).
    let resolvedPath = activePath;
    if (phase === DetectivePhase.TRIAGE) {
      resolvedPath = userAnswer === 'strong' ? 'strong' : 'weak';
      setActivePath(resolvedPath);
    }

    const nextPhase = getNextPhase(phase, resolvedPath, word);

    if (nextPhase === null) {
      // All phases complete — persist to Firestore
      setIsSaving(true);
      try {
        const saved = await saveDetectiveSession.execute({
          kind: 'verb',
          userId: user?.uid ?? 'anonymous',
          tenantId: 'global',
          wordText: word.hebrewText,
          verseReference,
          expectedBinyan:   word.verbMorphology!.binyan,
          expectedVerbType: word.verbMorphology!.verbType,
          phases: updatedResults,
        });
        setSessionScore(saved.score);
        setPerformanceLabel(saved.performanceLabel);
      } catch (e) {
        console.error('[VerbDetectivePanel] Failed to save session:', e);
        const correct = updatedResults.filter(r => r.correct).length;
        setSessionScore(Math.round((correct / updatedResults.length) * 100));
        setPerformanceLabel(correct >= 5 ? 'excellent' : correct >= 3 ? 'good' : 'needs-practice');
      } finally {
        setIsSaving(false);
        setShowSummary(true);
        // Notify Discovery Mode if callback is provided
        if (onDiscoveryComplete && word) {
          const finalScore = sessionScore || Math.round((updatedResults.filter(r => r.correct).length / updatedResults.length) * 100);
          onDiscoveryComplete(word.translation, finalScore);
        }
      }
    } else {
      setCurrentPhase(nextPhase);
    }
  }, [word, phaseResults, activePath, saveDetectiveSession, verseReference]);

  if (!word) return null;

  const currentSequence = activePath === 'weak' ? getWeakPath(word) : STRONG_PATH;
  const totalPhases = currentSequence.length;
  const progressPercent = (completedPhases.length / totalPhases) * 100;

  // Memoize context value to avoid unnecessary re-renders
  const detectiveCtxValue = React.useMemo(
    () => ({ adjacentWords }),
    [adjacentWords],
  );

  return (
    <DetectiveContextProvider value={detectiveCtxValue}>
    <Sheet open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className={`flex flex-col p-0 overflow-hidden ${anyDragging ? 'select-none' : ''}`}
        style={{ width: panelWidth, maxWidth: '95vw', minWidth: MIN_PANEL_WIDTH }}
      >
        {/* ── Outer drag handle (left edge — resizes panel) ─────────── */}
        <div
          onMouseDown={onPanelHandleMouseDown}
          title="Arrastra para cambiar el ancho del panel"
          className={`
            absolute left-0 top-0 bottom-0 w-1.5 z-50 cursor-col-resize group
            transition-colors
            ${isPanelDragging ? 'bg-indigo-500' : 'bg-transparent hover:bg-indigo-400/60'}
          `}
        >
          <div className="absolute inset-y-0 left-0 w-full flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1 h-1 rounded-full bg-indigo-400" />
            ))}
          </div>
        </div>

        {/* ── Header ───────────────────────────────────────────────────────*/}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <SheetDescription className="sr-only">
            Investigación morfológica paso a paso del verbo hebreo seleccionado.
          </SheetDescription>
          <div className="flex items-center gap-2 pr-8">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center flex-shrink-0">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold leading-none">Modo Detective</SheetTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">Investigación de verbos</p>
                {activePath && (
                  <span className={`
                    text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                    ${activePath === 'strong'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}
                  `}>
                    {activePath === 'strong' ? '💪 Verbo Fuerte' : '🔬 Verbo Débil'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {!showSummary && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Progreso de investigación</span>
                <span>{completedPhases.length}/{totalPhases} fases</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </SheetHeader>

        {/* ── Body ─────────────────────────────────────────────────────────*/}
        <div className="flex flex-1 min-h-0 relative">
          {/* Progress sidebar — resizable via right-edge handle */}
          {!showSummary && (
            <div
              className="relative flex-shrink-0 border-r border-border px-3 py-4"
              style={{ width: sidebarWidth }}
            >
              <DetectiveProgress
                currentPhase={currentPhase}
                completedPhases={completedPhases}
                activePath={activePath}
                skipPhases={getSkippedPhases(word, activePath)}
              />

              {/* ── Inner drag handle (right edge of sidebar) ─────── */}
              <div
                onMouseDown={onSidebarHandleMouseDown}
                title="Arrastra para cambiar el ancho del menú"
                className={`
                  absolute right-0 top-0 bottom-0 w-1.5 z-10 cursor-col-resize group
                  transition-colors
                  ${isSidebarDragging ? 'bg-indigo-400' : 'bg-transparent hover:bg-indigo-300/60'}
                `}
              >
                <div className="absolute inset-y-0 right-0 w-full flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1 h-1 rounded-full bg-indigo-300" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main phase content */}
          <ScrollArea className="flex-1 select-text">
            <div className="p-5">
              {isSaving ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-sm">Guardando resultados…</p>
                </div>
              ) : showSummary ? (
                <DetectiveResultSummary
                  word={word}
                  phases={phaseResults}
                  score={sessionScore}
                  performanceLabel={performanceLabel}
                  onReset={resetSession}
                />
              ) : (
                <PhaseRenderer
                  word={word}
                  phase={currentPhase}
                  activePath={activePath}
                  onComplete={handlePhaseComplete}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
    </DetectiveContextProvider>
  );
};

// ── Lexical Anchor ────────────────────────────────────────────────────────────

/**
 * Persistent reference strip shown at the top of every investigation phase.
 * Displays the root in Hebrew script and its Spanish meaning so the student
 * never has to guess or memorize it mid-analysis.
 */
const LexicalAnchor: React.FC<{ word: WordAnalysis }> = ({ word }) => {
  if (!word.root && !word.rootMeaning) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
      <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
        ש
      </div>
      <div className="flex items-baseline gap-2 flex-1 min-w-0">
        <span
          dir="rtl"
          lang="he"
          className="text-base font-hebrew font-semibold text-foreground leading-none"
        >
          {word.root}
        </span>
        <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
        <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
          {word.rootMeaning}
        </span>
      </div>
      <span className="flex-shrink-0 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        raíz
      </span>
    </div>
  );
};

// ── Phase Router ──────────────────────────────────────────────────────────────

interface PhaseRendererProps {
  word: WordAnalysis;
  phase: DetectivePhase;
  activePath: InvestigationPath;
  onComplete: (phase: DetectivePhase, answer: string) => void;
}

const PhaseRenderer: React.FC<PhaseRendererProps> = ({ word, phase, onComplete }) => {
  const wrap = (p: DetectivePhase) => (answer: string) => onComplete(p, answer);

  switch (phase) {
    // ── Shared ──────────────────────────────────────────────────────────────
    case DetectivePhase.OBSERVE:
      return <DetectivePhase1Observe word={word} onComplete={wrap(DetectivePhase.OBSERVE)} />;
    case DetectivePhase.TRIAGE: {
      const { verbType, path: expectedTriagePath } = getEffectiveVerbClassification(word);
      console.log('[Detective TRIAGE]', {
        hebrewText: word.hebrewText,
        root: word.root,
        rawVerbType: word.verbMorphology?.verbType,
        effectiveVerbType: verbType,
        expectedPath: expectedTriagePath,
        morphemes: word.morphemes?.map(m => `${m.role}:${m.text}`),
      });
      return (
        <DetectivePhase2Triage
          word={word}
          expectedPath={expectedTriagePath}
          verbType={verbType}
          onComplete={wrap(DetectivePhase.TRIAGE)}
        />
      );
    }

    // ── Strong path ──────────────────────────────────────────────────────────
    case DetectivePhase.COLORS:
      return <DetectivePhase2Colors  word={word} onComplete={wrap(DetectivePhase.COLORS)} />;
    case DetectivePhase.DAGESH:
      return <DetectivePhase4Dagesh  word={word} onComplete={wrap(DetectivePhase.DAGESH)} />;
    case DetectivePhase.BINYAN:
      return <DetectivePhase5Binyan  word={word} onComplete={wrap(DetectivePhase.BINYAN)} />;
    case DetectivePhase.STRONG_CONFIRM:
      return <DetectivePhase6WeakVerb word={word} onComplete={wrap(DetectivePhase.STRONG_CONFIRM)} />;

    // ── Weak path ────────────────────────────────────────────────────────────
    case DetectivePhase.PREFORMATIVE:
      return (
        <DetectivePhase3wPreformative
          word={word}
          onComplete={wrap(DetectivePhase.PREFORMATIVE)}
          expectedVowelId={getExpectedPreformativeVowel(word)}
        />
      );
    case DetectivePhase.WEAK_ROOT: {
      const { verbType: effectiveVerbType } = getEffectiveVerbClassification(word);
      return (
        <DetectivePhase4wWeakRoot
          word={word}
          effectiveVerbType={effectiveVerbType}
          onComplete={wrap(DetectivePhase.WEAK_ROOT)}
        />
      );
    }
    case DetectivePhase.WEAK_BINYAN:
      return <DetectivePhase5wWeakBinyan   word={word} onComplete={wrap(DetectivePhase.WEAK_BINYAN)} />;

    // ── Shared: verb form identification — both paths ─────────────────────
    case DetectivePhase.VERB_FORM:
      return <DetectivePhaseVerbForm   word={word} onComplete={wrap(DetectivePhase.VERB_FORM)} />;

    // ── Synthesis — both paths ────────────────────────────────────────────
    case DetectivePhase.TRANSLATION:
      return <DetectivePhaseTranslation    word={word} onComplete={wrap(DetectivePhase.TRANSLATION)} />;

    default:
      return null;
  }
};
