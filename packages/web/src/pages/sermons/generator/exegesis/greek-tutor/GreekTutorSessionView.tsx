

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Loader2, ArrowRight, ArrowLeft, BookOpen, Sparkles, Lightbulb, Copy, Download, LayoutDashboard, MessageCircle } from 'lucide-react';
import { TrainingUnit, UserResponse, FileSearchStoreContext, MorphologyBreakdown } from '@dosfilos/domain';
import { useGreekTutor } from './GreekTutorProvider';
import { getCoreLibraryService } from '../../../../../services/coreLibraryService';
import { BiblePassageSelector } from '@/components/sermons/BiblePassageSelector';
import { useFirebase } from '@/context/firebase-context';
import { ConfigService } from '@dosfilos/application';
import { FirebaseConfigRepository } from '@dosfilos/infrastructure';
import { LocalBibleService } from '@/services/LocalBibleService';
import { BibleTextViewer } from '@/components/sermons/BibleTextViewer';
import { GreekTutorLoadingScreen } from './GreekTutorLoadingScreen';
import { InteractionPanel } from './components/InteractionPanel';
import { ContentBoard } from './components/ContentBoard';
import { WordAnalysisToolbar } from './components/WordAnalysisToolbar';
import { useGreekTutorBoard } from './hooks/useGreekTutorBoard';
import { formatSessionExport, copyToClipboard, downloadAsMarkdown } from './utils/exportUtils';
import { ConceptsLibraryModal } from './components/ConceptsLibraryModal';

// Inline PassagePreview component
const PassagePreview: React.FC<{ passage: string }> = ({ passage }) => {
    const [text, setText] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!passage.trim()) {
            setText(null);
            return;
        }

        setLoading(true);
        try {
            const verses = LocalBibleService.getVerses(passage);
            setText(verses || null);
        } catch (e) {
            setText(null);
        } finally {
            setLoading(false);
        }
    }, [passage]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!text) {
        return (
            <p className="text-muted-foreground italic text-center py-8">
                Pasaje no reconocido
            </p>
        );
    }

    return <BibleTextViewer text={text} reference={passage} />;
};

interface GreekTutorSessionViewProps {
    initialPassage?: string;
    onPassageChange?: (passage: string) => void;
}

