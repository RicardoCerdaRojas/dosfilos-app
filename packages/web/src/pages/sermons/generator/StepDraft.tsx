import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizard } from './WizardContext';
import { WizardLayout } from './WizardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, FileText, Sparkles, Eye, Upload } from 'lucide-react';
import { sermonGeneratorService, sermonService, generatorChatService, libraryService } from '@dosfilos/application';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';
import { ContentCanvas } from '@/components/canvas-chat/ContentCanvas';
import { ChatInterface } from '@/components/canvas-chat/ChatInterface';
import { ResizableChatPanel } from '@/components/canvas-chat/ResizableChatPanel';
import { RAGSourcesDisplay } from '@/components/sermon/RAGSourcesDisplay';
import { useContentHistory } from '@/hooks/useContentHistory';
import { useGeneratorChat } from '@/hooks/useGeneratorChat';
import { useLibraryContext } from '@/context/library-context';
import { MarkdownRenderer } from '@/components/canvas-chat/MarkdownRenderer';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { SermonPreview } from '@/components/sermons/SermonPreview';
import { WorkflowPhase, CoachingStyle, LibraryResourceEntity } from '@dosfilos/domain';
import { PassageQuickView } from '@/components/sermons/PassageQuickView';

export function StepDraft() {
    const navigate = useNavigate();
    const { user } = useFirebase();
    const { homiletics, rules, setDraft, draft, setStep, exegesis, config, passage, selectedResourceIds, cacheName, setCacheName, sermonId, reset, saving } = useWizard();
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const {
        messages,
        setMessages,
        isLoading: isChatLoading,
        activeContext,
        refreshContext: handleRefreshContext,
        handleSendMessage: sendGeneralMessage,
        libraryResources,
        cacheName: activeCacheName
    } = useGeneratorChat({
        phase: 'sermon',
        content: draft,
        config,
        user,
        initialCacheName: cacheName,
        selectedResourceIds,
        onCacheUpdate: setCacheName
    });

    // 🎯 NEW: Use LibraryContext for sync/cache
    const { 
        ensureReady, 
        syncExpiredDocuments: syncDocuments, 
        isLoading: isSyncingDocuments 
    } = useLibraryContext();

    const [isAiProcessing, setIsAiProcessing] = useState(false);
    
    // 🎯 NEW: Restore missing state
    const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
    const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
    const [showPreview, setShowPreview] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<CoachingStyle | 'auto'>('auto');

    // Combine loading states
    const isTotalAiLoading = isAiProcessing || isChatLoading;


    // Initialize content history hook
    const contentHistory = useContentHistory('sermon', config?.id);

    // REMOVED: Manual Service Init & Library Loading (Handled by hook)

    // Version getters for history modal
    const getSectionVersions = (sectionId: string) => {
        return contentHistory.getVersions(sectionId);
    };

    const getCurrentVersionId = (sectionId: string) => {
        const currentVersion = contentHistory.getCurrentVersion(sectionId);
        return currentVersion?.id;
    };

    const handleGenerate = async () => {
        if (!homiletics) return;

        setLoading(true);
        try {
            // 🎯 Use LibraryContext for sync/cache
            console.log('🔍 handleGenerate (Draft) - Ensuring library context is ready');
            toast.loading('Preparando contexto de biblioteca...', { id: 'context-prep' });
            await ensureReady();
            toast.dismiss('context-prep');
            
            const baseConfig = config ? config[WorkflowPhase.DRAFTING] : undefined;
            
            // Merge session config with global config
            const draftConfig = baseConfig ? {
                ...baseConfig,
                libraryDocIds: selectedResourceIds.length > 0 
                    ? selectedResourceIds 
                    : baseConfig.documents?.map(d => d.id).filter(Boolean)
            } : undefined;

            // 🎯 PLAN C: Capture cacheName from service
            const { draft: result, cacheName: newCacheName } = 
                await sermonGeneratorService.generateSermonDraft(homiletics, rules, draftConfig, user?.uid);
            
            setDraft(result);
            
            // Save cacheName for future chat interactions
            if (newCacheName) {
                setCacheName(newCacheName);

            }
            
            toast.success('Borrador del sermón generado');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al generar borrador');
        } finally {
            setLoading(false);
        }
    };

    // 🎯 REFACTOR: Replaced manual refresh with hook's handleRefreshContext
    // Removed old handleRefreshContext implementation

    const getFullContent = () => {
        if (!draft) return '';
        return `
${draft.introduction}
<br/>
${draft.body.map(point => `## ${point.point}
<br/>
${point.content}
${point.illustration ? `
<br/>
> **Ilustración:** ${point.illustration}` : ''}`).join('\n<br/>\n')}
<br/>
## Conclusión
${draft.conclusion}
${draft.callToAction ? `
<br/>
> **Llamado a la Acción:** ${draft.callToAction}` : ''}
        `.trim();
    };

    // Save and exit - just navigate back without publishing
    const handleSaveAndExit = async () => {
        // Auto-save is already handling the save
        toast.success('Borrador guardado');
        navigate('/dashboard');
    };

    // Publish as copy - creates a published version without losing the draft
    const handlePublish = async () => {
        if (!draft || !user || !exegesis || !sermonId) {
            toast.error('No hay borrador para publicar');
            return;
        }

        setPublishing(true);
        try {
            // First update the draft with the final content
            const content = getFullContent();
            await sermonService.updateSermon(sermonId, {
                title: draft.title,
                content,
                bibleReferences: [exegesis.passage],
                tags: exegesis.keyWords.map(kw => kw.original),
            });

            // Then publish as copy
            const publishedSermon = await sermonService.publishSermonAsCopy(sermonId);

            toast.success('Sermón publicado exitosamente');
            reset(); // Clear wizard state
            navigate(`/dashboard/sermons/${publishedSermon.id}`);
        } catch (error: any) {
            console.error(error);
            toast.error('Error al publicar el sermón');
        } finally {
            setPublishing(false);
        }
    };

    const handleSendMessage = async (message: string, role: 'user' | 'assistant' = 'user') => {
        // 🎯 NEW: Only add to state manually if NOT using hook's sendGeneralMessage
        if (expandedSectionId || role === 'assistant') {
            const newMessage = {
                id: Date.now().toString(),
                role,
                content: message,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, newMessage]);
        }


        // Context Validation for ALL user messages
        if (role === 'user') {
            setIsAiProcessing(true);
            try {
                const { GeminiAIService } = await import('@dosfilos/infrastructure');
                const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
                const { getValueByPath } = await import('@/utils/path-utils');

                // Initialize AI Service
                const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
                if (!apiKey) {
                    throw new Error('API key not configured');
                }
                const aiService = new GeminiAIService(apiKey);

                // Get context if available
                let currentContextStr = "";
                if (expandedSectionId && draft) {
                    const sectionConfig = getSectionConfig('sermon', expandedSectionId);
                    if (sectionConfig) {
                        const currentContent = getValueByPath(draft, sectionConfig.path);
                        currentContextStr = typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent);
                    }
                }

                const validation = await aiService.validateContext(message, currentContextStr.substring(0, 500));

                if (!validation.isValid) {
                    const refusalMessage = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant' as const,
                        content: validation.refusalMessage || "Entiendo tu mensaje, pero mi enfoque está en ayudarte a redactar el sermón. ¿Podrías reformular tu solicitud?",
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, refusalMessage]);
                    setIsAiProcessing(false);
                    return; // Stop processing if invalid
                }
            } catch (error) {
                console.error('Error in context validation:', error);
                // Continue if validation fails
            }
        }

        // If it's a user message and we have an expanded section, refine that section
        if (role === 'user' && expandedSectionId && draft) {
            try {
                const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
                const { getValueByPath, setValueByPath } = await import('@/utils/path-utils');
                const { GeminiAIService } = await import('@dosfilos/infrastructure');

                // Initialize AI Service
                const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
                if (!apiKey) {
                    throw new Error('API key not configured');
                }
                const aiService = new GeminiAIService(apiKey);
                
                const sectionConfig = getSectionConfig('sermon', expandedSectionId);
                if (!sectionConfig) {
                    throw new Error('Section configuration not found');
                }
                
                // Get current section content
                let currentContent = getValueByPath(draft, sectionConfig.path);
                
                // If currentContent is a string that looks like JSON, try to parse it first
                if (typeof currentContent === 'string') {
                    const trimmed = currentContent.trim();
                    if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('```')) {
                        try {
                            let cleaned = trimmed;
                            cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
                            cleaned = cleaned.replace(/\s*```$/, '');
                            cleaned = cleaned.trim();
                            currentContent = JSON.parse(cleaned);
                        } catch (e) {
                            console.log('⚠️ Could not parse stored content, treating as string');
                        }
                    }
                }
                
                const contentString = typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent, null, 2);

                // Get markdown formatting instructions based on section type
                const getFormattingInstructions = (sectionId: string): string => {
                    switch (sectionId) {
                        case 'body':
                            return `
FORMATO: Devuelve un array JSON de objetos con esta estructura exacta:
[
  {
    "point": "Título del punto",
    "content": "Desarrollo del contenido...",
    "illustration": "Ilustración opcional..."
  }
]`;
                        default:
                            return `
FORMATO: Usa markdown para mejor legibilidad:
- **Negritas** para énfasis
- Párrafos separados para ideas distintas`;
                    }
                };
                
                // Search library for relevant context if resources are available
                let libraryContextStr = '';
                let refinementSources: Array<{author: string; title: string; page?: number; snippet: string}> = [];
                if (libraryResources.length > 0) {
                    try {
                        const { DocumentProcessingService } = await import('@dosfilos/infrastructure');
                        const docProcessor = new DocumentProcessingService(apiKey);
                        
                        const searchQuery = `${message} ${sectionConfig.label} ${passage || ''} teología comentario bíblico`;
                        const resourceIds = libraryResources.map(r => r.id);
                        
                        console.log(`📚 [Refinement] Searching ${resourceIds.length} library resources...`);
                        const searchResults = await docProcessor.searchRelevantChunks(
                            searchQuery,
                            resourceIds,
                            8 // Increased to 8 chunks for drafting
                        );
                        
                        if (searchResults.length > 0) {
                            const chunks = searchResults.map(r => r.chunk);
                            console.log(`✅ [Refinement] Found ${chunks.length} relevant chunks`);
                            
                            // Capture sources for message display
                            refinementSources = chunks.map(chunk => ({
                                author: chunk.resourceAuthor,
                                title: chunk.resourceTitle,
                                page: chunk.metadata.page,
                                snippet: chunk.text.substring(0, 150) + '...'
                            }));
                            
                            const chunksText = chunks.map((chunk, i) => {
                                const pageInfo = chunk.metadata.page ? `, p.${chunk.metadata.page}` : '';
                                return `[${i + 1}] "${chunk.resourceTitle}" (${chunk.resourceAuthor}${pageInfo}):\n"${chunk.text.substring(0, 500)}..."`;
                            }).join('\n\n');
                            
                            libraryContextStr = `

RECURSOS DE TU BIBLIOTECA (USO OBLIGATORIO SI ES RELEVANTE):
Usa esta información de tus recursos teológicos para enriquecer el contenido.

${chunksText}

INSTRUCCIONES DE CITACIÓN (CRÍTICO):
- Si utilizas ideas, frases o conceptos de estos recursos, DEBES citar la fuente explícitamente en el texto.
- Formato de cita preferido: (Autor, p.XX) o "Como dice Autor...".
- NO inventes citas. Solo usa las proporcionadas arriba.
`;
                        }
                    } catch (error) {
                        console.warn('⚠️ [Refinement] Could not search library:', error);
                    }
                }
                
                // Build sermon context for AI (draft step has full context)
                const homileticalApproach = homiletics?.homileticalApproach;
                const exegeticalProposition = exegesis?.exegeticalProposition;
                const homileticalProposition = homiletics?.homileticalProposition;
                
                let sermonContextStr = '';
                if (passage || homileticalApproach) {
                    sermonContextStr = `

CONTEXTO COMPLETO DEL SERMÓN (usa esta información para mantener coherencia):
- Pasaje: ${passage || 'No especificado'}
- Enfoque Homilético: ${homileticalApproach === 'expository' ? 'Expositivo' : 
                      homileticalApproach === 'thematic' ? 'Temático' :
                      homileticalApproach === 'narrative' ? 'Narrativo' :
                      homileticalApproach === 'topical' ? 'Tópico' : 'No especificado'}
- Proposición Exegética: ${exegeticalProposition || 'No especificada'}
- Proposición Homilética: ${homileticalProposition || 'No especificada'}
${rules?.targetAudience ? `- Audiencia: ${rules.targetAudience}` : ''}
${rules?.tone ? `- Tono: ${rules.tone}` : ''}

El contenido refinado DEBE mantener coherencia con el enfoque y las proposiciones del sermón.
`;
                }
                
                // Create instruction for AI
                const instruction = `Refina el contenido de la sección "${sectionConfig.label}" según esta instrucción: ${message}
${sermonContextStr}${libraryContextStr}
IMPORTANTE: 
- Devuelve SOLO el contenido refinado, sin explicaciones adicionales
- NO agregues prefijos como "Aquí está..." o "El contenido refinado es..."
${getFormattingInstructions(sectionConfig.id)}`;


                // Call AI service
                const aiResponse = await aiService.refineContent(contentString, instruction);
                
                // Parse the refined content based on the original type
                let parsedContent;
                if (Array.isArray(currentContent) || sectionConfig.type === 'array') {
                    try {
                        let cleanedResponse = aiResponse.trim();
                        cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
                        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
                        cleanedResponse = cleanedResponse.trim();
                        parsedContent = JSON.parse(cleanedResponse);
                        if (!Array.isArray(parsedContent)) throw new Error('Expected array');
                    } catch (parseError) {
                        console.error('Failed to parse array response:', parseError);
                        toast.error('Error al parsear la respuesta de la IA');
                        throw new Error('La IA no devolvió un array válido');
                    }
                } else if (typeof currentContent === 'object' || sectionConfig.type === 'object') {
                    try {
                        let cleanedResponse = aiResponse.trim();
                        cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
                        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
                        cleanedResponse = cleanedResponse.trim();
                        parsedContent = JSON.parse(cleanedResponse);
                    } catch (parseError) {
                        console.error('Failed to parse object response:', parseError);
                        parsedContent = aiResponse;
                    }
                } else {
                    parsedContent = aiResponse.trim();
                }
                
                // Save version BEFORE updating
                if (expandedSectionId) {
                    contentHistory.saveVersion(
                        expandedSectionId,
                        currentContent,
                        `Antes de: ${message.substring(0, 50)}...`,
                        undefined
                    );
                }
                
                // Update only this section
                const updatedDraft = JSON.parse(JSON.stringify(draft));
                setValueByPath(updatedDraft, sectionConfig.path, parsedContent);

                setDraft(updatedDraft);
                setModifiedSections(prev => new Set(prev).add(expandedSectionId));
                
                // Save version AFTER updating
                if (expandedSectionId) {
                    contentHistory.saveVersion(
                        expandedSectionId,
                        parsedContent,
                        message.substring(0, 100),
                        `✅ Sección "${sectionConfig.label}" refinada exitosamente.`
                    );
                }
                
                const aiMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant' as const,
                    content: refinementSources.length > 0 
                        ? `✅ Sección "${sectionConfig.label}" refinada usando ${refinementSources.length} fuente(s) de biblioteca.`
                        : `✅ Sección "${sectionConfig.label}" refinada exitosamente.`,
                    timestamp: new Date(),
                    sources: refinementSources.length > 0 ? refinementSources : undefined
                };
                setMessages(prev => [...prev, aiMessage]);
                toast.success('Sección refinada exitosamente');

            } catch (error: any) {
                console.error('Error refining section:', error);
                toast.error(error.message || 'Error al refinar la sección');
                
                const errorMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant' as const,
                    content: `Error: ${error.message || 'No se pudo procesar la solicitud'}`,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, errorMessage]);
            } finally {
                setIsAiProcessing(false);
            }
        } 
        // General Chat (No section expanded) - Use Hook
        else if (role === 'user' && !expandedSectionId) {
             await sendGeneralMessage(message, role);
        }
    };

    const handleApplyChange = (messageId: string, newContent: any) => {
        setDraft(newContent);
        setMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, appliedChange: true } : msg
            )
        );
    };

    const handleContentUpdate = (newContent: any) => {
        setDraft(newContent);
    };

    const handleSectionUpdate = async (sectionId: string, newContent: any) => {
        if (!draft) return;

        try {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath, getValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('sermon', sectionId);
            if (sectionConfig) {
                // Get current content for history
                const currentContent = getValueByPath(draft, sectionConfig.path);
                
                // Save version BEFORE updating
                contentHistory.saveVersion(
                    sectionId,
                    currentContent,
                    'Antes de edición manual',
                    undefined
                );

                // Update content
                const updatedDraft = JSON.parse(JSON.stringify(draft));
                setValueByPath(updatedDraft, sectionConfig.path, newContent);
                setDraft(updatedDraft);
                setModifiedSections(prev => new Set(prev).add(sectionId));

                // Save version AFTER updating
                contentHistory.saveVersion(
                    sectionId,
                    newContent,
                    'Edición manual',
                    'Cambios guardados manualmente'
                );

                toast.success('Sección actualizada');
            }
        } catch (error) {
            console.error('Error updating section:', error);
            toast.error('Error al actualizar la sección');
        }
    };

    // Undo/Redo handlers
    const handleUndo = async (sectionId: string) => {
        const previousVersion = contentHistory.undo(sectionId);
        if (previousVersion && draft) {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('sermon', sectionId);
            if (sectionConfig) {
                const updatedDraft = JSON.parse(JSON.stringify(draft));
                setValueByPath(updatedDraft, sectionConfig.path, previousVersion.content);
                setDraft(updatedDraft);
                toast.success('Cambio deshecho');
            }
        }
    };

    const handleRedo = async (sectionId: string) => {
        const nextVersion = contentHistory.redo(sectionId);
        if (nextVersion && draft) {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('sermon', sectionId);
            if (sectionConfig) {
                const updatedDraft = JSON.parse(JSON.stringify(draft));
                setValueByPath(updatedDraft, sectionConfig.path, nextVersion.content);
                setDraft(updatedDraft);
                toast.success('Cambio rehecho');
            }
        }
    };

    const handleRestoreVersion = async (sectionId: string, versionId: string) => {
        const version = contentHistory.goToVersion(sectionId, versionId);
        if (version && draft) {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('sermon', sectionId);
            if (sectionConfig) {
                const updatedDraft = JSON.parse(JSON.stringify(draft));
                setValueByPath(updatedDraft, sectionConfig.path, version.content);
                setDraft(updatedDraft);
                toast.success('Versión restaurada');
            }
        }
    };

    if (!homiletics) {
        return <div>Error: Falta el análisis homilético.</div>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium">Generando borrador del sermón...</p>
                    <p className="text-sm text-muted-foreground">Esto puede tomar unos momentos</p>
                </div>
            </div>
        );
    }

    // Left Panel Content
    const leftPanel = !draft ? (
        <div className="h-full flex flex-col">
            <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Borrador del Sermón</h2>
                </div>
                <p className="text-muted-foreground">
                    Genera el sermón completo listo para predicar.
                </p>
            </div>

            <Card className="p-6 space-y-4 bg-muted/50 mb-6">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Proposición Homilética
                </h3>
                <div className="text-lg font-medium italic">
                    <MarkdownRenderer content={homiletics.homileticalProposition} />
                </div>
                
                {/* Outline Preview */}
                {(() => {

                    return null;
                })()}
                {homiletics.outlinePreview && homiletics.outlinePreview.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                            Puntos del Sermón:
                        </h4>
                        <ul className="space-y-1.5 text-sm">
                            {homiletics.outlinePreview.map((point, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">▪</span>
                                    <span className="text-foreground/90">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </Card>

            <Card className="p-6 flex-1 flex flex-col justify-center">
                <div className="text-center space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Listo para generar tu sermón completo</h3>
                        <p className="text-sm text-muted-foreground">
                            Crearé un sermón completo con introducción, desarrollo de puntos,
                            ilustraciones, conclusión y llamado a la acción.
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={loading}
                        size="lg"
                        className="w-full max-w-md mx-auto"
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generar Borrador del Sermón
                    </Button>
                </div>
            </Card>
        </div>
    ) : (
        <div className="flex flex-col gap-4 overflow-hidden p-4" style={{ height: 'calc(100vh - 130px)' }}>
            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
                {/* Left: Content Canvas */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                    <div className="mb-4 flex-shrink-0 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">{draft.title}</h3>
                            <p className="text-sm text-muted-foreground">
                                {expandedSectionId 
                                    ? 'Refinando sección. Usa el chat para hacer cambios.'
                                    : 'Haz clic en "Refinar" para expandir una sección, o usa el chat para consultas generales.'
                                }
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <PassageQuickView passage={passage} variant="badge" />
                            <Button
                                onClick={handleGenerate}
                                variant="outline"
                                size="sm"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generando...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Regenerar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ContentCanvas
                            content={draft}
                            contentType="sermon"
                            expandedSectionId={expandedSectionId}
                            onSectionExpand={(sectionId) => {
                                setExpandedSectionId(sectionId);
                                setMessages([]); // Clear chat when expanding section
                            }}
                            onSectionClose={() => {
                                setExpandedSectionId(null);
                                setMessages([]); // Clear chat when closing section
                            }}
                            onSectionUndo={handleUndo}
                            onSectionRedo={handleRedo}
                            canUndo={(sectionId) => contentHistory.canUndo(sectionId)}
                            canRedo={(sectionId) => contentHistory.canRedo(sectionId)}
                            getSectionVersions={getSectionVersions}
                            getCurrentVersionId={getCurrentVersionId}
                            onRestoreVersion={handleRestoreVersion}
                            modifiedSections={modifiedSections}
                            onSectionUpdate={handleSectionUpdate}
                            onRegenerate={async (sectionId, itemIndex) => {
                                if (sectionId === 'body' && typeof itemIndex === 'number' && draft.body[itemIndex]) {
                                    const pointToRegenerate = draft.body[itemIndex];
                                    
                                    // Show loading state (could be improved with a toast or specific loading indicator)
                                    const toastId = toast.loading('Regenerando punto...');
                                    
                                    try {
                                        const result = await generatorChatService.regenerateSermonPoint(
                                            pointToRegenerate,
                                            {
                                                sermonTitle: draft.title,
                                                homileticalProposition: homiletics.homileticalProposition,
                                                tone: rules.tone,
                                                customInstructions: rules.customInstructions,
                                                libraryResources: libraryResources
                                            }
                                        );
                                        
                                        // Update the draft with the new point
                                        const newBody = [...draft.body];
                                        newBody[itemIndex] = result.point;
                                        await handleSectionUpdate('body', newBody);
                                        
                                        // Show sources if any were used
                                        if (result.sources && result.sources.length > 0) {
                                            toast.success(
                                                `Punto regenerado usando ${result.sources.length} fuente(s) de biblioteca`, 
                                                { id: toastId, duration: 4000 }
                                            );
                                        } else {
                                            toast.success('Punto regenerado exitosamente', { id: toastId });
                                        }
                                        
                                    } catch (error) {
                                        console.error('Failed to regenerate point:', error);
                                        toast.error('Error al regenerar el punto', { id: toastId });
                                    }
                                }
                            }}
                        />
                    </div>
                    
                    {/* RAG Sources - Temporarily hidden: AI-generated sources are not verified against real library */}
                    {/* TODO: Implement verified bibliography from RAG chunks when available */}
                    {/* {draft?.ragSources && draft.ragSources.length > 0 && (
                        <RAGSourcesDisplay sources={draft.ragSources} className="mx-0 mt-3" />
                    )} */}
                </div>

                {/* Right: Resizable Chat Interface */}
                <ResizableChatPanel storageKey="draftChatWidth">
                    <ChatInterface
                        messages={messages}
                        contentType="sermon"
                        content={draft}
                        selectedText=""
                        onSendMessage={handleSendMessage}
                        onApplyChange={handleApplyChange}
                        onContentUpdate={handleContentUpdate}
                        focusedSection={expandedSectionId}
                        disableDefaultAI={true}
                        externalIsLoading={isTotalAiLoading}
                        showStyleSelector={true}
                        selectedStyle={selectedStyle}
                        onStyleChange={(style) => {
                            setSelectedStyle(style);
                            generatorChatService.setCoachingStyle(style);
                        }}
                        activeContext={activeContext}
                        onRefreshContext={handleRefreshContext}
                        onSyncDocuments={syncDocuments}
                        isSyncingDocuments={isSyncingDocuments}
                    />
                </ResizableChatPanel>
            </div>

            {/* Navigation Buttons */}
            <div className="flex-shrink-0 flex gap-2">
                <Button onClick={() => setStep(2)} variant="outline" size="lg" className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Homilética
                </Button>
                
                <Button 
                    onClick={() => setShowPreview(true)} 
                    variant="outline" 
                    size="lg" 
                    className="flex-1"
                >
                    <Eye className="mr-2 h-4 w-4" />
                    Vista Previa
                </Button>
                
                <Button 
                    onClick={handleSaveAndExit} 
                    variant="secondary"
                    size="lg" 
                    className="flex-1"
                >
                    <Save className="mr-2 h-4 w-4" />
                    Guardar y Salir
                </Button>
                
                <Button 
                    onClick={handlePublish} 
                    disabled={publishing || !sermonId}
                    size="lg" 
                    className="flex-1"
                >
                    {publishing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Publicando...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            Publicar Sermón
                        </>
                    )}
                </Button>
            </div>
        </div>
    );

    // Right Panel Content - Only show when no draft
    const rightPanel = !draft ? (
        <Card className="p-6 h-full flex flex-col justify-center">
            <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold mb-2">El Borrador Final</h3>
                    <p className="text-sm text-muted-foreground">
                        Este es el último paso. Generaré un sermón completo y estructurado
                        basado en tu exégesis y análisis homilético.
                    </p>
                </div>
                <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">Después de generar podrás:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 text-left">
                        <li>• Ajustar el tono y estilo</li>
                        <li>• Mejorar ilustraciones</li>
                        <li>• Refinar la conclusión</li>
                        <li>• Guardar y exportar</li>
                    </ul>
                </div>
            </div>
        </Card>
    ) : null;

    return (
        <>
            {/* Saving Indicator */}
            {saving && (
                <div className="fixed top-4 right-4 flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-muted-foreground">Guardado</span>
                </div>
            )}
            
            {/* Render layout based on whether draft exists */}
            {draft ? (
                // When draft exists, render integrated layout directly
                leftPanel
            ) : (
                // When no draft, use WizardLayout with two panels
                <WizardLayout
                    leftPanel={leftPanel}
                    rightPanel={rightPanel}
                />
            )}

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="!max-w-[95vw] !w-full sm:!w-[1200px] lg:!w-[1600px] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <VisuallyHidden>
                        <DialogTitle>Vista Previa del Sermón</DialogTitle>
                    </VisuallyHidden>
                    <div className="flex-1 overflow-y-auto">
                        {draft && exegesis && (
                            <SermonPreview
                                title={draft.title}
                                content={getFullContent()}
                                authorName={user?.displayName || 'Pastor'}
                                date={new Date()}
                                bibleReferences={[exegesis.passage]}
                                tags={exegesis.keyWords.map(kw => kw.original)}
                                status="draft"
                            />
                        )}
                    </div>
                    <div className="p-4 border-t bg-background flex justify-end">
                        <Button onClick={() => setShowPreview(false)}>
                            Cerrar Vista Previa
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
