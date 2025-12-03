import { useState, useEffect } from 'react';
import { useWizard, WizardProvider } from './WizardContext';
import { WizardHeader } from './WizardHeader';
import { StepExegesis } from './StepExegesis';
import { StepHomiletics } from './StepHomiletics';
import { StepDraft } from './StepDraft';
import { SermonsInProgress } from './SermonInProgress';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sermonService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { SermonEntity, WorkflowPhase } from '@dosfilos/domain';

function WizardContent() {
    const { step, setPassage, setExegesis, setHomiletics, setDraft, setSermonId, reset } = useWizard();
    const { user } = useFirebase();
    const [inProgressSermons, setInProgressSermons] = useState<SermonEntity[]>([]);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [loading, setLoading] = useState(true);

    // Check for in-progress sermons on mount
    useEffect(() => {
        const checkForInProgress = async () => {
            if (!user) {
                setLoading(false);
                return;
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
    }, [user]);

    const handleContinue = (sermon: SermonEntity) => {
        if (!sermon.wizardProgress) return;

        const progress = sermon.wizardProgress;
        
        // Restore wizard state including sermonId
        setSermonId(sermon.id);
        setPassage(progress.passage);
        if (progress.exegesis) setExegesis(progress.exegesis);
        if (progress.homiletics) setHomiletics(progress.homiletics);
        if (progress.draft) setDraft(progress.draft);

        setShowResumePrompt(false);
    };

    const handleDiscard = async (sermonId: string) => {
        try {
            await sermonService.deleteSermon(sermonId);
            setInProgressSermons(prev => prev.filter(s => s.id !== sermonId));
            
            if (inProgressSermons.length === 1) {
                setShowResumePrompt(false);
            }
        } catch (error) {
            console.error('Error discarding sermon:', error);
        }
    };

    const handleNewSermon = () => {
        reset();
        setShowResumePrompt(false);
    };

    // Get current phase based on step
    const getCurrentPhase = (): WorkflowPhase => {
        switch (step) {
            case 1: return WorkflowPhase.EXEGESIS;
            case 2: return WorkflowPhase.HOMILETICS;
            case 3: return WorkflowPhase.SERMON_DRAFT;
            default: return WorkflowPhase.EXEGESIS;
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
            <div className="container mx-auto px-4 py-8 max-w-4xl">
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
            <WizardHeader currentStep={step} phase={getCurrentPhase()} />

            {/* Step Content - Full height with fixed layout */}
            <div className="flex-1 overflow-hidden px-4 py-2">
                {step === 1 && <StepExegesis />}
                {step === 2 && <StepHomiletics />}
                {step === 3 && <StepDraft />}
            </div>
        </div>
    );
}

export function SermonWizard() {
    return (
        <WizardProvider>
            <WizardContent />
        </WizardProvider>
    );
}