export const GreekTutorSessionView: React.FC<GreekTutorSessionViewProps> = ({ initialPassage, onPassageChange }) => {
    
    const { generateTrainingUnits, evaluateUserResponse, explainMorphology, askFreeQuestion, sessionRepository } = useGreekTutor();
    const { user } = useFirebase();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const configRepository = new FirebaseConfigRepository();
    const configService = new ConfigService(configRepository);
    
    // State
    const [passage, setPassage] = useState(initialPassage || '');
    const [isActive, setIsActive] = useState(!!initialPassage);
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'READY' | 'ERROR'>('IDLE');
    const [units, setUnits] = useState<TrainingUnit[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [responses, setResponses] = useState<Record<string, UserResponse>>({});
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [activeStoreId, setActiveStoreId] = useState<string>('');
    
    // Morphology breakdown state
    const [morphologyBreakdowns, setMorphologyBreakdowns] = useState<Record<string, MorphologyBreakdown>>({});
    const [loadingMorphology, setLoadingMorphology] = useState<string | null>(null);
    
    // Chat input state
    const [chatInput, setChatInput] = useState('');
    const [chatMode, setChatMode] = useState<'contextual' | 'general'>('contextual');
    const [isChatPopoverOpen, setIsChatPopoverOpen] = useState(false);
    
    // Mobile sidebar state
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Auto-trigger action after loading (for inicial state)
    const [autoTriggerAction, setAutoTriggerAction] = useState<'passage' | 'morphology' | null>(null);
    
    // Concepts library modal state
    const [isConceptsLibraryOpen, setIsConceptsLibraryOpen] = useState(false);

    // Track mount/unmount
    useEffect(() => {
        return () => {};
    }, []);

    // Recent passages - Load from localStorage with fallback defaults
    const STORAGE_KEY = 'greek-tutor-recent-passages';
    const DEFAULT_PASSAGES = ['Romanos 12:1-2', 'Juan 3:16', 'Efesios 2:8-10', 'Filipenses 2:5-11'];
    
    const [recentPassages, setRecentPassages] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : DEFAULT_PASSAGES;
        } catch {
            return DEFAULT_PASSAGES;
        }
    });

    // Function to add passage to recent history
    const addToRecentPassages = (newPassage: string) => {
        if (!newPassage.trim()) return;
        
        setRecentPassages(prev => {
            // Remove if already exists (to move to front)
            const filtered = prev.filter(p => p !== newPassage);
            // Add to front, keep only last 4
            const updated = [newPassage, ...filtered].slice(0, 4);
            
            // Persist to localStorage
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.warn('Failed to save recent passages:', e);
            }
            
            return updated;
        });
    };

    // Sync prop changes
    useEffect(() => {
        if (initialPassage && initialPassage !== passage) {
            setPassage(initialPassage);
            setIsActive(true);
        }
    }, [initialPassage]);

    // Start session when active and passage set
    useEffect(() => {
        if (isActive && passage && status === 'IDLE') {
            initializeSession();
        }
    }, [isActive, passage]);

    // Auto-load session from query param
    useEffect(() => {
        const sessionIdParam = searchParams.get('sessionId');
        if (sessionIdParam && user && status === 'IDLE') {
            // Set isActive immediately to prevent showing creation page
            setIsActive(true);
            loadSessionFromId(sessionIdParam);
        }
    }, [searchParams, user, status]);

    const loadSessionFromId = async (sessionId: string) => {
        console.log('[GreekTutorSessionView] Auto-loading session:', sessionId);
        setStatus('LOADING');
        try {
            const session = await sessionRepository.getSession(sessionId);
            if (!session) {
                console.error('[GreekTutorSessionView] Session not found:', sessionId);
                setStatus('ERROR');
                setIsActive(false);
                return;
            }
            
            // Load session data
            setPassage(session.passage);
            setUnits(session.units);
            setResponses(session.responses || {});
            setStatus('READY');
            
            // Restore last active unit (use unitsCompleted as best guess, or 0)
            const lastUnitIndex = Math.min(
                session.sessionProgress?.unitsCompleted || 0,
                session.units.length - 1
            );
            setCurrentIndex(lastUnitIndex >= 0 ? lastUnitIndex : 0);
            
            console.log('[GreekTutorSessionView] Session loaded successfully:', {
                passage: session.passage,
                unitsCount: session.units.length,
                currentUnitIndex: lastUnitIndex
            });
            
            // Set flag to auto-trigger morphology after hook is ready
            setAutoTriggerAction('morphology');
        } catch (error) {
            console.error('[GreekTutorSessionView] Error loading session:', error);
            setStatus('ERROR');
            setIsActive(false);
        }
    };


    const initializeSession = async () => {
        setStatus('LOADING');
        try {
            // 1. Fetch User Config
            let greekConfig: any = {};
            if (user) {
                try {
                    const userConfig = await configService.getUserConfig(user.uid);
                    greekConfig = (userConfig as any)?.greekTutor || {};
                } catch (err) {
                    console.warn("Could not load user config", err);
                }
            }

            // 2. Determine Store Key (Priority: Config > Exegesis Default)
            const storeKey = greekConfig.fileSearchStoreId || 'exegesis';
            
            // 3. Resolve Real Gemini Store ID from Global Config
            let geminiStoreId = '';
            try {
                // Fetch the coreLibraryStores config to map 'key' -> 'geminiId'
                const { getFirestore, doc, getDoc } = await import('firebase/firestore');
                const db = getFirestore();
                const configRef = doc(db, 'config/coreLibraryStores');
                const configSnap = await getDoc(configRef);
                
                if (configSnap.exists()) {
                    const stores = configSnap.data().stores || {};
                    geminiStoreId = stores[storeKey] || '';
                }

                if (!geminiStoreId) {
                    console.warn(`No Gemini Store ID found for key: ${storeKey}. Trying legacy lookup.`);
                     // Fallback to legacy logic for hardcoded defaults involved in navigation service
                    try {
                        const navService = getCoreLibraryService();
                        if (navService.isInitialized()) {
                           if (storeKey === 'exegesis') {
                               geminiStoreId = navService.getStoreId(FileSearchStoreContext.EXEGESIS) || '';
                           }
                        }
                    } catch (e) {
                        console.warn("GreekTutor: Could not retrieve legacy ID", e);
                    }
                }
                
                // Starting session with store
                setActiveStoreId(geminiStoreId);

               // Silence unused variables for lint if necessary - though we used everything here.
               if (configRepository) { /* no-op */ }

            } catch (e) {
                console.warn("Error resolving gemini ID", e);
            }

            // 4. Prepare Prompt Config
            const promptConfig = {
                basePrompt: greekConfig.basePrompt,
                userPrompts: greekConfig.userPrompts
            };

            // 5. Execute
            // Determine language (e.g. "Spanish" or "English")
            // const userLang = navigator.language.startsWith('es') ? 'Spanish' : 'English';
            // User requested: "same language that the user operating the system has"
            // We can map navigator.language to full name or pass explicitly.
            // For now, let's target Spanish heavily but allow fallback.
            const userLangObj = new Intl.DisplayNames(['en'], { type: 'language' });
            const detectedLang = userLangObj.of(navigator.language.split('-')[0]) || 'Spanish';
            
            // Language detected

            if (!user?.uid) {
                console.error("User not authenticated");
                setStatus('ERROR');
                return;
            }

            const generatedUnits = await generateTrainingUnits.execute(passage, geminiStoreId, user.uid, promptConfig, detectedLang);
            setUnits(generatedUnits);
            setStatus('READY');
            
            // Add passage to recent history
            addToRecentPassages(passage);
            
            // Navigate to immersive session view if we have a sessionId
            // This moves us from /dashboard/greek-tutor (with sidebar) to /dashboard/greek-tutor/session (immersive)
            const firstUnit = generatedUnits[0];
            if (firstUnit?.sessionId) {
                navigate(`/dashboard/greek-tutor/session?sessionId=${firstUnit.sessionId}`, { replace: true });
                return; // Exit early since we're navigating away
            }
            
            // Set flag to auto-open "Leer Pasaje" for new studies (fallback if no navigation)
            setAutoTriggerAction('passage');
        } catch (error) {
            console.error("Failed to start Greek Tutor session:", error);
            setStatus('ERROR');
        }
    };

    const handleSubmitResponse = async (answer: string) => {
        const unit = units[currentIndex];
        if (!unit) return;

        setSubmittingId(unit.id);
        try {
            // Re-detect language to allow dynamic switching if needed (though unlikely mid-session)
            const userLangObj = new Intl.DisplayNames(['en'], { type: 'language' });
            const detectedLang = userLangObj.of(navigator.language.split('-')[0]) || 'Spanish';

            const response = await evaluateUserResponse.execute(unit, answer, activeStoreId, detectedLang);
            setResponses(prev => ({ ...prev, [unit.id]: response }));
        } catch (error) {
            console.error("Error evaluating response:", error);
        } finally {
            setSubmittingId(null);
        }
    };
    
    // Morphology breakdown handler
    const handleRequestMorphology = async (unitId: string, word: string) => {
        if (morphologyBreakdowns[unitId]) return; // Already loaded
        
        const unit = units.find(u => u.id === unitId);
        if (!unit) return;

        // Phase 3C: Check if morphology is already cached in the unit
        if (unit.morphologyBreakdown) {
            setMorphologyBreakdowns(prev => ({ ...prev, [unitId]: unit.morphologyBreakdown! }));
            return;
        }

        // Not cached - generate with Gemini
        setLoadingMorphology(unitId);
        try {
            const userLangObj = new Intl.DisplayNames(['en'], { type: 'language' });
            const detectedLang = userLangObj.of(navigator.language.split('-')[0]) || 'Spanish';
            
            // Phase 3C: Pass sessionId and unitId for persistence
            const breakdown = await explainMorphology.execute(
                word,
                passage,
                unit.sessionId,
                unitId,
                activeStoreId,
                detectedLang
            );
            
            setMorphologyBreakdowns(prev => ({ ...prev, [unitId]: breakdown }));
        } catch (error) {
            console.error('[GreekTutorSessionView] Error loading morphology:', error);
        } finally {
            setLoadingMorphology(null);
        }
    };
    
    
    
    // Free chat question handler
    const handleFreeQuestion = async (question: string): Promise<string> => {
        if (!question.trim()) return '';
        
        const userLangObj = new Intl.DisplayNames(['en'], { type: 'language' });
        const detectedLang = userLangObj.of(navigator.language.split('-')[0]) || 'Spanish';
        
        // General mode - use answerFreeQuestion without specific context
        if (chatMode === 'general') {
            // Create minimal context for general question
            const generalContext = {
                greekWord: '',
                transliteration: '',
                gloss: '',
                identification: 'Pregunta general sobre griego koiné',
                functionInContext: '',
                significance: '',
                passage: ''
            };
            
            // Call the service but with empty context - it will answer as general question
            const answer = await askFreeQuestion['greekTutorService'].answerFreeQuestion(
                question,
                generalContext,
                activeStoreId,
                detectedLang
            );
            
            return answer;
        }
        
        // Contextual mode - with passage/word context
        const unit = units[currentIndex];
        if (!unit) return 'No hay una palabra actual seleccionada.';
        
        const answer = await askFreeQuestion.execute(
            question,
            unit,
            passage,
            activeStoreId,
            detectedLang
        );
        
        return answer;
    };
    
    
    
    
    // Insight Saving
    const { saveInsight } = useGreekTutor();
    const [savingInsight, setSavingInsight] = useState(false);

    const handleSaveInsight = async () => {
        const unit = units[currentIndex];
        if (!unit) return;
        
        setSavingInsight(true);
        try {
            // Construct default insight content from unit
            const content = `[${unit.greekForm.text}] ${unit.significance}`;
            const tags = [unit.greekForm.grammaticalCategory]; // e.g. "Verb"
            
            await saveInsight.execute(unit.sessionId, unit.id, content, tags);
            
            // Show toast or some feedback (using alert for MVP if no toast available)
            // toast.success("Insight guardado");
            // Insight saved
        } catch (e) {
            console.error("Failed to save insight", e);
        } finally {
            setSavingInsight(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < units.length - 1) setCurrentIndex(prev => prev + 1);
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const handleStart = () => {
        if (passage.trim()) {
            setIsActive(true);
            setStatus('IDLE'); // Trigger effect
            onPassageChange?.(passage);
        }
    };

    const handleReset = () => {
        setIsActive(false);
        setUnits([]);
        setCurrentIndex(0);
        setResponses({});
        setStatus('IDLE');
        if (!initialPassage) setPassage('');
    };

    // Helper for safe access
    const currentUnit = units[currentIndex];

    // Use board hook (must be called before any conditional returns)
    const {
        currentContent,
        currentContentTitle,
        currentContentTimestamp,
        isLoading: isBoardLoading,
        handleActionClick,
        handleChatMessage,
        activeAction
    } = useGreekTutorBoard({
        units,
        currentIndex,
        morphologyBreakdowns,
        onRequestMorphology: (unitId: string) => {
            const unit = units.find(u => u.id === unitId);
            if (unit) {
                handleRequestMorphology(unitId, unit.greekForm.text);
            }
        },
        onChatMessage: handleFreeQuestion,
        isMorphologyLoading: loadingMorphology,
        passage,
        userLanguage: new Intl.DisplayNames(['en'], { type: 'language' }).of(navigator.language.split('-')[0]) || 'Spanish'
    });

    // Auto-trigger action after session loads
    useEffect(() => {
        if (autoTriggerAction && status === 'READY' && handleActionClick) {
            // Auto-triggering action
            handleActionClick(autoTriggerAction);
            setAutoTriggerAction(null); // Clear flag
        }
    }, [autoTriggerAction, status, handleActionClick]);

    // Export handlers
    const handleCopyExport = async () => {
        const unit = units[currentIndex];
        if (!currentContent || !unit) return;
        
        const exportText = formatSessionExport(currentContent, unit, passage);
        const success = await copyToClipboard(exportText);
        
        if (success) {
            // Could show toast: "Copiado al portapapeles"
            // Content copied
        }
    };

    const handleDownloadExport = () => {
        const unit = units[currentIndex];
        if (!currentContent || !unit) return;
        
        const exportText = formatSessionExport(currentContent, unit, passage);
        const filename = `griego-${unit.greekForm.text}-${new Date().getTime()}.md`;
        downloadAsMarkdown(exportText, filename);
    };

    // Track completed units (those with responses)
    const completedUnits = new Set(
        Object.keys(responses).map(unitId => 
            units.findIndex(u => u.id === unitId)
        ).filter(idx => idx !== -1)
    );

    // 1. Passage Selection View - Modern Hero Layout
    if (!isActive) {
        // Check if we have a valid passage to show preview
        const hasPassage = passage.trim().length > 0;
        
        return (
            <div className="h-full overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    <div className="container max-w-7xl mx-auto px-6 py-12 lg:py-20">
                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                            {/* Left Column - Hero Content */}
                            <div className="space-y-8">
                                {/* Title with gradient and Dashboard button */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                            Entrena tu discernimiento exegético
                                        </h1>
                                        <p className="text-lg text-muted-foreground">
                                            Analiza pasajes del NT griego con asistencia de IA pedagógica
                                        </p>
                                    </div>
                                    <Button 
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => window.location.href = '/dashboard/greek-tutor-dashboard'}
                                    >
                                        <LayoutDashboard className="h-4 w-4" />
                                        <span className="hidden sm:inline">Mis Sesiones</span>
                                    </Button>
                                </div>

                                {/* Passage Input - Large and prominent */}
                                <div className="space-y-4">
                                    <BiblePassageSelector 
                                        value={passage}
                                        onChange={setPassage}
                                        onValidPassage={() => {}}
                                        hidePreview={hasPassage}
                                    />
                                    
                                    {/* CTA Button - Gradient */}
                                    <Button 
                                        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg hover:shadow-xl transition-all" 
                                        size="lg"
                                        onClick={handleStart}
                                        disabled={!passage.trim()}
                                    >
                                        Iniciar Entrenamiento
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </div>

                                {/* Recent Passages - Quick Access */}
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground font-medium">Pasajes frecuentes:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {recentPassages.map((ref) => (
                                            <button
                                                key={ref}
                                                onClick={() => setPassage(ref)}
                                                className="px-3 py-1.5 text-sm rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-colors"
                                            >
                                                {ref}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Context-aware content */}
                            <div className="hidden lg:block">
                                {hasPassage ? (
                                    /* Text Preview when passage is selected */
                                    <div className="sticky top-6">
                                        <PassagePreview passage={passage} />
                                    </div>
                                ) : (
                                    /* Feature Cards when no passage selected */
                                    <div className="space-y-4">
                                        <div className="p-6 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 rounded-lg bg-primary/10">
                                                    <Sparkles className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold mb-1">Análisis Morfológico</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Descomposición de palabras griegas en morfemas con explicaciones pedagógicas
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-xl border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 rounded-lg bg-amber-500/10">
                                                    <Lightbulb className="h-5 w-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold mb-1">Feedback Contextual</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Evaluación pedagógica de tus respuestas con orientación pastoral
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-xl border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 rounded-lg bg-green-500/10">
                                                    <BookOpen className="h-5 w-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold mb-1">Insights Guardados</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Guarda las joyas exegéticas para tus predicaciones futuras
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Loading State
    if (status === 'LOADING') {
        return <GreekTutorLoadingScreen />;
    }

    // 3. Active Session View - Two Panel Layout
    return (
        <div className="flex flex-col h-full">
            {/* Error overlay */}
            {status === 'ERROR' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-50 bg-background/95 backdrop-blur-sm">
                    <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                        <BookOpen className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Error al iniciar sesión</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        No pudimos conectar con el asistente exegético.
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={handleReset} variant="outline">Volver</Button>
                        <Button onClick={initializeSession}>Reintentar</Button>
                    </div>
                </div>
            )}

            {/* Unified Header - single header for entire page */}
            <div className="px-4 py-2.5 border-b bg-background/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Back button - First element on the left */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 gap-2"
                        onClick={() => window.location.href = '/dashboard/greek-tutor-dashboard'}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Volver</span>
                    </Button>

                    {/* Page Title & Passage Info */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-sm leading-tight">Entrenador Griego</h1>
                                <span className="text-muted-foreground">·</span>
                                <span className="font-semibold text-sm leading-tight">{passage}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Title (compact, hidden on small screens) */}
                    {currentContentTitle && (
                        <>
                            <div className="h-8 w-px bg-border hidden lg:block" />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground hidden lg:flex">
                                <span className="font-medium">{currentContentTitle}</span>
                                {currentContentTimestamp && (
                                    <span className="text-[10px]">
                                        {currentContentTimestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </>
                    )}

                    {/* Spacer */}
                    <div className="flex-1 min-w-[100px]" />

                    {/* Chat Popover - Compact trigger button */}
                    <Popover open={isChatPopoverOpen} onOpenChange={setIsChatPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 gap-2"
                            >
                                <MessageCircle className="h-4 w-4" />
                                <span className="hidden md:inline">Pregunta al Tutor</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96" align="end">
                            <div className="space-y-4">
                                {/* Header with mode selector */}
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Pregunta al Tutor</h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setChatMode('contextual')}
                                            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                                                chatMode === 'contextual'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            📖 Sobre el pasaje
                                        </button>
                                        <button
                                            onClick={() => setChatMode('general')}
                                            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                                                chatMode === 'general'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            💭 General
                                        </button>
                                    </div>
                                </div>

                                {/* Textarea for question */}
                                <Textarea
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        // Send on Enter, but allow Shift+Enter for new line
                                        if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) {
                                            e.preventDefault();
                                            handleChatMessage(chatInput);
                                            setChatInput('');
                                            setIsChatPopoverOpen(false);
                                        }
                                    }}
                                    placeholder={
                                        chatMode === 'contextual'
                                            ? "Escribe tu pregunta sobre el pasaje..."
                                            : "Escribe tu pregunta sobre griego koiné..."
                                    }
                                    className="min-h-[100px] resize-none text-sm"
                                    disabled={isBoardLoading}
                                />

                                {/* Action buttons */}
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-muted-foreground">
                                        Presiona <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Enter</kbd> para enviar
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setChatInput('');
                                                setIsChatPopoverOpen(false);
                                            }}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                if (chatInput.trim()) {
                                                    handleChatMessage(chatInput);
                                                    setChatInput('');
                                                    setIsChatPopoverOpen(false);
                                                }
                                            }}
                                            disabled={isBoardLoading || !chatInput.trim()}
                                        >
                                            {isBoardLoading ? (
                                                <>
                                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                    Procesando...
                                                </>
                                            ) : (
                                                'Enviar'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Concepts Library Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 gap-2"
                        onClick={() => setIsConceptsLibraryOpen(true)}
                        title="Biblioteca de Conceptos Clave"
                    >
                        <BookOpen className="h-4 w-4" />
                        <span className="hidden lg:inline">Conceptos</span>
                    </Button>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-1">
                        {currentContent && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={handleCopyExport}
                                    title="Copiar"
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={handleDownloadExport}
                                    title="Exportar"
                                >
                                    <Download className="h-3 w-3" />
                                </Button>
                            </>
                        )}
                        {!initialPassage && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 px-2 text-xs" 
                                onClick={handleReset}
                            >
                                Cambiar Pasaje
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Two Panel Layout */}
            {status === 'READY' && units.length > 0 && (
                <div className="flex-1 flex overflow-hidden relative">
                    {/* Mobile hamburger - only visible on small screens */}
                    <button
                        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                        className="md:hidden fixed bottom-4 right-4 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg"
                    >
                        {isMobileSidebarOpen ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>

                    {/* Backdrop overlay for mobile */}
                    {isMobileSidebarOpen && (
                        <div
                            className="md:hidden fixed inset-0 bg-black/50 z-30"
                            onClick={() => setIsMobileSidebarOpen(false)}
                        />
                    )}

                    {/* Left Sidebar - Responsive */}
                    <aside className={`
                        w-80 shrink-0 border-r overflow-hidden
                        transition-transform duration-300 ease-in-out
                        md:relative md:translate-x-0
                        ${isMobileSidebarOpen 
                            ? 'fixed inset-y-0 left-0 z-40 bg-background translate-x-0' 
                            : 'fixed inset-y-0 left-0 z-40 bg-background -translate-x-full md:translate-x-0 md:static md:z-auto'}
                    `}>
                        <InteractionPanel
                            units={units}
                            currentIndex={currentIndex}
                            onNavigate={(index) => {
                                setCurrentIndex(index);
                                // Auto-trigger morphology when selecting a word
                                handleActionClick('morphology');
                                setIsMobileSidebarOpen(false); // Close on mobile after navigation
                            }}
                            onActionClick={(action) => {
                                handleActionClick(action);
                                setIsMobileSidebarOpen(false); // Close on mobile after action
                            }}
                            activeAction={activeAction}
                            isActionLoading={isBoardLoading}
                            onDeleteUnit={(unitId) => {
                                // Deleting unit
                                // Remove unit from state
                                setUnits(prevUnits => prevUnits.filter(u => u.id !== unitId));
                                // Adjust current index if needed
                                if (currentIndex >= units.length - 1) {
                                    setCurrentIndex(Math.max(0, units.length - 2));
                                }
                            }}
                        />
                    </aside>

                    {/* Main Content Board */}
                    <main className="flex-1 overflow-hidden">
                        <ContentBoard
                            content={currentContent}
                            isLoading={isBoardLoading}
                            currentUnit={currentUnit}
                            units={units}
                            sessionId={currentUnit?.sessionId}
                            fileSearchStoreId={activeStoreId}
                            onUnitAdded={(newUnit) => {
                                // Adding new unit from passage reader
                                setUnits(prevUnits => [...prevUnits, newUnit]);
                            }}
                        />
                    </main>

                    {/* Floating Word Analysis Toolbar */}
                    <WordAnalysisToolbar
                        currentUnit={currentUnit ?? null}
                        activeAction={activeAction}
                        onActionClick={(action) => handleActionClick(action)}
                        isLoading={isBoardLoading}
                    />
                </div>
            )}
            
            {/* Concepts Library Modal */}
            <ConceptsLibraryModal
                open={isConceptsLibraryOpen}
                onOpenChange={setIsConceptsLibraryOpen}
            />
        </div>
    );
};
