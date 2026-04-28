import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExegeticalStudy, HomileticalAnalysis, GenerationRules, SermonContent, WorkflowConfiguration } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { ConfigService } from '@dosfilos/application';
import { FirebaseConfigRepository } from '@dosfilos/infrastructure';
import { sermonService } from '@dosfilos/application';
import { useAutoSave } from '@/hooks/useAutoSave';

interface WizardState {
    step: number;
    passage: string;
    rules: GenerationRules;
    exegesis: ExegeticalStudy | null;
    homiletics: HomileticalAnalysis | null;
    draft: SermonContent | null;
    config: WorkflowConfiguration | null;
}

interface WizardContextType extends WizardState {
    setStep: (step: number) => void;
    setPassage: (passage: string) => void;
    setRules: (rules: GenerationRules) => void;
    setExegesis: (exegesis: ExegeticalStudy) => void;
    setHomiletics: (homiletics: HomileticalAnalysis) => void;
    setDraft: (draft: SermonContent) => void;
    setSermonId: (id: string | null) => void;
    selectHomileticalApproach: (approachId: string) => void;  // 🎯 NEW
    reset: () => void;
    saving: boolean;
    lastSaved: Date | null;
    sermonId: string | null; // 🎯 Expose to allow publishing
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
    const { user } = useFirebase();
    const [searchParams] = useSearchParams();
    // If the wizard was launched from a project workspace, the URL carries
    // ?projectId=... — we read it once on mount so the draft sermon is born
    // already linked to the right project.
    const projectIdFromUrl = searchParams.get('projectId') ?? undefined;
    const [step, setStep] = useState(1);
    const [passage, setPassage] = useState('');
    const [rules, setRules] = useState<GenerationRules>({
        targetAudience: 'general',
        tone: 'inspirational',
    });
    const [exegesis, setExegesis] = useState<ExegeticalStudy | null>(null);
    const [homiletics, setHomiletics] = useState<HomileticalAnalysis | null>(null);
    const [draft, setDraft] = useState<SermonContent | null>(null);
    const [config, setConfig] = useState<WorkflowConfiguration | null>(null);
    const [sermonId, setSermonId] = useState<string | null>(null);

    // Auto-save hook
    const { saving, lastSaved } = useAutoSave(
        sermonId,
        { step, passage, exegesis, homiletics, draft },
        user?.uid || ''
    );

    useEffect(() => {
        if (user) {
            const loadConfig = async () => {
                try {
                    const repo = new FirebaseConfigRepository();
                    const service = new ConfigService(repo);
                    const userConfig = await service.getUserConfig(user.uid);
                    if (userConfig) {
                        setConfig(userConfig);
                        setRules(prev => ({
                            ...prev,
                            preferredBibleVersion: userConfig.preferredBibleVersion,
                            theologicalBias: userConfig.theologicalBias
                        }));
                    }
                } catch (error) {
                    console.error('Error loading config:', error);
                }
            };
            loadConfig();
        }
    }, [user]);

    // Create draft sermon when exegesis is first generated
    useEffect(() => {
        const createDraftSermon = async () => {
            if (exegesis && !sermonId && user && passage) {
                try {

                    const newSermonId = await sermonService.createDraft({
                        userId: user.uid,
                        passage,
                        projectId: projectIdFromUrl,
                        wizardProgress: {
                            currentStep: step,
                            passage,
                            exegesis,
                            lastSaved: new Date()
                        }
                    });

                    setSermonId(newSermonId);
                } catch (error) {
                    console.error('Error creating draft sermon:', error);
                }
            }
        };
        createDraftSermon();
    }, [exegesis, sermonId, user, passage, step]);

    const reset = () => {
        setStep(1);
        setPassage('');
        setRules({ targetAudience: 'general', tone: 'inspirational' });
        setExegesis(null);
        setHomiletics(null);
        setDraft(null);
        setSermonId(null);
    };

    // 🎯 NEW: Select homiletical approach and update derived fields
    const selectHomileticalApproach = (approachId: string) => {
        if (!homiletics || !homiletics.homileticalApproaches) {
            console.warn('Cannot select approach: no approaches available');
            return;
        }

        const selectedApproach = homiletics.homileticalApproaches.find(
            a => a.id === approachId
        );

        if (!selectedApproach) {
            console.warn('Selected approach not found:', approachId);
            return;
        }

        // Update homiletics with selected approach
        setHomiletics({
            ...homiletics,
            selectedApproachId: approachId,
            // Update legacy fields from selected approach
            homileticalApproach: selectedApproach.type as any,
            contemporaryApplication: selectedApproach.contemporaryApplication,
            homileticalProposition: selectedApproach.homileticalProposition,
            outlinePreview: selectedApproach.outlinePreview, // 🎯 NEW: Include outline preview
            outline: selectedApproach.outline
        });


    };

    const contextValue = useMemo(() => ({
        step,
        passage,
        rules,
        exegesis,
        homiletics,
        draft,
        config,
        sermonId, // 🎯 Expose to allow publishing
        setStep,
        setPassage,
        setRules,
        setExegesis,
        setHomiletics,
        setDraft,
        setSermonId,
        selectHomileticalApproach,  // 🎯 NEW
        reset,
        saving,
        lastSaved
    }), [step, passage, rules, exegesis, homiletics, draft, config, saving, lastSaved, sermonId]);

    return (
        <WizardContext.Provider value={contextValue}>
            {children}
        </WizardContext.Provider>
    );
}

export function useWizard() {
    const context = useContext(WizardContext);
    if (context === undefined) {
        throw new Error('useWizard must be used within a WizardProvider');
    }
    return context;
}
