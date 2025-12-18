import { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useWizard, WizardProvider } from './WizardContext';
import { WizardHeader } from './WizardHeader';
import { StepPassage } from './StepPassage';
import { StepExegesis } from './StepExegesis';
import { StepHomiletics } from './StepHomiletics';
import { StepDraft } from './StepDraft';
import { SermonsInProgress } from './SermonInProgress';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sermonService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { SermonEntity } from '@dosfilos/domain';
import { LibraryContextProvider } from '@/context/library-context';

function WizardContent() {
    const { step, setStep, setPassage, setExegesis, setHomiletics, setDraft, setSermonId, reset, setCacheName, setSelectedResourceIds } = useWizard();
    const { user } = useFirebase();
    const [searchParams] = useSearchParams();
    const [inProgressSermons, setInProgressSermons] = useState<SermonEntity[]>([]);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    // Check for in-progress sermons on mount or when location key changes (navigation)
    useEffect(() => {
        const checkForInProgress = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            // Check if we're resuming a specific sermon via URL param
            const sermonIdParam = searchParams.get('id');

            
            if (sermonIdParam) {
                try {

                    const sermon = await sermonService.getSermon(sermonIdParam);

                    
                    if (sermon && sermon.wizardProgress) {
                        // Resume this specific sermon
                        setSermonId(sermon.id);
                        
                        const progress = sermon.wizardProgress;
                        setPassage(progress.passage || '');
                        if (progress.exegesis) setExegesis(progress.exegesis);
                        if (progress.homiletics) setHomiletics(progress.homiletics);
                        if (progress.draft) setDraft(progress.draft);
                        if (progress.cacheName) setCacheName(progress.cacheName);
                        if (progress.selectedResourceIds) setSelectedResourceIds(progress.selectedResourceIds);
                        
                        // If no passage, go to step 0 (passage selection)
                        if (!progress.passage) {
                            setStep(0);
                        } else if (progress.currentStep) {
                            setStep(progress.currentStep);
                        } else if (progress.draft) {
                            setStep(3);
                        } else if (progress.homiletics) {
                            setStep(2);
                        } else {
                            setStep(1);
                        }
                        
                        setLoading(false);
                        return;
                    } else {
                        console.warn('⚠️ SermonWizard: Sermon not found or no wizardProgress');
                    }
                } catch (error: any) {
                    console.error('❌ SermonWizard: Error loading sermon from URL param:', error);
                    console.error('❌ Error message:', error.message);
                    console.error('❌ Error code:', error.code);
                }
            }

            try {
                const sermons = await sermonService.getInProgressSermons(user.uid);
                if (sermons.length > 0) {
                    setInProgressSermons(sermons);
                    setShowResumePrompt(true);
                }
            } catch (error) {
                console.error('Error checking for in-progress sermons:', error);
            } finally {
                setLoading(false);
            }
        };

        checkForInProgress();
    }, [user, location.key, searchParams]);

    const handleContinue = (sermon: SermonEntity) => {
        if (!sermon.wizardProgress) return;

        const progress = sermon.wizardProgress;
        
        // Restore wizard state including sermonId
        setSermonId(sermon.id);
        setPassage(progress.passage);
        if (progress.exegesis) setExegesis(progress.exegesis);
        if (progress.homiletics) setHomiletics(progress.homiletics);
        if (progress.draft) setDraft(progress.draft);
        if (progress.cacheName) setCacheName(progress.cacheName);
        if (progress.selectedResourceIds) setSelectedResourceIds(progress.selectedResourceIds);
        
        // Restore step if available, otherwise infer from content
        if (progress.currentStep) {
            setStep(progress.currentStep);
        } else if (progress.draft) {
            setStep(3);
        } else if (progress.homiletics) {
            setStep(2);
        }

        setShowResumePrompt(false);
    };

    const handleDiscard = async (sermon: SermonEntity) => {
        try {
            await sermonService.deleteSermon(sermon.id);
            setInProgressSermons(prev => prev.filter(s => s.id !== sermon.id));
            
            if (inProgressSermons.length === 1) {
                setShowResumePrompt(false);
            }
        } catch (error) {
            console.error('Error discarding sermon:', error);
        }
    };

    const handlePublish = async (sermon: SermonEntity) => {
        try {
            await sermonService.publishSermonAsCopy(sermon.id);
            // Refresh the list to show updated publish status
            const sermons = await sermonService.getInProgressSermons(user!.uid);
            setInProgressSermons(sermons);
        } catch (error) {
            console.error('Error publishing sermon:', error);
        }
    };

    const handleDuplicate = async (sermon: SermonEntity) => {
        try {
            // Create a copy by using the wizard progress data
            if (!sermon.wizardProgress) return;
            
            const duplicatedSermon = await sermonService.createSermon({
                userId: user!.uid,
                title: `${sermon.title || sermon.wizardProgress.passage} (Copia)`,
                passage: sermon.wizardProgress.passage,
                status: 'draft',
                wizardProgress: {
                    ...sermon.wizardProgress,
                    publishedCopyId: undefined,
                    lastPublishedAt: undefined,
                    publishCount: undefined,
                    lastSaved: new Date(),
                },
            });
            
            // Add to the list
            setInProgressSermons(prev => [duplicatedSermon, ...prev]);
        } catch (error) {
            console.error('Error duplicating sermon:', error);
        }
    };

    const handleNewSermon = () => {
        reset();
        setShowResumePrompt(false);
    };

    const handleExit = async () => {
        setLoading(true);
        reset();
        if (user) {
            try {
                const sermons = await sermonService.getInProgressSermons(user.uid);
                setInProgressSermons(sermons);
                if (sermons.length > 0) {
                    setShowResumePrompt(true);
                }
            } catch (error) {
                console.error('Error refreshing sermons on exit:', error);
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando...</p>
                </div>
            </div>
        );
    }

    if (showResumePrompt) {
        return (
            <div className="space-y-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Generador de Sermones</h1>
                    <p className="text-muted-foreground">
                        Tienes sermones en progreso. ¿Deseas continuar con alguno?
                    </p>
                </div>

                <SermonsInProgress
                    sermons={inProgressSermons}
                    onContinue={handleContinue}
                    onDiscard={handleDiscard}
                    onPublish={handlePublish}
                    onDuplicate={handleDuplicate}
                />

                <div className="mt-6 text-center">
                    <Button onClick={handleNewSermon} variant="outline" size="lg">
                        <Plus className="mr-2 h-4 w-4" />
                        Comenzar Nuevo Sermón
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Compact Header */}
            <WizardHeader currentStep={step} onExit={handleExit} />

            {/* Step Content - Full height with fixed layout */}
            <div className="flex-1 overflow-hidden px-4 py-2">
                {step === 0 && <StepPassage />}
                {step === 1 && <StepExegesis />}
                {step === 2 && <StepHomiletics />}
                {step === 3 && <StepDraft />}
            </div>
        </div>
    );
}

