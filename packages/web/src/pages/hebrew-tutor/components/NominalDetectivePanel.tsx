import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import type { WordAnalysis, DetectivePhaseResult } from '@dosfilos/domain';
import { DetectivePhase, GrammaticalCategory } from '@dosfilos/domain';
import { useHebrewTutor } from '../HebrewTutorProvider';
import { DetectiveProgress } from './detective/DetectiveProgress';

import { NominalPhase1Classify } from './detective/NominalPhase1Classify';
import { NominalPhase2Article }  from './detective/NominalPhase2Article';
import { NominalPhase3Gender }   from './detective/NominalPhase3Gender';
import { NominalPhase4Number }   from './detective/NominalPhase4Number';
import { NominalPhase5State }    from './detective/NominalPhase5State';
import { DetectivePhaseTranslation } from './detective/DetectivePhaseTranslation';
import { DetectiveResultSummary } from './detective/DetectiveResultSummary';

const PANEL_STORAGE_KEY   = 'nominal-detective-panel-width';
const SIDEBAR_STORAGE_KEY = 'nominal-detective-sidebar-width';
const DEFAULT_PANEL_WIDTH   = 580;
const MIN_PANEL_WIDTH       = 340;
const MAX_PANEL_WIDTH       = 900;
const DEFAULT_SIDEBAR_WIDTH = 176;   // ~w-44
const MIN_SIDEBAR_WIDTH     = 130;
const MAX_SIDEBAR_WIDTH     = 260;

const NOMINAL_PATH: DetectivePhase[] = [
  DetectivePhase.NOMINAL_CLASSIFY,
  DetectivePhase.NOMINAL_ARTICLE,
  DetectivePhase.NOMINAL_GENDER,
  DetectivePhase.NOMINAL_NUMBER,
  DetectivePhase.NOMINAL_STATE,
  DetectivePhase.TRANSLATION,
];

function getNextPhase(current: DetectivePhase): DetectivePhase | null {
  const idx = NOMINAL_PATH.indexOf(current);
  if (idx === -1 || idx >= NOMINAL_PATH.length - 1) return null;
  return NOMINAL_PATH[idx + 1];
}

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

interface NominalDetectivePanelProps {
  word: WordAnalysis | null;
  verseReference: string;
  isOpen: boolean;
  onClose: () => void;
  /** Discovery Mode callback — fired when the full investigation finishes. */
  onDiscoveryComplete?: (translation: string, score: number) => void;
}

function getCategoryGroup(category: GrammaticalCategory): string {
  if (category === GrammaticalCategory.NOUN || category === GrammaticalCategory.PROPER_NOUN) {
    return 'noun';
  }
  if (category === GrammaticalCategory.ADJECTIVE) {
    return 'adjective';
  }
  if (category === GrammaticalCategory.PRONOUN || 
      category === GrammaticalCategory.PERSONAL_PRONOUN || 
      category === GrammaticalCategory.DEMONSTRATIVE_PRONOUN || 
      category === GrammaticalCategory.RELATIVE_PRONOUN) {
    return 'pronoun';
  }
  return 'particle';
}

function getCorrectAnswer(word: WordAnalysis, phase: DetectivePhase): string {
  const morph = word.nominalMorphology;
  switch (phase) {
    case DetectivePhase.NOMINAL_CLASSIFY:
      return getCategoryGroup(word.category);
    case DetectivePhase.NOMINAL_ARTICLE:
      return (word.morphemes ?? []).some(m => m.role === 'DEFINITE_ARTICLE') ? 'yes' : 'no';
    case DetectivePhase.NOMINAL_GENDER:
      return morph?.gender ?? '';
    case DetectivePhase.NOMINAL_NUMBER:
      return morph?.number ?? '';
    case DetectivePhase.NOMINAL_STATE:
      return morph?.state ?? '';
    case DetectivePhase.TRANSLATION:
      return word.translation ?? '';
    default:
      return '';
  }
}

function evaluateAnswer(
  word: WordAnalysis,
  phase: DetectivePhase,
  userAnswer: string,
): boolean {
  const correct = getCorrectAnswer(word, phase);

  if (phase === DetectivePhase.TRANSLATION) {
    return userAnswer.trim() === word.translation.trim();
  }

  return userAnswer.trim().toLowerCase() === correct.trim().toLowerCase();
}

