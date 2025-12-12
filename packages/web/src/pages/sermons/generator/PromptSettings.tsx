import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Settings2, ChevronDown, ChevronUp, Book, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useWizard } from './WizardContext';
import { useFirebase } from '@/context/firebase-context';
import { LibraryService } from '@dosfilos/application';
import { GeminiFileSearchService } from '@dosfilos/infrastructure';
import { LibraryResourceEntity, WorkflowPhase } from '@dosfilos/domain';
import { Badge } from '@/components/ui/badge';

interface PromptSettingsProps {
    phase?: WorkflowPhase;
}

export function PromptSettings({ phase }: PromptSettingsProps) {
    const { rules, setRules, cacheName, setCacheName, selectedResourceIds, setSelectedResourceIds, config } = useWizard();
    const { user } = useFirebase();
    const [isOpen, setIsOpen] = useState(false);
    
    // Library State
    const [libraryResources, setLibraryResources] = useState<LibraryResourceEntity[]>([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [creatingCache, setCreatingCache] = useState(false);
    const [cacheError, setCacheError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            const loadLibrary = async () => {
                setLoadingLibrary(true);
                try {
                    const service = new LibraryService();
                    const resources = await service.getUserResources(user.uid);
                    setLibraryResources(resources);
                    
                    // Initialize selection from global config if empty and config exists
                    if (selectedResourceIds.length === 0 && config && phase) {
                        const phaseConfig = config[phase];
                        if (phaseConfig) {
                            // Try to get libraryDocIds if available
                            const docIds = (phaseConfig as any).libraryDocIds as string[] | undefined;
                            
                            if (docIds && docIds.length > 0) {
                                // Filter out ghost IDs that don't exist in library
                                const validDocIds = docIds.filter(id => resources.some(r => r.id === id));
                                console.log(`Initializing session selection with ${validDocIds.length} global defaults for ${phase}`);
                                setSelectedResourceIds(validDocIds);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error loading library:', error);
                } finally {
                    setLoadingLibrary(false);
                }
            };
            loadLibrary();
        }
    }, [user, config, phase]);

    const handleCreateCache = async () => {
        if (selectedResourceIds.length === 0) return;

        setCreatingCache(true);
        setCacheError(null);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) throw new Error("API Key missing");

            const geminiService = new GeminiFileSearchService(apiKey);
            
            // Get file URIs from selected resources
            const selectedResources = libraryResources.filter(r => selectedResourceIds.includes(r.id));
            
            // For PoC: We assume resources have metadata.geminiUri
            // In a real scenario, we might need to upload them if missing.
            const validUris = selectedResources
                .map(r => r.metadata?.geminiUri)
                .filter((uri): uri is string => !!uri);

            if (validUris.length === 0) {
                throw new Error("Ninguno de los recursos seleccionados tiene un URI de Gemini válido. Sube los archivos primero.");
            }

            const name = await geminiService.createCache(validUris);
            setCacheName(name);
        } catch (error: any) {
            console.error('Error creating cache:', error);
            setCacheError(error.message);
        } finally {
            setCreatingCache(false);
        }
    };

    const toggleResource = (id: string) => {
        if (selectedResourceIds.includes(id)) {
            setSelectedResourceIds(selectedResourceIds.filter(r => r !== id));
            // Invalidate cache if selection changes
            if (cacheName) setCacheName(null);
        } else {
            setSelectedResourceIds([...selectedResourceIds, id]);
            if (cacheName) setCacheName(null);
        }
    };

    const handleChange = (key: keyof typeof rules, value: string) => {
        setRules({ ...rules, [key]: value });
    };

    const summary = [
        rules.preferredBibleVersion,
        rules.theologicalBias,
        rules.tone === 'inspirational' ? 'Inspirador' : rules.tone,
        rules.targetAudience === 'general' ? 'General' : rules.targetAudience,
        selectedResourceIds.length > 0 ? `${selectedResourceIds.length} libros` : null
    ].filter(Boolean).join(' • ');

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="border rounded-lg bg-card"
        >
            <div className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-primary" />
                        Configuración de esta Sesión
                    </h3>
                    {!isOpen && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                            {summary || 'Configuración predeterminada'}
                        </p>
                    )}
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="px-4 pb-4 space-y-6">
                <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                    Estos ajustes iniciales provienen de tu configuración global. 
                    Cualquier cambio aquí aplicará <strong>solo para este sermón</strong>.
                </p>

                {/* Library Selection Section */}
                <div className="space-y-3 border-b pb-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-medium flex items-center gap-2">
                            <Book className="h-4 w-4" />
                            Recursos de Biblioteca (Contexto)
                        </Label>
                        {cacheName && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Cache Activo
                            </Badge>
                        )}
                    </div>
                    
                    {loadingLibrary ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Cargando biblioteca...
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2">
                            {libraryResources.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No tienes libros en tu biblioteca.</p>
                            ) : (
                                libraryResources.map(resource => (
                                    <div 
                                        key={resource.id} 
                                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                            selectedResourceIds.includes(resource.id) 
                                                ? 'bg-primary/10 border-primary' 
                                                : 'hover:bg-secondary'
                                        }`}
                                        onClick={() => toggleResource(resource.id)}
                                    >
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                            selectedResourceIds.includes(resource.id) ? 'bg-primary border-primary' : 'border-muted-foreground'
                                        }`}>
                                            {selectedResourceIds.includes(resource.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{resource.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{resource.author}</p>
                                        </div>
                                        {resource.metadata?.geminiUri && (
                                            <Badge variant="outline" className="text-[10px]">Ready</Badge>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {selectedResourceIds.length > 0 && !cacheName && (
                        <div className="pt-2">
                            <Button 
                                onClick={handleCreateCache} 
                                disabled={creatingCache}
                                size="sm" 
                                className="w-full"
                            >
                                {creatingCache ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creando Contexto (Cache)...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Optimizar Contexto ({selectedResourceIds.length} libros)
                                    </>
                                )}
                            </Button>
                            {cacheError && (
                                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {cacheError}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Versión Bíblica Preferida</Label>
                        <Input
                            value={rules.preferredBibleVersion || ''}
                            onChange={(e) => handleChange('preferredBibleVersion', e.target.value)}
                            placeholder="Ej: Reina Valera 1960, NVI"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Sesgo Teológico (Opcional)</Label>
                        <Input
                            value={rules.theologicalBias || ''}
                            onChange={(e) => handleChange('theologicalBias', e.target.value)}
                            placeholder="Ej: Reformado, Pentecostal, Bautista"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Tono</Label>
                        <Select
                            value={rules.tone}
                            onValueChange={(val) => handleChange('tone', val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="inspirational">Inspirador</SelectItem>
                                <SelectItem value="educational">Educativo</SelectItem>
                                <SelectItem value="casual">Cercano</SelectItem>
                                <SelectItem value="formal">Formal</SelectItem>
                                <SelectItem value="evangelistic">Evangelístico</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Audiencia</Label>
                        <Select
                            value={rules.targetAudience}
                            onValueChange={(val) => handleChange('targetAudience', val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="youth">Jóvenes</SelectItem>
                                <SelectItem value="children">Niños</SelectItem>
                                <SelectItem value="adults">Adultos</SelectItem>
                                <SelectItem value="seniors">Adultos Mayores</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Instrucciones Personalizadas (Prompt Adicional)</Label>
                    <Textarea
                        value={rules.customInstructions || ''}
                        onChange={(e) => handleChange('customInstructions', e.target.value)}
                        placeholder="Instrucciones específicas para la IA..."
                        className="h-20"
                    />
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
