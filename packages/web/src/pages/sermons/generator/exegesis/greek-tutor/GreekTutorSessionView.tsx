

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ArrowRight, ArrowLeft, BookOpen, Sparkles, Lightbulb, Copy, Download, LayoutDashboard, MessageCircle, Bookmark } from 'lucide-react';
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
import { InsightsViewer } from './components/InsightsViewer';
import { useTranslation, Trans } from 'react-i18next';


// Inline PassagePreview component
const PassagePreview: React.FC<{ passage: string }> = ({ passage }) => {
    const [text, setText] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { t, i18n } = useTranslation('greekTutor');

    useEffect(() => {
        if (!passage.trim()) {
            setText(null);
            return;
        }

        setLoading(true);
        try {
            // Use current system language for Bible lookup
            // If user explicitly types English in Spanish mode, auto-detection in service will still work as fallback
            // but we prioritize the UI language context
            const verses = LocalBibleService.getVerses(passage, i18n.language);
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
                {t('passageNotRecognized')}
            </p>
        );
    }

    return <BibleTextViewer text={text} reference={passage} language={i18n.language} />;
};

// Feature Modal Component
const FeatureModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    screenshotPath?: string;
    details?: string[];
}> = ({ isOpen, onClose, title, description, screenshotPath, details }) => {
    const { t } = useTranslation('greekTutor');
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
                    <DialogDescription className="text-base">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 mt-4">
                    {screenshotPath && (
                        <div className="rounded-lg border overflow-hidden shadow-lg">
                            <img 
                                src={screenshotPath} 
                                alt={title}
                                className="w-full h-auto"
                            />
                        </div>
                    )}
                    
                    {details && details.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-lg">{t('modal.characteristics')}</h4>
                            <ul className="space-y-2">
                                {details.map((detail, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-primary mt-1">✓</span>
                                        <span className="text-muted-foreground">{detail}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
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
    const { t, i18n } = useTranslation('greekTutor');
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
    
    // Feature modal state
    const [openFeatureModal, setOpenFeatureModal] = useState<string | null>(null);
    const [showInsightsDialog, setShowInsightsDialog] = useState(false);

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
        // console.log('[GreekTutorSessionView] Auto-loading session:', sessionId);
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
            
            // Session loaded successfully
            
            // Set flag to auto-trigger passage reading after hook is ready
            setAutoTriggerAction('passage');
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
            // Determine language from current UI selection
            const userLangObj = new Intl.DisplayNames(['en'], { type: 'language' });
            // Use i18n.language (e.g. 'es', 'en') instead of navigator.language
            const detectedLang = userLangObj.of(i18n.language.split('-')[0]) || 'Spanish';
            
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
            const detectedLang = userLangObj.of(i18n.language.split('-')[0]) || 'Spanish';
            
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
        const detectedLang = userLangObj.of(i18n.language.split('-')[0]) || 'Spanish';
        
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
    
    
    
    
    // Insight Saving - Updated for personal knowledge base
    const { saveInsight } = useGreekTutor();
    const [savingInsight, setSavingInsight] = useState(false);

    const handleSaveInsight = async (data: {
        title?: string;
        content: string;
        question: string;
        tags: string[];
        greekWord?: string;
        passage?: string;
    }) => {
        const sessionId = units[0]?.sessionId;
        if (!user?.uid || !sessionId) {
            console.error('Cannot save insight: user or session not available');
            return;
        }
        
        setSavingInsight(true);
        try {
            await saveInsight.execute({
                userId: user.uid,
                sessionId: sessionId,
                unitId: units[currentIndex]?.id,
                title: data.title,
                content: data.content,
                question: data.question,
                tags: data.tags,
                passage: data.passage || passage,
                greekWord: data.greekWord
            });
            
            // console.log('[GreekTutorSessionView] Insight saved successfully');
        } catch (e) {
            console.error('[GreekTutorSessionView] Failed to save insight:', e);
            throw e; // Re-throw to let SaveInsightButton show error
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
    
    // Use board hook (must be called before any conditional returns)
    // We do NOT destructure handleCopy/handleExport here to avoid conflicts with local custom handlers
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
        userLanguage: (() => {
            const currentLang = i18n.language?.split('-')[0] || 'es';
            const langMap: Record<string, string> = {
                'es': 'Spanish',
                'en': 'English',
                'pt': 'Portuguese',
                'fr': 'French'
            };
            return langMap[currentLang] || 'Spanish';
        })(),
        translate: (key: string) => t(key)
    });

    // Helper for safe access
    const currentUnit = units[currentIndex];

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
            <>
            <div className="h-full overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    <div className="container max-w-7xl mx-auto px-6 py-12 lg:py-20">
                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                            {/* Left Column - Hero Content */}
                            <div className="space-y-6">
                                {/* Compact Hero with Gradient Background */}
                                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-xl">
                                    {/* Gradient overlay for depth */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
                                    
                                    <div className="relative space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                                                    {t('title')}
                                                </h1>
                                                <p className="text-blue-100 text-base leading-relaxed">
                                                    {t('description')}
                                                </p>
                                            </div>
                                            <Button 
                                                variant="secondary"
                                                size="sm"
                                                className="gap-2 bg-white/20 hover:bg-white/30 border-white/30 text-white backdrop-blur-sm shrink-0"
                                                onClick={() => window.location.href = '/dashboard/greek-tutor-dashboard'}
                                            >
                                                <LayoutDashboard className="h-4 w-4" />
                                                <span className="hidden sm:inline">{t('mySessions')}</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Passage Input Card - Large and prominent */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-8 bg-gradient-to-r from-primary to-purple-600 rounded-full" />
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                                            {t('biblicalPassage')}
                                        </h3>
                                    </div>
                                    
                                    <div className="relative">
                                        <BiblePassageSelector 
                                            value={passage}
                                            onChange={setPassage}
                                            onValidPassage={() => {}}
                                            hidePreview={hasPassage}
                                            label={t('passageSelector.label')}
                                            placeholder={t('passageSelector.placeholder')}
                                        />
                                    </div>
                                    
                                    {/* CTA Button - Large and prominent with gradient */}
                                    <Button 
                                        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:from-primary/90 hover:via-purple-600/90 hover:to-pink-600/90 shadow-lg hover:shadow-xl transition-all group" 
                                        size="lg"
                                        onClick={handleStart}
                                        disabled={!passage.trim()}
                                    >
                                        {t('startTraining')}
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>

                                {/* Recent Passages - Interactive chips */}
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground font-medium">{t('frequentPassages')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {recentPassages.map((ref) => (
                                            <button
                                                key={ref}
                                                onClick={() => setPassage(ref)}
                                                className="group px-4 py-2 text-sm rounded-full border-2 border-primary/20 bg-primary/5 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 font-medium"
                                            >
                                                <BookOpen className="h-3 w-3 inline mr-1.5 opacity-60 group-hover:opacity-100" />
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
                                    <div className="space-y-6">
                                        {/* Section 1: Vista General */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                                    {t('sections.overview')}
                                                </h3>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {/* Lectura del pasaje */}
                                                <div 
                                                    onClick={() => setOpenFeatureModal('lectura-pasaje')}
                                                    className="group relative p-4 rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 hover:border-blue-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                                                            <BookOpen className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.readPassage.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.readPassage.description')}
                                                            </p>
                                                            {/* Preview content - appears on hover */}
                                                            <div className="mt-3 pt-3 border-t border-blue-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] font-mono text-blue-600/80 space-y-1">
                                                                    <div>πιστεύοντες → <span className="text-muted-foreground">pisteúontes</span></div>
                                                                    <div className="text-[9px] text-muted-foreground italic">{t('features.readPassage.preview')}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Hover badge */}
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-medium">
                                                            {t('buttons.viewExample')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Estructura Sintáctica */}
                                                <div 
                                                    onClick={() => setOpenFeatureModal('estructura-sintactica')}
                                                    className="group relative p-4 rounded-lg border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 hover:border-cyan-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                                                            <svg className="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.syntax.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.syntax.description')}
                                                            </p>
                                                            {/* Preview content */}
                                                            <div className="mt-3 pt-3 border-t border-cyan-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] space-y-1">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="w-1 h-1 rounded-full bg-cyan-500"></span>
                                                                        <span className="text-muted-foreground">{t('features.syntax.preview.mainClause')}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 ml-3">
                                                                        <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                                                                        <span className="text-muted-foreground">{t('features.syntax.preview.subordinateClause')}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-medium">
                                                            Ver ejemplo
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: Estudio de Palabras */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                                    {t('sections.wordStudy')}
                                                </h3>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {/* Análisis morfológico */}
                                                <div 
                                                    onClick={() => setOpenFeatureModal('analisis-morfologico')}
                                                    className="group relative p-4 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5 hover:border-purple-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                                            <Sparkles className="h-4 w-4 text-purple-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.morphology.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.morphology.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-purple-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] space-y-1.5">
                                                                    <div><span className="font-mono text-purple-600">πιστ-</span> <span className="text-muted-foreground">{t('features.morphology.preview.root')}</span></div>
                                                                    <div><span className="font-mono text-purple-600">-ευ-</span> <span className="text-muted-foreground">{t('features.morphology.preview.thematicVowel')}</span></div>
                                                                    <div><span className="font-mono text-purple-600">-οντες</span> <span className="text-muted-foreground">{t('features.morphology.preview.participle')}</span></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-medium">
                                                            Ver ejemplo
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Claves de reconocimiento */}
                                                <div 
                                                    onClick={() => setOpenFeatureModal('claves-reconocimiento')}
                                                    className="group relative p-4 rounded-lg border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5 hover:border-pink-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-pink-500/10 group-hover:bg-pink-500/20 transition-colors">
                                                            <svg className="h-4 w-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.recognitionKeys.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.recognitionKeys.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-pink-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground space-y-1">
                                                                    <div>💡 <span className="font-medium">-οντες</span> indica participio presente activo</div>
                                                                    <div>📌 Terminación típica del tiempo presente</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-700 dark:text-pink-300 font-medium">
                                                            Ver ejemplo
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Función contextual */}
                                                <div 
                                                    onClick={() => setOpenFeatureModal('funcion-contexto')}
                                                    className="group relative p-4 rounded-lg border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/5 to-purple-500/5 hover:border-fuchsia-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-fuchsia-500/10 group-hover:bg-fuchsia-500/20 transition-colors">
                                                            <svg className="h-4 w-4 text-fuchsia-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.contextFunction.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.contextFunction.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-fuchsia-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    <div className="font-medium text-fuchsia-600 mb-1">{t('features.contextFunction.preview.subject')}</div>
                                                                    <div>{t('features.contextFunction.preview.function')}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 font-medium">
                                                            Ver ejemplo
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Insight experto */}
                                                <div 
                                                    onClick={() => setOpenFeatureModal('insight-experto')}
                                                    className="group relative p-4 rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5 hover:border-violet-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                                                            <Lightbulb className="h-4 w-4 text-violet-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.expertInsight.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.expertInsight.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-violet-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground italic">
                                                                    "{t('features.expertInsight.preview')}"
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-700 dark:text-violet-300 font-medium">
                                                            Ver ejemplo
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 3: Refuerzo del Aprendizaje */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 w-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                    {t('sections.learningReinforcement')}
                                                </h3>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {/* Conceptos generales */}
                                                <div 
                                                    onClick={() => setOpenFeatureModal('conceptos-generales')}
                                                    className="group relative p-4 rounded-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:border-amber-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                                                            <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.generalConcepts.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.generalConcepts.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-amber-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground space-y-1">
                                                                    <div>📚 {t('features.generalConcepts.preview.cases')}</div>
                                                                    <div>📚 {t('features.generalConcepts.preview.tenses')}</div>
                                                                    <div>📚 {t('features.generalConcepts.preview.moods')}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                                                            {t('buttons.explore')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Preguntas al tutor */}
                                                <div 
                                                    onClick={() => setOpenFeatureModal('preguntas-tutor')}
                                                    className="group relative p-4 rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5 hover:border-orange-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                                                            <MessageCircle className="h-4 w-4 text-orange-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.tutorQuestions.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.tutorQuestions.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-orange-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground italic">
                                                                    "{t('features.tutorQuestions.preview')}"
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 font-medium">
                                                            {t('buttons.ask')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Quiz de comprensión */}
                                                <div 
                                                    onClick={() => setOpenFeatureModal('quiz-comprension')}
                                                    className="group relative p-4 rounded-lg border border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5 hover:border-green-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                                                            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.quiz.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.quiz.description')}
                                                            </p>
                                                            <div className="mt-3 pt-3 border-t border-green-500/10 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-32 transition-all duration-300 overflow-hidden">
                                                                <div className="text-[10px] text-muted-foreground space-y-1">
                                                                    <div>✓ {t('features.quiz.preview.identify')}</div>
                                                                    <div>✓ {t('features.quiz.preview.analyze')}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-300 font-medium">
                                                            {t('buttons.practice')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Mis Insights */}
                                                <div 
                                                    onClick={() => setShowInsightsDialog(true)}
                                                    className="group relative p-4 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5 hover:border-purple-500/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                                            <Bookmark className="h-4 w-4 text-purple-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm mb-0.5">{t('features.myInsights.title')}</h4>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {t('features.myInsights.description')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-medium">
                                                            {t('buttons.view')}
                                                        </span>
                                                    </div>
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
            {/* Feature Modals for !isActive state */}
            <FeatureModal
                isOpen={openFeatureModal === 'lectura-pasaje'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.readPassage.title')}
                description={t('features.readPassage.description')}
                screenshotPath="/greek-tutor-previews/lectura_pasaje.png"
                details={t('features.readPassage.details', { returnObjects: true }) as string[]}
            />
            
            <FeatureModal
                isOpen={openFeatureModal === 'estructura-sintactica'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.syntax.title')}
                description={t('features.syntax.description')}
                screenshotPath="/greek-tutor-previews/estructura_sintactica.png"
                details={t('features.syntax.details', { returnObjects: true }) as string[]}
            />
            
            <FeatureModal
                isOpen={openFeatureModal === 'analisis-morfologico'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.morphology.title')}
                description={t('features.morphology.description')}
                screenshotPath="/greek-tutor-previews/analisis_morfologico.png"
                details={t('features.morphology.details', { returnObjects: true }) as string[]}
            />
            
            <FeatureModal
                isOpen={openFeatureModal === 'claves-reconocimiento'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.recognitionKeys.title')}
                description={t('features.recognitionKeys.description')}
                screenshotPath="/greek-tutor-previews/claves_reconocimiento.png"
                details={t('features.recognitionKeys.details', { returnObjects: true }) as string[]}
            />
            
            <FeatureModal
                isOpen={openFeatureModal === 'funcion-contexto'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.contextFunction.title')}
                description={t('features.contextFunction.description')}
                screenshotPath="/greek-tutor-previews/funcion_contexto.png"
                details={t('features.contextFunction.details', { returnObjects: true }) as string[]}
            />
            
            <FeatureModal
                isOpen={openFeatureModal === 'insight-experto'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.expertInsight.title')}
                description={t('features.expertInsight.description')}
                screenshotPath="/greek-tutor-previews/insight_experto.png"
                details={t('features.expertInsight.details', { returnObjects: true }) as string[]}
            />
            
            <FeatureModal
                isOpen={openFeatureModal === 'conceptos-generales'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.generalConcepts.title')}
                description={t('features.generalConcepts.description')}
                screenshotPath="/greek-tutor-previews/conceptos_generales.png"
                details={t('features.generalConcepts.details', { returnObjects: true }) as string[]}
            />
            
            <FeatureModal
                isOpen={openFeatureModal === 'preguntas-tutor'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.tutorQuestions.title')}
                description={t('features.tutorQuestions.description')}
                screenshotPath="/greek-tutor-previews/preguntas_tutor.png"
                details={t('features.tutorQuestions.details', { returnObjects: true }) as string[]}
            />
            
            <FeatureModal
                isOpen={openFeatureModal === 'quiz-comprension'}
                onClose={() => setOpenFeatureModal(null)}
                title={t('features.quiz.title')}
                description={t('features.quiz.description')}
                screenshotPath="/greek-tutor-previews/quiz_comprension.png"
                details={t('features.quiz.details', { returnObjects: true }) as string[]}
            />
            </>
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
                        <span className="hidden sm:inline">{t('ui.navigation.back')}</span>
                    </Button>

                    {/* Page Title & Passage Info */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-sm leading-tight">{t('ui.navigation.greekTutor')}</h1>
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
                                <span className="hidden md:inline">{t('ui.navigation.askTutor')}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96" align="end">
                            <div className="space-y-4">
                                {/* Header with mode selector */}
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">{t('ui.navigation.askTutor')}</h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setChatMode('contextual')}
                                            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                                                chatMode === 'contextual'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            {t('askTutor.contextualMode')}
                                        </button>
                                        <button
                                            onClick={() => setChatMode('general')}
                                            className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                                                chatMode === 'general'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            {t('askTutor.generalMode')}
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
                                            ? t('askTutor.placeholderContextual')
                                            : t('askTutor.placeholderGeneral')
                                    }
                                    className="min-h-[100px] resize-none text-sm"
                                    disabled={isBoardLoading}
                                />

                                {/* Action buttons */}
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-muted-foreground">
                                        <Trans ns="greekTutor" i18nKey="askTutor.pressEnterHint" values={{ key: 'Enter' }} components={{ kbd: <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]" /> }} />
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
                                            {t('askTutor.cancel')}
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
                                                    {t('askTutor.processing')}
                                                </>
                                            ) : (
                                                t('askTutor.send')
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
                        <span className="hidden lg:inline">{t('ui.navigation.concepts')}</span>
                    </Button>

                    {/* Mis Insights Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 gap-2"
                        onClick={() => setShowInsightsDialog(true)}
                        title={t('insights.modalTitle')}
                    >
                        <Bookmark className="h-4 w-4" />
                        <span className="hidden lg:inline">{t('ui.navigation.insights')}</span>
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
                                {t('ui.navigation.changePassage')}
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
                            onSaveInsight={handleSaveInsight}
                            onUnitAdded={(newUnit) => {
                                // Adding new unit from passage reader
                                setUnits(prevUnits => [...prevUnits, newUnit]);
                            }}
                            onRetrySyntax={() => handleActionClick('syntax')}
                        />
                    </main>

                    {/* Floating Word Analysis Toolbar - ONLY for Study Units (when not in other modes) */}
                {isActive && activeAction !== 'passage' && activeAction !== 'syntax' && activeAction !== 'quiz' && (
                    <div className="absolute top-6 right-6 z-20">
                        <WordAnalysisToolbar
                            currentUnit={currentUnit ?? null}
                            activeAction={activeAction}
                            onActionClick={(action) => handleActionClick(action)}
                            isLoading={isBoardLoading}
                        />
                    </div>
                )}
                </div>
            )}
            
            
            {/* Insights Dialog */}
            <Dialog open={showInsightsDialog} onOpenChange={setShowInsightsDialog}>
                <DialogContent className="!w-[90vw] !max-w-[1400px] min-h-[200px] max-h-[90vh] overflow-hidden flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle>{t('insights.modalTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('insights.modalSubtitle')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto min-h-0">
                        <InsightsViewer />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Concepts Library Modal */}
            <ConceptsLibraryModal
                open={isConceptsLibraryOpen}
                onOpenChange={setIsConceptsLibraryOpen}
            />
        </div>
    );
};
