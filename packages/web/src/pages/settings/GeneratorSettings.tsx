import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ExpandableTextarea } from '@/components/ui/expandable-textarea';

// ... imports


import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { WorkflowPhase } from '@dosfilos/domain';
import { BookOpen, Mic, PenTool, Settings, Library, Layers, Cog, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useFirebase } from '@/context/firebase-context';
import { ConfigService } from '@dosfilos/application';
import { FirebaseConfigRepository, FirebaseStorageService } from '@dosfilos/infrastructure';

import { Loader2, Upload, X, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

import { useSearchParams } from 'react-router-dom';
import { LibrarySettings } from './LibrarySettings';
import { LibraryDocumentSelector } from '@/components/settings/LibraryDocumentSelector';

export function SettingsPage() {
    const { user } = useFirebase();
    const configRepository = new FirebaseConfigRepository();
    const configService = new ConfigService(configRepository);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const currentTab = searchParams.get('tab') || 'sermons';

    const handleTabChange = (value: string) => {
        setSearchParams({ tab: value });
    };

    const [config, setConfig] = useState({
        preferredBibleVersion: 'Reina Valera 1960',
        theologicalBias: 'Reformado, Bautista',
        hermeneuticalApproach: 'Gramático-Histórico',
        [WorkflowPhase.EXEGESIS]: {
            basePrompt: '',
            userPrompts: [] as string[],
            documents: [] as any[],
            libraryDocIds: [] as string[],
            temperature: 0.3
        },
        [WorkflowPhase.HOMILETICS]: {
            basePrompt: '',
            userPrompts: [] as string[],
            documents: [] as any[],
            libraryDocIds: [] as string[],
            temperature: 0.7
        },
        [WorkflowPhase.DRAFTING]: {
            basePrompt: '',
            userPrompts: [] as string[],
            documents: [] as any[],
            libraryDocIds: [] as string[],
            temperature: 0.7
        },
        // Series Planner config (NEW)
        seriesPlanner: {
            basePrompt: '',
            customInstructions: '',
            libraryDocIds: [] as string[],
            temperature: 0.7
        },
        // Advanced settings (NEW)
        advanced: {
            aiModel: 'gemini-2.5-flash',
            globalTemperature: 0.7
        }
    });

    useEffect(() => {
        if (user) {
            loadConfig();
        }
    }, [user]);

    const loadConfig = async () => {
        if (!user) return;
        try {
            setIsLoading(true);
            const userConfig = await configService.getUserConfig(user.uid);
            // Merge with default state to ensure all fields exist
            setConfig(prev => ({
                ...prev,
                ...userConfig,
                [WorkflowPhase.EXEGESIS]: {
                    ...prev[WorkflowPhase.EXEGESIS],
                    ...userConfig[WorkflowPhase.EXEGESIS],
                    basePrompt: userConfig[WorkflowPhase.EXEGESIS]?.basePrompt || '',
                    libraryDocIds: userConfig[WorkflowPhase.EXEGESIS]?.libraryDocIds || []
                },
                [WorkflowPhase.HOMILETICS]: {
                    ...prev[WorkflowPhase.HOMILETICS],
                    ...userConfig[WorkflowPhase.HOMILETICS],
                    basePrompt: userConfig[WorkflowPhase.HOMILETICS]?.basePrompt || '',
                    libraryDocIds: userConfig[WorkflowPhase.HOMILETICS]?.libraryDocIds || []
                },
                [WorkflowPhase.DRAFTING]: {
                    ...prev[WorkflowPhase.DRAFTING],
                    ...userConfig[WorkflowPhase.DRAFTING],
                    basePrompt: userConfig[WorkflowPhase.DRAFTING]?.basePrompt || '',
                    libraryDocIds: userConfig[WorkflowPhase.DRAFTING]?.libraryDocIds || []
                },
                seriesPlanner: {
                    ...prev.seriesPlanner,
                    ...(userConfig as any).seriesPlanner,
                    libraryDocIds: (userConfig as any).seriesPlanner?.libraryDocIds || []
                },
                advanced: {
                    ...prev.advanced,
                    ...(userConfig as any).advanced
                }
            }));
        } catch (error) {
            console.error('Error loading config:', error);
            toast.error('Error al cargar la configuración');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        try {
            setIsSaving(true);

            // Helper to clean documents array with strict type checking
            const cleanDocuments = (docs: any[]) => {
                if (!Array.isArray(docs)) return [];
                return docs.map(doc => {
                    if (!doc || typeof doc !== 'object') return null;
                    return {
                        id: String(doc.id || crypto.randomUUID()),
                        name: String(doc.name || 'Sin nombre'),
                        content: String(doc.content || '').substring(0, 1000), 
                        storagePath: doc.storagePath ? String(doc.storagePath) : undefined,
                        type: String(doc.type || 'text/plain')
                    };
                }).filter((doc): doc is NonNullable<typeof doc> => doc !== null);
            };

            // Helper to clean phase config
            const cleanPhase = (phaseConfig: any) => ({
                basePrompt: String(phaseConfig?.basePrompt || ''),
                userPrompts: Array.isArray(phaseConfig?.userPrompts) 
                    ? phaseConfig.userPrompts.filter((p: any) => p !== null && p !== undefined).map(String) 
                    : [],
                documents: cleanDocuments(phaseConfig?.documents),
                libraryDocIds: Array.isArray(phaseConfig?.libraryDocIds) 
                    ? phaseConfig.libraryDocIds.filter((id: any) => typeof id === 'string' && id.length > 0)
                    : [],
                temperature: Number(phaseConfig?.temperature) || 0.5
            });

            // Construct the clean object explicitly
            const configToSave = {
                id: String((config as any).id || crypto.randomUUID()),
                userId: user.uid,
                preferredBibleVersion: String(config.preferredBibleVersion || 'Reina Valera 1960'),
                theologicalBias: String(config.theologicalBias || ''),
                hermeneuticalApproach: String(config.hermeneuticalApproach || ''),
                [WorkflowPhase.EXEGESIS]: cleanPhase(config[WorkflowPhase.EXEGESIS]),
                [WorkflowPhase.HOMILETICS]: cleanPhase(config[WorkflowPhase.HOMILETICS]),
                [WorkflowPhase.DRAFTING]: cleanPhase(config[WorkflowPhase.DRAFTING]),
                seriesPlanner: {
                    basePrompt: String(config.seriesPlanner?.basePrompt || ''),
                    customInstructions: String(config.seriesPlanner?.customInstructions || ''),
                    libraryDocIds: Array.isArray(config.seriesPlanner?.libraryDocIds) 
                        ? config.seriesPlanner.libraryDocIds.filter((id: any) => typeof id === 'string' && id.length > 0)
                        : [],
                    temperature: Number(config.seriesPlanner?.temperature) || 0.7
                },
                advanced: {
                    aiModel: String(config.advanced?.aiModel || 'gemini-2.5-flash'),
                    globalTemperature: Number(config.advanced?.globalTemperature) || 0.7
                },
                updatedAt: new Date().toISOString()
            };

            const jsonString = JSON.stringify(configToSave);
            const sizeInBytes = new Blob([jsonString]).size;
            console.log(`Config size: ${(sizeInBytes / 1024).toFixed(2)} KB`);
            
            const finalConfig = JSON.parse(jsonString);
            
            await configService.saveConfig(finalConfig);
            toast.success('Configuración guardada correctamente');
        } catch (error) {
            console.error('Error saving config:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setIsSaving(false);
        }
    };

    const storageService = new FirebaseStorageService();

    const handleFileUpload = async (phase: Exclude<WorkflowPhase, WorkflowPhase.COMPLETED>, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true);
        try {
            const newDocs: any[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files.item(i);
                if (!file) continue;
                let content = '';
                
                if (file.type === 'application/pdf') {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';
                    
                    for (let j = 1; j <= pdf.numPages; j++) {
                        const page = await pdf.getPage(j);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map((item: any) => item.str).join(' ');
                        fullText += pageText + '\n';
                    }
                    content = fullText;
                } else {
                    content = await file.text();
                }

                const docId = crypto.randomUUID();
                const storagePath = `users/${user?.uid}/configs/${(config as any).id}/docs/${docId}.txt`;
                await storageService.uploadText(storagePath, content);

                newDocs.push({
                    id: docId,
                    name: file.name,
                    content: content.substring(0, 1000) + '...',
                    storagePath: storagePath,
                    type: file.type
                });
            }

            updatePhaseConfig(phase, 'documents', [...config[phase].documents, ...newDocs]);
            toast.success(`${newDocs.length} documento(s) agregado(s) correctamente`);
        } catch (error) {
            console.error('Error reading files:', error);
            toast.error('Error al leer los archivos');
        } finally {
            setIsLoading(false);
            e.target.value = '';
        }
    };

    const removeDocument = (phase: Exclude<WorkflowPhase, WorkflowPhase.COMPLETED>, docId: string) => {
        const newDocs = config[phase].documents.filter((d: any) => d.id !== docId);
        updatePhaseConfig(phase, 'documents', newDocs);
    };

    const updatePhaseConfig = (phase: Exclude<WorkflowPhase, WorkflowPhase.COMPLETED>, field: string, value: string | number | string[] | any[]) => {
        setConfig(prev => ({
            ...prev,
            [phase]: {
                ...prev[phase],
                [field]: value
            }
        }));
    };

    // Render phase settings as an accordion item
    const renderPhaseSettings = (phase: Exclude<WorkflowPhase, WorkflowPhase.COMPLETED>, label: string, icon: React.ReactNode, color: string) => (
        <AccordionItem value={phase} className={`border-${color}-200`}>
            <AccordionTrigger className={`hover:bg-${color}-50/50 px-4`}>
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{label}</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-4 space-y-6">
                {/* Library Documents Selector - NEW */}
                <LibraryDocumentSelector
                    phase={phase}
                    phaseName={label}
                    selectedDocIds={(config as any)[phase]?.libraryDocIds || []}
                    onChange={(docIds) => updatePhaseConfig(phase, 'libraryDocIds', docIds)}
                />

                {/* Legacy Documents - show if any exist */}
                {(config as any)[phase]?.documents?.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Documentos Legacy (migrar a Biblioteca)</Label>
                        <div className="space-y-2">
                            {(config as any)[phase].documents.map((doc: any) => (
                                <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm border border-dashed border-amber-300">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-amber-500" />
                                        <span className="truncate max-w-[200px]">{doc.name}</span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0 hover:text-red-500"
                                        onClick={() => removeDocument(phase, doc.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Base Prompt */}
                <div className="space-y-2">
                    <Label>Prompt Base (Persona del Experto)</Label>
                    <ExpandableTextarea 
                        className="min-h-[80px] font-mono text-sm"
                        placeholder="Define la personalidad y rol base de este experto..."
                        value={config[phase].basePrompt}
                        onChange={(e) => updatePhaseConfig(phase, 'basePrompt', e.target.value)}
                        label={`Prompt Base - ${label}`}
                    />
                </div>

                {/* User Prompts */}
                <div className="space-y-2">
                    <Label>Instrucciones Adicionales</Label>
                    <div className="space-y-2">
                        {config[phase].userPrompts.map((prompt: string, i: number) => (
                            <div key={i} className="flex gap-2">
                                <Input 
                                    value={prompt} 
                                    onChange={(e) => {
                                        const newPrompts = [...config[phase].userPrompts];
                                        newPrompts[i] = e.target.value;
                                        updatePhaseConfig(phase, 'userPrompts', newPrompts);
                                    }}
                                />
                                <Button variant="ghost" size="icon" onClick={() => {
                                    const newPrompts = config[phase].userPrompts.filter((_: any, idx: number) => idx !== i);
                                    updatePhaseConfig(phase, 'userPrompts', newPrompts);
                                }}><X className="h-4 w-4" /></Button>
                            </div>
                        ))}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                const newPrompts = [...config[phase].userPrompts, ''];
                                updatePhaseConfig(phase, 'userPrompts', newPrompts);
                            }}
                        >
                            + Agregar Instrucción
                        </Button>
                    </div>
                </div>

                {/* Temperature */}
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <Label>Creatividad (Temperatura)</Label>
                        <span className="text-sm text-muted-foreground">{config[phase].temperature}</span>
                    </div>
                    <Slider 
                        value={[config[phase].temperature]} 
                        max={1} step={0.1}
                        onValueChange={([val]) => updatePhaseConfig(phase, 'temperature', val ?? 0.5)}
                    />
                </div>
            </AccordionContent>
        </AccordionItem>
    );

    if (isLoading) {
        return (
            <div className="container mx-auto py-8 max-w-4xl flex justify-center items-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Settings className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuración de IA</h1>
                    <p className="text-muted-foreground">Personaliza tus asistentes de IA y preferencias.</p>
                </div>
            </div>

            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 h-14 p-1 bg-muted/50">
                    <TabsTrigger value="sermons" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 h-12 gap-2">
                        <Layers className="h-4 w-4" /> Sermones
                    </TabsTrigger>
                    <TabsTrigger value="series" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 h-12 gap-2">
                        <Calendar className="h-4 w-4" /> Series
                    </TabsTrigger>
                    <TabsTrigger value="library" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 h-12 gap-2">
                        <Library className="h-4 w-4" /> Biblioteca
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700 h-12 gap-2">
                        <Cog className="h-4 w-4" /> Avanzado
                    </TabsTrigger>
                </TabsList>

                {/* ==================== SERMONS TAB ==================== */}
                <TabsContent value="sermons" className="space-y-6">
                    {/* Global Sermon Preferences */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Preferencias Globales de Sermones</CardTitle>
                            <CardDescription>Configuración base para el asistente de generación de sermones.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Versión Bíblica Preferida</Label>
                                    <Input 
                                        value={config.preferredBibleVersion}
                                        onChange={(e) => setConfig({...config, preferredBibleVersion: e.target.value})}
                                        placeholder="Ej: Reina Valera 1960, NVI"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sesgo Teológico</Label>
                                    <Input 
                                        value={config.theologicalBias}
                                        onChange={(e) => setConfig({...config, theologicalBias: e.target.value})}
                                        placeholder="Ej: Reformado, Pentecostal"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Enfoque Hermenéutico</Label>
                                <Input 
                                    value={config.hermeneuticalApproach}
                                    onChange={(e) => setConfig({...config, hermeneuticalApproach: e.target.value})}
                                    placeholder="Ej: Gramático-Histórico, Cristocéntrico"
                                />
                                <p className="text-xs text-muted-foreground">El marco interpretativo general para todo el proceso.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Phase-specific settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración por Fase</CardTitle>
                            <CardDescription>Personaliza cada experto IA del flujo de generación.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {renderPhaseSettings(
                                    WorkflowPhase.EXEGESIS, 
                                    'Experto en Exégesis', 
                                    <BookOpen className="h-4 w-4 text-blue-600" />,
                                    'blue'
                                )}
                                {renderPhaseSettings(
                                    WorkflowPhase.HOMILETICS, 
                                    'Experto en Homilética', 
                                    <Mic className="h-4 w-4 text-purple-600" />,
                                    'purple'
                                )}
                                {renderPhaseSettings(
                                    WorkflowPhase.DRAFTING, 
                                    'Experto en Redacción', 
                                    <PenTool className="h-4 w-4 text-green-600" />,
                                    'green'
                                )}
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ==================== SERIES TAB ==================== */}
                <TabsContent value="series" className="space-y-6">
                    <Card className="border-purple-100">
                        <CardHeader className="bg-purple-50/50">
                            <CardTitle className="text-purple-900">Asistente de Series</CardTitle>
                            <CardDescription>Configura el asistente para planificación de series de sermones.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-2">
                                <Label>Prompt Base (Persona del Experto)</Label>
                                <ExpandableTextarea 
                                    className="min-h-[100px] font-mono text-sm"
                                    placeholder="Define la personalidad del experto planificador de series. Si lo dejas vacío, se usará el predeterminado."
                                    value={config.seriesPlanner.basePrompt}
                                    onChange={(e) => setConfig({
                                        ...config, 
                                        seriesPlanner: {...config.seriesPlanner, basePrompt: e.target.value}
                                    })}
                                    label="Prompt Base - Planificador de Series"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Instrucciones Personalizadas</Label>
                                <ExpandableTextarea 
                                    className="min-h-[80px] font-mono text-sm"
                                    placeholder="Ej: Siempre sugiere series de 4-6 sermones. Incluye aplicaciones prácticas..."
                                    value={config.seriesPlanner.customInstructions}
                                    onChange={(e) => setConfig({
                                        ...config, 
                                        seriesPlanner: {...config.seriesPlanner, customInstructions: e.target.value}
                                    })}
                                    label="Instrucciones Personalizadas - Planificador de Series"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Label>Creatividad (Temperatura)</Label>
                                    <span className="text-sm text-muted-foreground">{config.seriesPlanner.temperature}</span>
                                </div>
                                <Slider 
                                    value={[config.seriesPlanner.temperature]} 
                                    max={1} step={0.1}
                                    onValueChange={([val]) => setConfig({
                                        ...config, 
                                        seriesPlanner: {...config.seriesPlanner, temperature: val ?? 0.7}
                                    })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Mayor temperatura = más creatividad. Menor = más consistencia.
                                </p>
                            </div>
                            
                            {/* Library Documents Selector */}
                            <div className="pt-4 border-t">
                                <LibraryDocumentSelector
                                    phase={WorkflowPhase.PLANNING}
                                    phaseName="Planificador de Series"
                                    selectedDocIds={config.seriesPlanner.libraryDocIds}
                                    onChange={(ids: string[]) => setConfig({
                                        ...config,
                                        seriesPlanner: {...config.seriesPlanner, libraryDocIds: ids}
                                    })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ==================== LIBRARY TAB ==================== */}
                <TabsContent value="library">
                    <LibrarySettings />
                </TabsContent>

                {/* ==================== ADVANCED TAB ==================== */}
                <TabsContent value="advanced" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración Avanzada</CardTitle>
                            <CardDescription>Ajustes técnicos para usuarios avanzados.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Modelo de IA</Label>
                                <Select 
                                    value={config.advanced.aiModel}
                                    onValueChange={(value) => setConfig({
                                        ...config,
                                        advanced: {...config.advanced, aiModel: value}
                                    })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un modelo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado)</SelectItem>
                                        <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</SelectItem>
                                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Más lento)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    El modelo usado para todas las generaciones de IA.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Label>Temperatura Global (por defecto)</Label>
                                    <span className="text-sm text-muted-foreground">{config.advanced.globalTemperature}</span>
                                </div>
                                <Slider 
                                    value={[config.advanced.globalTemperature]} 
                                    max={1} step={0.1}
                                    onValueChange={([val]) => setConfig({
                                        ...config,
                                        advanced: {...config.advanced, globalTemperature: val ?? 0.7}
                                    })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Este valor se usa como predeterminado cuando no hay configuración específica de fase.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
                <Button variant="outline" disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleSave} className="min-w-[150px]" disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        'Guardar Cambios'
                    )}
                </Button>
            </div>
        </div>
    );
}

// Keep the old export for backwards compatibility
export { SettingsPage as GeneratorSettings };
