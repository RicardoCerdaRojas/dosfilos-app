import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { useFirebase } from '@/context/firebase-context';
import { seriesService, libraryService, plannerChatService, ConfigService } from '@dosfilos/application';
import { FirebaseConfigRepository } from '@dosfilos/infrastructure';
import { LibraryResourceEntity, SermonSeriesEntity, Citation } from '@dosfilos/domain';
import { toast } from 'sonner';
import { useUsageLimits } from '@/hooks/useUsageLimits';

export type PlannerStep = 'strategy' | 'context' | 'objective' | 'structure' | 'generating';

export function usePlannerWizard() {
    const { user } = useFirebase();
    const { i18n } = useTranslation(); // Get i18n instance
    const navigate = useNavigate();
    const { checkCanCreatePreachingPlan } = useUsageLimits();

    // UI State
    const [step, setStep] = useState<PlannerStep>('strategy');
    const [loading, setLoading] = useState(false);

    // Upgrade modal state
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeReason, setUpgradeReason] = useState({
        reason: 'limit_reached' as const,
        limitType: 'plans' as const,
        currentLimit: 1
    });

    // Data State
    const [resources, setResources] = useState<LibraryResourceEntity[]>([]);
    const [indexStatus, setIndexStatus] = useState<Record<string, boolean>>({});

    // Form State
    const [strategy, setStrategy] = useState<'thematic' | 'expository'>('thematic');
    const [topicOrBook, setTopicOrBook] = useState('');
    const [subtopicsOrRange, setSubtopicsOrRange] = useState('');
    const [numberOfSermons, setNumberOfSermons] = useState<number | ''>('');
    const [startDate, setStartDate] = useState(''); // Default to empty (optional)
    const [endDate, setEndDate] = useState('');
    const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | undefined>('weekly');
    const [selectedResources, setSelectedResources] = useState<string[]>([]);
    const [plannerNotes, setPlannerNotes] = useState('');

    // Generated Content State
    const [seriesObjective, setSeriesObjective] = useState<{ title: string; description: string; objective: string; pastoralAdvice?: string; suggestedSermonCount?: number } | null>(null);
    const [proposedPlan, setProposedPlan] = useState<{ series: Partial<SermonSeriesEntity>; sermons: { title: string; description: string; passage?: string; week: number }[]; structureJustification?: string; citations?: Citation[] } | null>(null);

    // Refinement State
    const [refiningSection, setRefiningSection] = useState<string | null>(null);
    const [isReformulating, setIsReformulating] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [selectedBibleRef, setSelectedBibleRef] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        if (user) {
            const loadResources = async () => {
                try {
                    const [userRes, coreRes, userConfig] = await Promise.all([
                        libraryService.getUserResources(user.uid),
                        libraryService.getCoreResources(),
                        new ConfigService(new FirebaseConfigRepository()).getUserConfig(user.uid)
                    ]);

                    // Merge resources (Core first)
                    const allResources = [...coreRes, ...userRes.filter(ur => !coreRes.some(cr => cr.id === ur.id))];
                    setResources(allResources);

                    // Check index status
                    const statuses: Record<string, boolean> = {};
                    for (const resource of allResources) {
                        try {
                            const isIndexed = await libraryService.isResourceIndexed(resource.id);
                            statuses[resource.id] = isIndexed;
                        } catch {
                            statuses[resource.id] = false;
                        }
                    }
                    setIndexStatus(statuses);

                    // Load saved config
                    const savedLibraryDocIds = (userConfig as any)?.seriesPlanner?.libraryDocIds || [];
                    const coreIds = coreRes.map(r => r.id);

                    if (savedLibraryDocIds.length > 0) {
                        const validUserIds = savedLibraryDocIds.filter((id: string) =>
                            userRes.some(r => r.id === id)
                        );
                        setSelectedResources([...coreIds, ...validUserIds]);
                    } else {
                        setSelectedResources(allResources.map(r => r.id));
                    }
                } catch (error) {
                    console.error('Error loading resources:', error);
                }
            };
            loadResources();
        }
    }, [user]);

    // Actions
    const handleGenerateObjective = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const objective = await seriesService.generateSeriesObjective(user.uid, {
                type: strategy,
                topicOrBook,
                subtopicsOrRange,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                frequency,
                contextResourceIds: selectedResources,
                plannerNotes: plannerNotes || undefined,
                language: i18n.language // Pass language
            });

            setSeriesObjective(objective);
            setStep('objective');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateStructure = async () => {
        if (!user || !seriesObjective) return;
        setLoading(true);
        try {
            const plan = await seriesService.generateSeriesStructure(user.uid, {
                type: strategy,
                topicOrBook,
                subtopicsOrRange,
                numberOfSermons: numberOfSermons === '' ? undefined : numberOfSermons,
                startDate: startDate ? new Date(startDate) : undefined,
                frequency,
                contextResourceIds: selectedResources,
                language: i18n.language // Pass language
            }, seriesObjective);
            setProposedPlan(plan);
            setStep('structure');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!user || !proposedPlan) return;

        const check = await checkCanCreatePreachingPlan();

        if (!check.allowed) {
            setUpgradeReason({
                reason: 'limit_reached',
                limitType: 'plans',
                currentLimit: check.limit || 1
            });
            setShowUpgradeModal(true);
            return;
        }

        setLoading(true);
        try {
            await seriesService.createSeriesFromPlan(user.uid, {
                series: {
                    ...proposedPlan.series,
                    resourceIds: selectedResources
                },
                sermons: proposedPlan.sermons
            });
            toast.success('Plan de predicación creado exitosamente');
            navigate('/dashboard/plans');
        } catch (error: any) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    const updateSermon = (index: number, field: 'title' | 'description' | 'passage', value: string) => {
        if (!proposedPlan) return;
        const newSermons = [...proposedPlan.sermons];
        const currentSermon = newSermons[index];
        if (!currentSermon) return;
        newSermons[index] = {
            ...currentSermon,
            [field]: value
        };
        setProposedPlan({ ...proposedPlan, sermons: newSermons });
    };

    const handleRefine = async (field: string, currentValue: string) => {
        setRefiningSection(field);
        setIsChatOpen(true);

        const context = {
            type: strategy,
            topicOrBook,
            resources: resources.filter(r => selectedResources.includes(r.id))
        };

        const phaseContext = seriesObjective
            ? `\n\nContexto de la serie actual:
- Título: "${seriesObjective.title}"
- Descripción: "${seriesObjective.description}"
- Objetivo General: "${seriesObjective.objective}"`
            : '';

        const prompt = `[HIDDEN] Estoy trabajando en la sección "${field}":
        
"${currentValue}"
${phaseContext}

Quiero refinar la sección "${field}". Por favor, NO la reescribas todavía. Simplemente salúdame y pregúntame qué aspecto específico me gustaría mejorar o si tengo alguna dirección en mente. Sé breve y servicial. Recuerda que tienes acceso al contexto completo de las otras secciones si necesito que las uses como referencia.`;

        try {
            await plannerChatService.sendMessage(prompt, context);
        } catch (error) {
            toast.error('Error al contactar al asistente');
        }
    };

    const handleReformulate = async () => {
        const context = {
            type: strategy,
            topicOrBook,
            resources: resources.filter(r => selectedResources.includes(r.id))
        };
        const prompt = `[HIDDEN] Basado en nuestra conversación, por favor reformula la sección "${refiningSection}" completa ahora.
        
IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido en este formato exacto (sin markdown, sin texto extra):
{
    "reformulatedText": "el texto completo reformulado aquí"
}`;

        setIsReformulating(true);
        try {
            const response = await plannerChatService.sendMessage(prompt, context);
            const content = response.content || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : content;
            const data = JSON.parse(jsonString);

            if (data.reformulatedText) {
                if (refiningSection === 'Título de la Serie') {
                    setSeriesObjective(prev => prev ? ({ ...prev, title: data.reformulatedText }) : null);
                } else if (refiningSection === 'Descripción') {
                    setSeriesObjective(prev => prev ? ({ ...prev, description: data.reformulatedText }) : null);
                } else if (refiningSection === 'Objetivo General') {
                    setSeriesObjective(prev => prev ? ({ ...prev, objective: data.reformulatedText }) : null);
                } else if (refiningSection && refiningSection.startsWith('Sermón')) {
                    const match = refiningSection.match(/Sermón (\d+): (.+)/);
                    if (match && match[1] && match[2] && proposedPlan) {
                        const index = parseInt(match[1]) - 1;
                        const field = match[2] === 'Título' ? 'title' : 'description';
                        const newSermons = [...proposedPlan.sermons];
                        if (newSermons[index]) {
                            newSermons[index] = { ...newSermons[index], [field]: data.reformulatedText };
                            setProposedPlan({ ...proposedPlan, sermons: newSermons });
                        }
                    }
                }
                toast.success('Sección actualizada automáticamente');
            }
        } catch (error) {
            console.error('Error parsing response:', error);
            toast.error('No se pudo actualizar automáticamente. Por favor revisa el chat.');
        } finally {
            setIsReformulating(false);
        }
    };

    return {
        // State
        step, setStep,
        loading,
        showUpgradeModal, setShowUpgradeModal,
        upgradeReason,
        resources, indexStatus,

        // Form Data
        strategy, setStrategy,
        topicOrBook, setTopicOrBook,
        subtopicsOrRange, setSubtopicsOrRange,
        numberOfSermons, setNumberOfSermons,
        startDate, setStartDate,
        endDate, setEndDate,
        frequency, setFrequency,
        selectedResources, setSelectedResources,
        plannerNotes, setPlannerNotes,

        // Generated Data
        seriesObjective, setSeriesObjective,
        proposedPlan, setProposedPlan,
        refiningSection, setRefiningSection,
        isReformulating,
        isChatOpen, setIsChatOpen,
        selectedBibleRef, setSelectedBibleRef,

        // Handlers
        handleGenerateObjective,
        handleGenerateStructure,
        handleFinalize,
        updateSermon,
        handleRefine,
        handleReformulate
    };
}