export const NominalDetectivePanel: React.FC<NominalDetectivePanelProps> = ({
  word,
  verseReference,
  isOpen,
  onClose,
  onDiscoveryComplete,
}) => {
  const { saveDetectiveSession } = useHebrewTutor();

  const {
    width: panelWidth,
    isDragging: isPanelDragging,
    onMouseDown: onPanelHandleMouseDown,
  } = useDragResizeLeft(PANEL_STORAGE_KEY, DEFAULT_PANEL_WIDTH, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH);

  const {
    width: sidebarWidth,
    isDragging: isSidebarDragging,
    onMouseDown: onSidebarHandleMouseDown,
  } = useDragResizeRight(SIDEBAR_STORAGE_KEY, DEFAULT_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH);

  const anyDragging = isPanelDragging || isSidebarDragging;

  const [currentPhase, setCurrentPhase] = useState<DetectivePhase>(DetectivePhase.NOMINAL_CLASSIFY);
  const [completedPhases, setCompletedPhases] = useState<Array<{ phase: DetectivePhase; correct: boolean }>>([]);
  const [phaseResults, setPhaseResults] = useState<DetectivePhaseResult[]>([]);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [performanceLabel, setPerformanceLabel] = useState<'excellent' | 'good' | 'needs-practice'>('good');
  const [showSummary, setShowSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetSession = useCallback(() => {
    setCurrentPhase(DetectivePhase.NOMINAL_CLASSIFY);
    setCompletedPhases([]);
    setPhaseResults([]);
    setSessionScore(0);
    setPerformanceLabel('good');
    setShowSummary(false);
    setIsSaving(false);
  }, []);

  useEffect(() => {
    resetSession();
  }, [word?.hebrewText, resetSession]);

  const handlePhaseComplete = useCallback(async (
    phase: DetectivePhase,
    userAnswer: string,
  ) => {
    if (!word) return;

    const correctAnswer = getCorrectAnswer(word, phase);
    const isCorrect = evaluateAnswer(word, phase, userAnswer);

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

    const nextPhase = getNextPhase(phase);

    if (nextPhase === null) {
      setIsSaving(true);
      try {
        const saved = await saveDetectiveSession.execute({
          kind: 'nominal',
          userId: 'anonymous',
          tenantId: 'global',
          wordText: word.hebrewText,
          verseReference,
          expectedCategory: word.category,
          expectedGender: word.nominalMorphology?.gender,
          expectedNumber: word.nominalMorphology?.number,
          expectedState: word.nominalMorphology?.state,
          phases: updatedResults,
        });
        setSessionScore(saved.score);
        setPerformanceLabel(saved.performanceLabel);
      } catch (e) {
        console.error('[NominalDetectivePanel] Failed to save session:', e);
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
  }, [word, phaseResults, saveDetectiveSession, verseReference]);

  if (!word) return null;

  const totalPhases = NOMINAL_PATH.length;
  const progressPercent = (completedPhases.length / totalPhases) * 100;

  return (
    <Sheet open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className={`flex flex-col p-0 overflow-hidden ${anyDragging ? 'select-none' : ''}`}
        style={{ width: panelWidth, maxWidth: '95vw', minWidth: MIN_PANEL_WIDTH }}
      >
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

        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <SheetDescription className="sr-only">
            Investigación morfológica de la palabra.
          </SheetDescription>
          <div className="flex items-center gap-2 pr-8">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center flex-shrink-0">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold leading-none">Modo Detective</SheetTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">Investigación Nominal</p>
              </div>
            </div>
          </div>

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

        <div className="flex flex-1 min-h-0 relative">
          {!showSummary && (
            <div
              className="relative flex-shrink-0 border-r border-border px-3 py-4"
              style={{ width: sidebarWidth }}
            >
              <DetectiveProgress
                currentPhase={currentPhase}
                completedPhases={completedPhases}
                activePath="nominal"
              />

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
                  onComplete={handlePhaseComplete}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface PhaseRendererProps {
  word: WordAnalysis;
  phase: DetectivePhase;
  onComplete: (phase: DetectivePhase, answer: string) => void;
}

const PhaseRenderer: React.FC<PhaseRendererProps> = ({ word, phase, onComplete }) => {
  const wrap = (p: DetectivePhase) => (answer: string) => onComplete(p, answer);

  switch (phase) {
    case DetectivePhase.NOMINAL_CLASSIFY:
      return <NominalPhase1Classify word={word} onComplete={wrap(DetectivePhase.NOMINAL_CLASSIFY)} />;
    case DetectivePhase.NOMINAL_ARTICLE:
      return <NominalPhase2Article word={word} onComplete={wrap(DetectivePhase.NOMINAL_ARTICLE)} />;
    case DetectivePhase.NOMINAL_GENDER:
      return <NominalPhase3Gender word={word} onComplete={wrap(DetectivePhase.NOMINAL_GENDER)} />;
    case DetectivePhase.NOMINAL_NUMBER:
      return <NominalPhase4Number word={word} onComplete={wrap(DetectivePhase.NOMINAL_NUMBER)} />;
    case DetectivePhase.NOMINAL_STATE:
      return <NominalPhase5State word={word} onComplete={wrap(DetectivePhase.NOMINAL_STATE)} />;
    case DetectivePhase.TRANSLATION:
      return <DetectivePhaseTranslation word={word} onComplete={wrap(DetectivePhase.TRANSLATION)} />;
    default:
      return null;
  }
};
