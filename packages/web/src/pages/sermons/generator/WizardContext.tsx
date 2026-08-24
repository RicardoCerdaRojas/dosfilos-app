import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExegeticalStudy, HomileticalAnalysis, GenerationRules, Sermon, SermonContent, SermonElement, WorkflowConfiguration } from '@dosfilos/domain';
import { useFirebase } from '@/context/firebase-context';
import { ConfigService } from '@dosfilos/application';
import { FirebaseConfigRepository } from '@dosfilos/infrastructure';
import { sermonService } from '@dosfilos/application';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useEphemeralWizardState } from '@/hooks/useEphemeralWizardState';

type DerivedContext = NonNullable<NonNullable<Sermon['wizardProgress']>['derivedContext']>;

interface WizardState {
    step: number;
    passage: string;
    rules: GenerationRules;
    exegesis: ExegeticalStudy | null;
    homiletics: HomileticalAnalysis | null;
    draft: SermonContent | null;
    config: WorkflowConfiguration | null;
    /**
     * Set when the wizard's state was pre-populated by the paper →
     * sermon transformer (Pipeline A). Each Step component reads this
     * field to render the "Pre-cargado desde paper {X}" banner so the
     * user understands the data's provenance.
     */
    derivedContext: DerivedContext | null;
    /**
     * ADR-037 — decisiones de redacción socrática, por `sectionId`.
     *
     * Vive en el contexto y no en el paso, porque el recorrido cruza secciones
     * (cuerpo → conclusión → introducción → título) y el mapa lateral las lee
     * todas a la vez.
     */
    sectionElements: Record<string, SermonElement[]>;
}

interface WizardContextType extends WizardState {
    setSectionElements: (sectionId: string, elements: SermonElement[]) => void;
    /** Carga el mapa completo al restaurar un sermón guardado. */
    restoreSectionElements: (map: Record<string, SermonElement[]>) => void;
    setStep: (step: number) => void;
    setPassage: (passage: string) => void;
    setRules: (rules: GenerationRules) => void;
    setExegesis: (exegesis: ExegeticalStudy) => void;
    /**
     * Acepta `null` para DESCARTAR la propuesta desarrollada. El estado interno
     * siempre fue `HomileticalAnalysis | null` y el propio contexto ya lo
     * limpiaba así; el tipo expuesto era más estrecho que la realidad, y eso
     * impedía que un llamador hiciera lo que el contexto sí hace.
     */
    setHomiletics: (homiletics: HomileticalAnalysis | null) => void;
    setDraft: (draft: SermonContent) => void;
    setSermonId: (id: string | null) => void;
    setDerivedContext: (ctx: DerivedContext | null) => void;
    selectHomileticalApproach: (approachId: string) => void;  // 🎯 NEW
    reset: () => void;
    saving: boolean;
    lastSaved: Date | null;
    sermonId: string | null; // 🎯 Expose to allow publishing
    /**
     * Live counter of completed PastoralSeed sub-steps. Lifted to
     * context so the global `WizardHeader` pipeline (which lives
     * outside the seed wizard's render tree) can show the `n/6`
     * badge updating in real time as the pastor types. PastoralSeedWizard
     * is the producer; WizardHeader is the consumer.
     */
    seedCompletedSteps: number;
    setSeedCompletedSteps: (n: number) => void;
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
    const [passage, setPassageState] = useState('');
    const [rules, setRules] = useState<GenerationRules>({
        targetAudience: 'general',
        tone: 'pastoral',
    });
    const [exegesis, setExegesis] = useState<ExegeticalStudy | null>(null);
    const [homiletics, setHomiletics] = useState<HomileticalAnalysis | null>(null);
    const [draft, setDraft] = useState<SermonContent | null>(null);
    const [config, setConfig] = useState<WorkflowConfiguration | null>(null);
    const [sermonId, setSermonId] = useState<string | null>(null);
    const [derivedContext, setDerivedContext] = useState<DerivedContext | null>(null);
    const [seedCompletedSteps, setSeedCompletedSteps] = useState<number>(0);
    const [sectionElements, setSectionElementsState] = useState<Record<string, SermonElement[]>>({});

