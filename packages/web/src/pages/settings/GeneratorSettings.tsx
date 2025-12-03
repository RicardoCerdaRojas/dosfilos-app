import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { WorkflowPhase } from '@dosfilos/domain';
import { BookOpen, Mic, PenTool, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useFirebase } from '@/context/firebase-context';
import { ConfigService } from '@dosfilos/application';
import { FirebaseConfigRepository, FirebaseStorageService } from '@dosfilos/infrastructure';
import { useEffect } from 'react';

import { Loader2, Upload, X, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

import { useSearchParams } from 'react-router-dom';

export function GeneratorSettings() {
    const { user } = useFirebase();
    const configRepository = new FirebaseConfigRepository();
    const configService = new ConfigService(configRepository);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const currentTab = searchParams.get('tab') || 'general';

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
            temperature: 0.3
        },
        [WorkflowPhase.HOMILETICS]: {
            basePrompt: '',
            userPrompts: [] as string[],
            documents: [] as any[],
            temperature: 0.7
        },
        [WorkflowPhase.DRAFTING]: {
            basePrompt: '',
            userPrompts: [] as string[],
            documents: [] as any[],
            temperature: 0.7
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
                    basePrompt: userConfig[WorkflowPhase.EXEGESIS]?.basePrompt || ''
                },
                [WorkflowPhase.HOMILETICS]: {
                    ...prev[WorkflowPhase.HOMILETICS],
                    ...userConfig[WorkflowPhase.HOMILETICS],
                    basePrompt: userConfig[WorkflowPhase.HOMILETICS]?.basePrompt || ''
                },
                [WorkflowPhase.DRAFTING]: {
                    ...prev[WorkflowPhase.DRAFTING],
                    ...userConfig[WorkflowPhase.DRAFTING],
                    basePrompt: userConfig[WorkflowPhase.DRAFTING]?.basePrompt || ''
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
                        // Truncate content to avoid 1MB Firestore limit (approx 1000 chars for preview)
                        // If storagePath exists, we rely on that for full content
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
                updatedAt: new Date().toISOString()
            };

            // Calculate estimated size (just for logging, should be small now)
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
                    // Text or Markdown
                    content = await file.text();
                }

                // Upload full content to Storage
                const docId = crypto.randomUUID();
                const storagePath = `users/${user?.uid}/configs/${(config as any).id}/docs/${docId}.txt`;
                await storageService.uploadText(storagePath, content);

                newDocs.push({
                    id: docId,
                    name: file.name,
                    content: content.substring(0, 1000) + '...', // Store only preview in Firestore
                    storagePath: storagePath, // Store reference to full content
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
            // Reset input
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
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Settings className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configuración del Generador</h1>
                    <p className="text-muted-foreground">Personaliza a tus "Expertos IA" para cada fase del proceso.</p>
                </div>
            </div>

            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 h-14 p-1 bg-muted/50">
                    <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-12">General</TabsTrigger>
                    <TabsTrigger value="exegesis" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 h-12 gap-2">
                        <BookOpen className="h-4 w-4" /> Exégesis
                    </TabsTrigger>
                    <TabsTrigger value="homiletics" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 h-12 gap-2">
                        <Mic className="h-4 w-4" /> Homilética
                    </TabsTrigger>
                    <TabsTrigger value="drafting" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 h-12 gap-2">
                        <PenTool className="h-4 w-4" /> Redacción
                    </TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Preferencias Globales</CardTitle>
                            <CardDescription>Configuración base para todos los expertos.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Versión Bíblica Preferida</Label>
                                <Input 
                                    value={config.preferredBibleVersion}
                                    onChange={(e) => setConfig({...config, preferredBibleVersion: e.target.value})}
                                    placeholder="Ej: Reina Valera 1960, NVI, LBLA"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Sesgo Teológico / Denominacional</Label>
                                <Input 
                                    value={config.theologicalBias}
                                    onChange={(e) => setConfig({...config, theologicalBias: e.target.value})}
                                    placeholder="Ej: Reformado, Pentecostal, Luterano..."
                                />
                                <p className="text-xs text-muted-foreground">Esto ayudará a la IA a interpretar pasajes según tu tradición.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Enfoque Hermenéutico</Label>
                                <Input 
                                    value={config.hermeneuticalApproach}
                                    onChange={(e) => setConfig({...config, hermeneuticalApproach: e.target.value})}
                                    placeholder="Ej: Gramático-Histórico, Cristocéntrico, Redentor..."
                                />
                                <p className="text-xs text-muted-foreground">El marco interpretativo general para todo el proceso.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Exegesis Settings */}
                <TabsContent value="exegesis">
                    <Card className="border-blue-100">
                        <CardHeader className="bg-blue-50/50">
                            <CardTitle className="text-blue-900">Experto en Exégesis</CardTitle>
                            <CardDescription>Configura cómo la IA debe analizar el texto original.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-2">
                                <Label>Base de Conocimiento (Documentos)</Label>
                                <div 
                                    className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => document.getElementById(`file-upload-${WorkflowPhase.EXEGESIS}`)?.click()}
                                >
                                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">Arrastra archivos aquí o haz clic para subir</p>
                                    <p className="text-xs text-muted-foreground mt-1">(Soporta .txt, .md, .pdf)</p>
                                    <input 
                                        type="file" 
                                        id={`file-upload-${WorkflowPhase.EXEGESIS}`}
                                        className="hidden" 
                                        accept=".txt,.md,.pdf"
                                        multiple
                                        onChange={(e) => handleFileUpload(WorkflowPhase.EXEGESIS, e)}
                                    />
                                </div>
                                <div className="space-y-2 mt-4">
                                    {config[WorkflowPhase.EXEGESIS].documents.map((doc: any) => (
                                        <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-blue-500" />
                                                <span className="truncate max-w-[200px]">{doc.name}</span>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-6 w-6 p-0 hover:text-red-500"
                                                onClick={() => removeDocument(WorkflowPhase.EXEGESIS, doc.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Prompt Base (Persona del Experto)</Label>
                                <Textarea 
                                    className="min-h-[100px] font-mono text-sm"
                                    placeholder="Define la personalidad y rol base de este experto. Si lo dejas vacío, se usará el predeterminado del sistema."
                                    value={config[WorkflowPhase.EXEGESIS].basePrompt}
                                    onChange={(e) => updatePhaseConfig(WorkflowPhase.EXEGESIS, 'basePrompt', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Prompts e Instrucciones Adicionales</Label>
                                <div className="space-y-2">
                                    {config[WorkflowPhase.EXEGESIS].userPrompts.map((prompt: string, i: number) => (
                                        <div key={i} className="flex gap-2">
                                            <Input 
                                                value={prompt} 
                                                onChange={(e) => {
                                                    const newPrompts = [...config[WorkflowPhase.EXEGESIS].userPrompts];
                                                    newPrompts[i] = e.target.value;
                                                    updatePhaseConfig(WorkflowPhase.EXEGESIS, 'userPrompts', newPrompts);
                                                }}
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                const newPrompts = config[WorkflowPhase.EXEGESIS].userPrompts.filter((_, idx) => idx !== i);
                                                updatePhaseConfig(WorkflowPhase.EXEGESIS, 'userPrompts', newPrompts);
                                            }}>X</Button>
                                        </div>
                                    ))}
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => {
                                            const newPrompts = [...config[WorkflowPhase.EXEGESIS].userPrompts, ''];
                                            updatePhaseConfig(WorkflowPhase.EXEGESIS, 'userPrompts', newPrompts);
                                        }}
                                    >
                                        + Agregar Instrucción
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label>Creatividad (Temperatura)</Label>
                                    <span className="text-sm text-muted-foreground">{config[WorkflowPhase.EXEGESIS].temperature}</span>
                                </div>
                                <Slider 
                                    value={[config[WorkflowPhase.EXEGESIS].temperature]} 
                                    max={1} step={0.1}
                                    onValueChange={([val]) => updatePhaseConfig(WorkflowPhase.EXEGESIS, 'temperature', val ?? 0.3)}
                                />
                                <p className="text-xs text-muted-foreground">Baja temperatura (0.1-0.3) es mejor para análisis riguroso y factual.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Homiletics Settings */}
                <TabsContent value="homiletics">
                    <Card className="border-purple-100">
                        <CardHeader className="bg-purple-50/50">
                            <CardTitle className="text-purple-900">Experto en Homilética</CardTitle>
                            <CardDescription>Configura el estilo de predicación y estructura.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-2">
                                <Label>Base de Conocimiento (Documentos)</Label>
                                <div 
                                    className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => document.getElementById(`file-upload-${WorkflowPhase.HOMILETICS}`)?.click()}
                                >
                                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">Arrastra archivos aquí o haz clic para subir</p>
                                    <input 
                                        type="file" 
                                        id={`file-upload-${WorkflowPhase.HOMILETICS}`}
                                        className="hidden" 
                                        accept=".txt,.md,.pdf"
                                        multiple
                                        onChange={(e) => handleFileUpload(WorkflowPhase.HOMILETICS, e)}
                                    />
                                </div>
                                <div className="space-y-2 mt-4">
                                    {config[WorkflowPhase.HOMILETICS].documents.map((doc: any) => (
                                        <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-purple-500" />
                                                <span className="truncate max-w-[200px]">{doc.name}</span>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-6 w-6 p-0 hover:text-red-500"
                                                onClick={() => removeDocument(WorkflowPhase.HOMILETICS, doc.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Prompt Base (Persona del Experto)</Label>
                                <Textarea 
                                    className="min-h-[100px] font-mono text-sm"
                                    placeholder="Define la personalidad y rol base de este experto. Si lo dejas vacío, se usará el predeterminado del sistema."
                                    value={config[WorkflowPhase.HOMILETICS].basePrompt}
                                    onChange={(e) => updatePhaseConfig(WorkflowPhase.HOMILETICS, 'basePrompt', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Prompts e Instrucciones Adicionales</Label>
                                <div className="space-y-2">
                                    {config[WorkflowPhase.HOMILETICS].userPrompts.map((prompt: string, i: number) => (
                                        <div key={i} className="flex gap-2">
                                            <Input 
                                                value={prompt} 
                                                onChange={(e) => {
                                                    const newPrompts = [...config[WorkflowPhase.HOMILETICS].userPrompts];
                                                    newPrompts[i] = e.target.value;
                                                    updatePhaseConfig(WorkflowPhase.HOMILETICS, 'userPrompts', newPrompts);
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => {
                                            const newPrompts = [...config[WorkflowPhase.HOMILETICS].userPrompts, ''];
                                            updatePhaseConfig(WorkflowPhase.HOMILETICS, 'userPrompts', newPrompts);
                                        }}
                                    >
                                        + Agregar Instrucción
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label>Creatividad (Temperatura)</Label>
                                    <span className="text-sm text-muted-foreground">{config[WorkflowPhase.HOMILETICS].temperature}</span>
                                </div>
                                <Slider 
                                    value={[config[WorkflowPhase.HOMILETICS].temperature]} 
                                    max={1} step={0.1}
                                    onValueChange={([val]) => updatePhaseConfig(WorkflowPhase.HOMILETICS, 'temperature', val ?? 0.7)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Drafting Settings */}
                <TabsContent value="drafting">
                    <Card className="border-green-100">
                        <CardHeader className="bg-green-50/50">
                            <CardTitle className="text-green-900">Experto en Redacción</CardTitle>
                            <CardDescription>Configura el tono y estilo de escritura final.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-2">
                                <Label>Base de Conocimiento (Documentos)</Label>
                                <div 
                                    className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => document.getElementById(`file-upload-${WorkflowPhase.DRAFTING}`)?.click()}
                                >
                                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">Arrastra archivos aquí o haz clic para subir</p>
                                    <input 
                                        type="file" 
                                        id={`file-upload-${WorkflowPhase.DRAFTING}`}
                                        className="hidden" 
                                        accept=".txt,.md,.pdf"
                                        multiple
                                        onChange={(e) => handleFileUpload(WorkflowPhase.DRAFTING, e)}
                                    />
                                </div>
                                <div className="space-y-2 mt-4">
                                    {config[WorkflowPhase.DRAFTING].documents.map((doc: any) => (
                                        <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-green-500" />
                                                <span className="truncate max-w-[200px]">{doc.name}</span>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-6 w-6 p-0 hover:text-red-500"
                                                onClick={() => removeDocument(WorkflowPhase.DRAFTING, doc.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Prompt Base (Persona del Experto)</Label>
                                <Textarea 
                                    className="min-h-[100px] font-mono text-sm"
                                    placeholder="Define la personalidad y rol base de este experto. Si lo dejas vacío, se usará el predeterminado del sistema."
                                    value={config[WorkflowPhase.DRAFTING].basePrompt}
                                    onChange={(e) => updatePhaseConfig(WorkflowPhase.DRAFTING, 'basePrompt', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Prompts e Instrucciones Adicionales</Label>
                                <div className="space-y-2">
                                    {config[WorkflowPhase.DRAFTING].userPrompts.map((prompt: string, i: number) => (
                                        <div key={i} className="flex gap-2">
                                            <Input 
                                                value={prompt} 
                                                onChange={(e) => {
                                                    const newPrompts = [...config[WorkflowPhase.DRAFTING].userPrompts];
                                                    newPrompts[i] = e.target.value;
                                                    updatePhaseConfig(WorkflowPhase.DRAFTING, 'userPrompts', newPrompts);
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => {
                                            const newPrompts = [...config[WorkflowPhase.DRAFTING].userPrompts, ''];
                                            updatePhaseConfig(WorkflowPhase.DRAFTING, 'userPrompts', newPrompts);
                                        }}
                                    >
                                        + Agregar Instrucción
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label>Creatividad (Temperatura)</Label>
                                    <span className="text-sm text-muted-foreground">{config[WorkflowPhase.DRAFTING].temperature}</span>
                                </div>
                                <Slider 
                                    value={[config[WorkflowPhase.DRAFTING].temperature]} 
                                    max={1} step={0.1}
                                    onValueChange={([val]) => updatePhaseConfig(WorkflowPhase.DRAFTING, 'temperature', val ?? 0.7)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

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