// Wrapper to connect LibraryContextProvider with WizardContext
function LibraryContextWrapper({ children }: { children: React.ReactNode }) {
    const { user } = useFirebase();
    const { selectedResourceIds, config, step } = useWizard();
    
    // Map step to phase config key
    const phaseConfigKey = useMemo(() => {
        switch (step) {
            case 1: return 'exegesis';
            case 2: return 'homiletics';
            case 3: return 'drafting';
            default: return 'exegesis';
        }
    }, [step]);
    
    // Get resource IDs from config based on current phase
    const effectiveResourceIds = useMemo(() => {
        // If explicitly selected resources, use those
        if (selectedResourceIds.length > 0) return selectedResourceIds;
        
        // Get from phase-specific config
        const phaseConfig = config?.[phaseConfigKey as keyof typeof config] as any;
        return phaseConfig?.libraryDocIds || phaseConfig?.documents?.map((d: any) => d.id) || [];
    }, [selectedResourceIds, config, phaseConfigKey]);
    
    return (
        <LibraryContextProvider 
            user={user} 
            initialResourceIds={effectiveResourceIds}
            phaseKey={phaseConfigKey}
        >
            {children}
        </LibraryContextProvider>
    );
}

export function SermonWizard() {
    return (
        <WizardProvider>
            <LibraryContextWrapper>
                <WizardContent />
            </LibraryContextWrapper>
        </WizardProvider>
    );
}