    // Ephemeral local persistence for Step 1 — the sermon doc only gets
    // created after exegesis is generated, so without this the passage
    // input wipes on a tab refresh during setup.
    const ephemeral = useEphemeralWizardState({ userId: user?.uid });

    // One-shot hydrate from ephemeral snapshot: only when there's no
    // resumed sermon (sermonId still null + passage still empty) and the
    // user has actual saved content. Won't overwrite a sermon loaded
    // via URL param.
    useEffect(() => {
        if (!ephemeral.hydrated) return;
        if (sermonId || passage) return;
        if (ephemeral.snapshot?.passage) {
            setPassageState(ephemeral.snapshot.passage);
        }
    }, [ephemeral.hydrated, ephemeral.snapshot, sermonId, passage]);

    // Wrap setPassage so every keystroke / autofill / setter call also
    // updates the localStorage snapshot. Once the real sermon exists,
    // autosave + Firestore take over and the ephemeral snapshot is
    // cleared (effect below).
    const setPassage = (next: string) => {
        setPassageState(next);
        if (!sermonId) {
            ephemeral.setPassage(next);
        }
    };

    // Discard the ephemeral snapshot the moment a real sermon doc is
    // created — from that point Firestore is the source of truth and
    // keeping stale localStorage around would just confuse future
    // hydration runs.
    useEffect(() => {
        if (sermonId) {
            ephemeral.clear();
        }
    }, [sermonId, ephemeral]);

    // Auto-save hook
    const { saving, lastSaved } = useAutoSave(
        sermonId,
        {
            step, passage, exegesis, homiletics, draft, derivedContext,
            personalization: rules.personalization ?? null,
            audienceRigor: rules.audienceRigor ?? null,
            // Sólo se manda cuando hay algo que guardar: un objeto vacío
            // escribiría `sectionElements: {}` en todo sermón legacy y borraría
            // la distinción entre "sin medir" y "medido en cero".
            sectionElements: Object.keys(sectionElements).length > 0 ? sectionElements : null,
        },
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

    /**
     * Reemplaza la lista COMPLETA de una sección, no agrega de a uno.
     *
     * El llamador arma la lista y la manda entera: encadenar un setter singular
     * desde React perdería todas las escrituras menos la última cuando el
     * pastor agrega varias ideas de un tirón — ya pasó con las directivas del
     * bosquejo.
     */
    const setSectionElements = (sectionId: string, elements: SermonElement[]) => {
        setSectionElementsState((prev) => ({ ...prev, [sectionId]: elements }));
    };

    const restoreSectionElements = (map: Record<string, SermonElement[]>) => setSectionElementsState(map);

    const reset = () => {
        setStep(1);
        setPassageState('');
        ephemeral.clear();
        setRules({ targetAudience: 'general', tone: 'pastoral' });
        setExegesis(null);
        setHomiletics(null);
        setDraft(null);
        setSermonId(null);
        setDerivedContext(null);
        setSeedCompletedSteps(0);
        setSectionElementsState({});
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
            // The preacher's selected FORM (type-safe: ApproachType → ApproachType)
            homileticalApproach: selectedApproach.type,
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
        derivedContext,
        sectionElements,
        sermonId, // 🎯 Expose to allow publishing
        setStep,
        setPassage,
        setRules,
        setExegesis,
        setHomiletics,
        setDraft,
        setSermonId,
        setDerivedContext,
        setSectionElements,
        restoreSectionElements,
        selectHomileticalApproach,  // 🎯 NEW
        reset,
        saving,
        lastSaved,
        seedCompletedSteps,
        setSeedCompletedSteps,
    }), [step, passage, rules, exegesis, homiletics, draft, config, derivedContext, sectionElements, saving, lastSaved, sermonId, seedCompletedSteps]);

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
