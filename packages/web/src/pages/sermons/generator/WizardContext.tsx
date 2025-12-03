import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
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
    reset: () => void;
    saving: boolean;
    lastSaved: Date | null;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
    const { user } = useFirebase();
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
                    console.log('Creating draft sermon...', { passage, exegesis });
                    const newSermonId = await sermonService.createDraft({
                        userId: user.uid,
                        passage,
                        wizardProgress: {
                            currentStep: step,
                            passage,
                            exegesis,
                            lastSaved: new Date()
                        }
                    });
                    console.log('Draft sermon created with ID:', newSermonId);
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

    const contextValue = useMemo(() => ({
        step,
        passage,
        rules,
        exegesis,
        homiletics,
        draft,
        config,
        setStep,
        setPassage,
        setRules,
        setExegesis,
        setHomiletics,
        setDraft,
        setSermonId,
        reset,
        saving,
        lastSaved
    }), [step, passage, rules, exegesis, homiletics, draft, config, saving, lastSaved]);

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
