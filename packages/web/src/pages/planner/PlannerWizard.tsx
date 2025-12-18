import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '@/context/firebase-context';
import { seriesService, libraryService, plannerChatService, ConfigService } from '@dosfilos/application';
import { FirebaseConfigRepository } from '@dosfilos/infrastructure';
import { LibraryResourceEntity, SermonSeriesEntity, Citation } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Wand2, Calendar as CalendarIcon, Book, Sparkles, Save, RefreshCw, X, FileText, Settings2, CheckCircle2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/canvas-chat/MarkdownRenderer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlannerLayout } from './PlannerLayout';
import { PlannerField } from './PlannerField';
import { BiblePassageViewer, BibleReference } from '@/components/bible/BiblePassageViewer';
import { useTranslation } from '@/i18n';

type Step = 'strategy' | 'context' | 'objective' | 'structure' | 'generating';

export function PlannerWizard() {
    const { user } = useFirebase();
    const navigate = useNavigate();
    const { t } = useTranslation('planner');
    const [step, setStep] = useState<Step>('strategy');
    const [loading, setLoading] = useState(false);
    const [resources, setResources] = useState<LibraryResourceEntity[]>([]);
    
    // Form State
    const [strategy, setStrategy] = useState<'thematic' | 'expository'>('thematic');
    const [topicOrBook, setTopicOrBook] = useState('');
    const [subtopicsOrRange, setSubtopicsOrRange] = useState('');
    const [numberOfSermons, setNumberOfSermons] = useState<number | ''>('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
    const [selectedResources, setSelectedResources] = useState<string[]>([]);
    const [plannerNotes, setPlannerNotes] = useState(''); // Notes/approach from chat conversation

    // Generated State
    const [seriesObjective, setSeriesObjective] = useState<{ title: string; description: string; objective: string; pastoralAdvice?: string; suggestedSermonCount?: number } | null>(null);
    const [proposedPlan, setProposedPlan] = useState<{ series: Partial<SermonSeriesEntity>; sermons: { title: string; description: string; passage?: string; week: number }[]; structureJustification?: string; citations?: Citation[] } | null>(null);
    const [refiningSection, setRefiningSection] = useState<string | null>(null);
    const [isReformulating, setIsReformulating] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [selectedBibleRef, setSelectedBibleRef] = useState<string | null>(null);

    const [indexStatus, setIndexStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (user) {
            // Load library resources and user config in parallel
            Promise.all([
                libraryService.getUserResources(user.uid),
                new ConfigService(new FirebaseConfigRepository()).getUserConfig(user.uid)
            ]).then(async ([res, userConfig]) => {
                setResources(res);
                
                // Check index status for each resource
                const statuses: Record<string, boolean> = {};
                for (const resource of res) {
                    try {
                        const isIndexed = await libraryService.isResourceIndexed(resource.id);
                        statuses[resource.id] = isIndexed;
                    } catch {
                        statuses[resource.id] = false;
                    }
                }
                setIndexStatus(statuses);
                
                // Auto-select resources from saved config if any
                const savedLibraryDocIds = (userConfig as any)?.seriesPlanner?.libraryDocIds || [];
                if (savedLibraryDocIds.length > 0) {
                    // Only select resources that exist in the library
                    const validIds = savedLibraryDocIds.filter((id: string) => 
                        res.some(r => r.id === id)
                    );
                    setSelectedResources(validIds);
                }
            }).catch(console.error);
        }
    }, [user]);

    const handleGenerateObjective = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const objective = await seriesService.generateSeriesObjective(user.uid, {
                type: strategy,
                topicOrBook,
                subtopicsOrRange,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : undefined,
                frequency,
                contextResourceIds: selectedResources,
                plannerNotes: plannerNotes || undefined
            });
            
            // No cleaning needed anymore, we want markdown!
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
                startDate: new Date(startDate || new Date().toISOString()),
                frequency,
                contextResourceIds: selectedResources
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
            navigate('/plans');
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
            title: currentSermon.title,
            description: currentSermon.description,
            passage: currentSermon.passage,
            week: currentSermon.week,
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
        
        // Build full phase context so AI knows about all sections
        const phaseContext = seriesObjective 
            ? `\n\nContexto de la serie actual:
- Título: "${seriesObjective.title}"
- Descripción: "${seriesObjective.description}"
- Objetivo General: "${seriesObjective.objective}"`
            : '';
        
        // Conversational Prompt with full context
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
            
            // Try to extract JSON from response (in case it's wrapped in markdown code blocks)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : response;
            
            const data = JSON.parse(jsonString);
            
            if (data.reformulatedText) {
                // Update State based on refiningSection
                if (refiningSection === 'Título de la Serie') {
                    setSeriesObjective(prev => prev ? ({ ...prev, title: data.reformulatedText }) : null);
                } else if (refiningSection === 'Descripción') {
                    setSeriesObjective(prev => prev ? ({ ...prev, description: data.reformulatedText }) : null);
                } else if (refiningSection === 'Objetivo General') {
                    setSeriesObjective(prev => prev ? ({ ...prev, objective: data.reformulatedText }) : null);
                } else if (refiningSection?.startsWith('Sermón')) {
                    // Handle Sermon updates: "Sermón 1: Título"
                    const match = refiningSection.match(/Sermón (\d+): (.+)/);
                    if (match && proposedPlan) {
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

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                    <Wand2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                        {step === 'strategy' || step === 'context' ? 'Analizando contexto...' : 'Diseñando estructura...'}
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        El Asistente está trabajando con tus recursos teológicos para crear la mejor propuesta.
                    </p>
                </div>
            </div>
        );
    }

    const wizardContent = (
        <div className="w-full h-full py-8 px-4 md:px-8 lg:px-12">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                    <Wand2 className="h-8 w-8 text-primary" />
                    {t('title')}
                </h1>
                <p className="text-muted-foreground mt-2">
                    {t('subtitle')}
                </p>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-center mb-8 gap-2 overflow-x-auto">
                {[t('steps.strategy'), t('steps.context'), t('steps.objective'), t('steps.structure')].map((label, idx) => {
                    const isActive = (step === 'strategy' && idx === 0) ||
                                   (step === 'context' && idx === 1) ||
                                   (step === 'objective' && idx === 2) ||
                                   (step === 'structure' && idx === 3);
                    const isCompleted = (step === 'context' && idx < 1) ||
                                      (step === 'objective' && idx < 2) ||
                                      (step === 'structure' && idx < 3);
                    
                    return (
                        <div key={label} className={`flex items-center gap-2 text-sm whitespace-nowrap ${
                            isActive || isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'
                        }`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                                isActive || isCompleted ? 'bg-primary text-primary-foreground border-primary' : 'border-muted'
                            }`}>
                                {idx + 1}
                            </div>
                            {label}
                            {idx < 3 && <div className="w-8 h-px bg-muted mx-2" />}
                        </div>
                    );
                })}
            </div>

            <Card className="border-2 border-muted/50 shadow-lg">
                <CardContent className="pt-6">
                    {step === 'strategy' && (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <Label className="text-lg">{t('planType.question')}</Label>
                                <RadioGroup value={strategy} onValueChange={(v: any) => setStrategy(v)} className="grid md:grid-cols-2 gap-4">
                                    <div className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer hover:border-primary/50 transition-all ${strategy === 'thematic' ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setStrategy('thematic')}>
                                        <RadioGroupItem value="thematic" id="thematic" className="sr-only" />
                                        <Sparkles className="h-6 w-6 mb-2 text-primary" />
                                        <span className="font-semibold">{t('planType.thematic')}</span>
                                        <span className="text-sm text-muted-foreground mt-1">
                                            {t('planType.thematicDescription')}
                                        </span>
                                    </div>
                                    <div className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer hover:border-primary/50 transition-all ${strategy === 'expository' ? 'border-primary bg-primary/5' : 'border-muted'}`} onClick={() => setStrategy('expository')}>
                                        <RadioGroupItem value="expository" id="expository" className="sr-only" />
                                        <Book className="h-6 w-6 mb-2 text-primary" />
                                        <span className="font-semibold">{t('planType.expository')}</span>
                                        <span className="text-sm text-muted-foreground mt-1">
                                            {t('planType.expositoryDescription')}
                                        </span>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={() => setStep('context')} size="lg">
                                    {t('buttons.next')} <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'context' && (
                        <div className="space-y-6">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="topic">
                                        {strategy === 'thematic' ? 'Tema Principal' : 'Libro Bíblico'}
                                    </Label>
                                    <Input 
                                        id="topic" 
                                        placeholder={strategy === 'thematic' ? 'Ej. La Soberanía de Dios' : 'Ej. Efesios'}
                                        value={topicOrBook}
                                        onChange={e => setTopicOrBook(e.target.value)}
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="subtopics">
                                        {strategy === 'thematic' ? 'Subtemas (Opcional)' : 'Rango de Capítulos (Opcional)'}
                                    </Label>
                                    <Input 
                                        id="subtopics" 
                                        placeholder={strategy === 'thematic' ? 'Ej. Definición, Atributos, Aplicación' : 'Ej. 1-3'}
                                        value={subtopicsOrRange}
                                        onChange={e => setSubtopicsOrRange(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="count">Cantidad de Sermones</Label>
                                        <Input 
                                            id="count" 
                                            type="number" 
                                            min={1} 
                                            max={52}
                                            placeholder="Auto"
                                            value={numberOfSermons}
                                            onChange={e => setNumberOfSermons(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Dejar vacío para auto</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="frequency">Frecuencia</Label>
                                        <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona frecuencia" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="weekly">Semanal</SelectItem>
                                                <SelectItem value="biweekly">Quincenal</SelectItem>
                                                <SelectItem value="monthly">Mensual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="start">Fecha de Inicio</Label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                id="start" 
                                                type="date" 
                                                className="pl-9"
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="end">Fecha de Término</Label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                id="end" 
                                                type="date" 
                                                className="pl-9"
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base">Biblioteca Teológica (Contexto)</Label>
                                        <div className="flex items-center space-x-2">
                                            <Switch 
                                                id="select-all"
                                                checked={resources.length > 0 && selectedResources.length === resources.length}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedResources(resources.map(r => r.id));
                                                    else setSelectedResources([]);
                                                }}
                                            />
                                            <label htmlFor="select-all" className="text-sm font-medium leading-none cursor-pointer text-muted-foreground">
                                                Seleccionar todos
                                            </label>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Selecciona los recursos que el Asistente debe consultar.
                                    </p>
                                    {resources.length === 0 ? (
                                        <div className="text-sm text-muted-foreground italic p-4 bg-muted/30 rounded border border-dashed text-center">
                                            No tienes recursos en tu biblioteca.
                                        </div>
                                    ) : (
                                        <div className="grid gap-2 max-h-48 overflow-y-auto p-2 border rounded bg-muted/10">
                                            {resources.map(res => (
                                                <div key={res.id} className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={res.id} 
                                                        checked={selectedResources.includes(res.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) setSelectedResources([...selectedResources, res.id]);
                                                            else setSelectedResources(selectedResources.filter(id => id !== res.id));
                                                        }}
                                                    />
                                                    <label htmlFor={res.id} className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2">
                                                        {res.title}
                                                        {indexStatus[res.id] && (
                                                            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Indexado
                                                            </Badge>
                                                        )}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Enfoque/Notas section */}
                                <div className="space-y-3 pt-4 border-t">
                                    <div className="space-y-2">
                                        <Label htmlFor="notes" className="text-base flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" />
                                            Enfoque / Notas (Opcional)
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Pega aquí los puntos clave de tu conversación con el Asistente o cualquier nota adicional para guiar la propuesta.
                                        </p>
                                        <Textarea 
                                            id="notes"
                                            value={plannerNotes}
                                            onChange={e => setPlannerNotes(e.target.value)}
                                            placeholder="Ej: Enfoque: LA NAVIDAD RADICAL
- El Costo Radical de la Encarnación
- La Identidad Radical de Jesús
- La Demanda Radical del Reino
- La Piedad Radical como Respuesta"
                                            className="min-h-[120px] resize-y"
                                            rows={5}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setStep('strategy')}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                                </Button>
                                <div className="flex gap-2">
                                    {seriesObjective && (
                                        <Button variant="outline" onClick={() => setStep('objective')}>
                                            Continuar con propuesta actual <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button onClick={handleGenerateObjective} disabled={!topicOrBook} size="lg" className="bg-gradient-to-r from-primary to-purple-600 text-white border-0">
                                        <Wand2 className="mr-2 h-4 w-4" /> {seriesObjective ? 'Regenerar Propuesta' : 'Generar Propuesta'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'objective' && seriesObjective && (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                                    <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" /> Propuesta del Asistente
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        El Asistente ha analizado tu solicitud y propone el siguiente enfoque. Puedes editarlo o refinarlo.
                                    </p>
                                    
                                    {seriesObjective.pastoralAdvice && (
                                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm space-y-3">
                                            <div className="flex gap-2 items-start">
                                                <Sparkles className="h-4 w-4 mt-1 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <span className="font-semibold block mb-2">Nota del Experto:</span>
                                                    <div className="prose prose-sm prose-amber max-w-none">
                                                        <MarkdownRenderer content={seriesObjective.pastoralAdvice} />
                                                    </div>
                                                    
                                                    {seriesObjective.suggestedSermonCount && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            className="bg-white border-amber-300 hover:bg-amber-100 text-amber-900 h-8 mt-3"
                                                            onClick={() => {
                                                                setNumberOfSermons(seriesObjective.suggestedSermonCount!);
                                                                toast.success(`Se ha actualizado a ${seriesObjective.suggestedSermonCount} sermones`);
                                                            }}
                                                        >
                                                            Actualizar a {seriesObjective.suggestedSermonCount} sermones
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-6">
                                {refiningSection && (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-blue-800">
                                            <Sparkles className="h-5 w-5" />
                                            <span className="font-medium">Modo de Refinamiento: {refiningSection}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={handleReformulate} className="bg-white hover:bg-blue-50 text-blue-700 border-blue-200">
                                                <RefreshCw className="mr-2 h-3 w-3" /> Pedir Reformulación
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setRefiningSection(null)} className="text-blue-700 hover:bg-blue-100 hover:text-blue-900">
                                                <X className="mr-2 h-3 w-3" /> Salir del Modo Enfoque
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {(!refiningSection || refiningSection === 'Título de la Serie') && (
                                    <PlannerField 
                                        title="Título de la Serie"
                                        content={seriesObjective.title}
                                        onSave={(val) => setSeriesObjective({...seriesObjective, title: val})}
                                        onRefine={() => handleRefine('Título de la Serie', seriesObjective.title)}
                                        minHeight="min-h-[60px]"
                                        isLoading={isReformulating && refiningSection === 'Título de la Serie'}
                                    />
                                )}

                                {(!refiningSection || refiningSection === 'Descripción') && (
                                    <PlannerField 
                                        title="Descripción"
                                        content={seriesObjective.description}
                                        onSave={(val) => setSeriesObjective({...seriesObjective, description: val})}
                                        onRefine={() => handleRefine('Descripción', seriesObjective.description)}
                                        isLoading={isReformulating && refiningSection === 'Descripción'}
                                    />
                                )}

                                {(!refiningSection || refiningSection === 'Objetivo General') && (
                                    <PlannerField 
                                        title="Objetivo General"
                                        content={seriesObjective.objective}
                                        onSave={(val) => setSeriesObjective({...seriesObjective, objective: val})}
                                        onRefine={() => handleRefine('Objetivo General', seriesObjective.objective)}
                                        minHeight="min-h-[150px]"
                                        isLoading={isReformulating && refiningSection === 'Objetivo General'}
                                    />
                                )}
                            </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setStep('context')}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                                </Button>
                                <Button onClick={handleGenerateStructure} size="lg">
                                    Continuar a Estructura <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'structure' && proposedPlan && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Estructura de Sermones</h3>
                                <Button variant="ghost" size="sm" onClick={handleGenerateStructure}>
                                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerar
                                </Button>
                            </div>

                            <Tabs defaultValue="summary" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="summary" className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Resumen
                                    </TabsTrigger>
                                    <TabsTrigger value="refinement" className="flex items-center gap-2">
                                        <Settings2 className="h-4 w-4" />
                                        Refinamiento
                                    </TabsTrigger>
                                </TabsList>

                                {/* Summary View - Document Style */}
                                <TabsContent value="summary" className="mt-6">
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        {/* Justification Section */}
                                        {proposedPlan.structureJustification && (
                                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 mb-6">
                                                <div className="flex items-center gap-2 text-primary mb-3">
                                                    <Sparkles className="h-5 w-5" />
                                                    <h4 className="font-semibold text-base m-0">Justificación de la Estructura</h4>
                                                </div>
                                                <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                                    {proposedPlan.structureJustification}
                                                </div>
                                            </div>
                                        )}

                                        {/* Series Overview */}
                                        <div className="border-b pb-4 mb-6">
                                            <h4 className="text-lg font-semibold text-foreground mb-1">
                                                {seriesObjective?.title}
                                            </h4>
                                            <p className="text-muted-foreground text-sm">
                                                {proposedPlan.sermons.length} sermones · Inicio: {startDate}
                                            </p>
                                        </div>

                                        {/* Sermons List - Document Style */}
                                        <div className="space-y-5">
                                            {proposedPlan.sermons.map((sermon, idx) => (
                                                <div key={idx} className="group">
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="font-semibold text-foreground m-0 text-base">
                                                                {sermon.title}
                                                            </h5>
                                                            {sermon.passage && (
                                                                <div className="mt-1">
                                                                    <BibleReference 
                                                                        reference={sermon.passage}
                                                                        onClick={setSelectedBibleRef}
                                                                    />
                                                                </div>
                                                            )}
                                                            {!sermon.passage && (
                                                                <span className="inline-flex items-center gap-1 text-sm text-amber-600 mt-1">
                                                                    ⚠️ Sin pasaje asignado
                                                                </span>
                                                            )}
                                                            <p className="text-muted-foreground text-sm mt-2 m-0 leading-relaxed">
                                                                {sermon.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {idx < proposedPlan.sermons.length - 1 && (
                                                        <div className="ml-4 border-l-2 border-dashed border-muted h-4 mt-2"></div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Fuentes Consultadas Section */}
                                        {proposedPlan.citations && proposedPlan.citations.length > 0 && (
                                            <div className="mt-8 pt-6 border-t">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Book className="h-5 w-5 text-primary" />
                                                    <h4 className="font-semibold text-base text-foreground m-0">Fuentes Consultadas</h4>
                                                </div>
                                                <div className="space-y-3">
                                                    {proposedPlan.citations.map((citation, idx) => (
                                                        <div 
                                                            key={citation.id || idx}
                                                            className={`flex items-start gap-3 p-3 rounded-lg ${
                                                                citation.sourceType === 'library' 
                                                                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                                                                    : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                                                            }`}
                                                        >
                                                            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                                                citation.sourceType === 'library'
                                                                    ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300'
                                                                    : 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300'
                                                            }`}>
                                                                {citation.sourceType === 'library' ? '📚' : '💡'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                                                        citation.sourceType === 'library'
                                                                            ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300'
                                                                            : 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300'
                                                                    }`}>
                                                                        {citation.sourceType === 'library' ? 'Biblioteca' : 'Conocimiento General'}
                                                                    </span>
                                                                </div>
                                                                {citation.sourceType === 'library' && (
                                                                    <p className="text-sm font-medium text-foreground mt-1 m-0">
                                                                        {citation.resourceAuthor} — <em>{citation.resourceTitle}</em>
                                                                        {citation.page && <span className="text-muted-foreground"> (p. {citation.page})</span>}
                                                                    </p>
                                                                )}
                                                                {citation.text && (
                                                                    <p className="text-sm text-muted-foreground mt-1 m-0">{citation.text}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-4 italic">
                                                    Las fuentes marcadas como "Biblioteca" provienen de tus recursos. Las de "Conocimiento General" son inferencias teológicas del AI.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bible Passage Viewer */}
                                    <BiblePassageViewer 
                                        reference={selectedBibleRef}
                                        onClose={() => setSelectedBibleRef(null)}
                                    />
                                </TabsContent>

                                {/* Refinement View - Editable Fields */}
                                <TabsContent value="refinement" className="mt-6">
                                    <div className="space-y-4">
                                        {proposedPlan.sermons.map((sermon, idx) => (
                                            <Card key={idx} className="border border-muted p-4 space-y-4">
                                                <div className="flex items-center justify-between border-b pb-2">
                                                    <span className="font-semibold text-muted-foreground">Sermón {idx + 1}</span>
                                                </div>
                                                
                                                <PlannerField 
                                                    title="Título"
                                                    content={sermon.title}
                                                    onSave={(val) => updateSermon(idx, 'title', val)}
                                                    onRefine={() => handleRefine(`Sermón ${idx + 1}: Título`, sermon.title)}
                                                    minHeight="min-h-[50px]"
                                                />

                                                <PlannerField 
                                                    title="Pasaje Bíblico"
                                                    content={sermon.passage || ''}
                                                    onSave={(val) => updateSermon(idx, 'passage', val)}
                                                    onRefine={() => handleRefine(`Sermón ${idx + 1}: Pasaje Bíblico`, sermon.passage || '')}
                                                    minHeight="min-h-[40px]"
                                                />

                                                <PlannerField 
                                                    title="Descripción"
                                                    content={sermon.description}
                                                    onSave={(val) => updateSermon(idx, 'description', val)}
                                                    onRefine={() => handleRefine(`Sermón ${idx + 1}: Descripción`, sermon.description)}
                                                />
                                            </Card>
                                        ))}
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setStep('objective')}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                                </Button>
                                <Button onClick={handleFinalize} size="lg" className="bg-primary text-primary-foreground">
                                    <Save className="mr-2 h-4 w-4" /> Finalizar y Guardar
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    return (
        <PlannerLayout 
            context={{
                type: strategy,
                topicOrBook,
                // For chat: use ALL indexed resources (full library access for research)
                // Selected resources only affect plan generation, not chat assistance
                resources: resources.filter(r => indexStatus[r.id] === true)
            }}
            isChatOpen={isChatOpen}
            onChatOpenChange={setIsChatOpen}
        >
            {wizardContent}
        </PlannerLayout>
    );
}
