import { useState, useMemo, useEffect } from 'react';
import { useWizard } from './WizardContext';
import { WizardLayout } from './WizardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowRight, ArrowLeft, Mic2, Sparkles } from 'lucide-react';
import { sermonGeneratorService, generatorChatService } from '@dosfilos/application';
import { toast } from 'sonner';
import { ContentCanvas } from '@/components/canvas-chat/ContentCanvas';
import { ChatInterface } from '@/components/canvas-chat/ChatInterface';
import { ResizableChatPanel } from '@/components/canvas-chat/ResizableChatPanel';
import { useFirebase } from '@/context/firebase-context';
import { WorkflowPhase, HomileticalAnalysis, CoachingStyle } from '@dosfilos/domain';
import { useContentHistory } from '@/hooks/useContentHistory';
import { useGeneratorChat } from '@/hooks/useGeneratorChat'; // 🎯 NEW
// 🎯 NEW: Sub-step components
import { ApproachSelectionView } from './homiletics/ApproachSelectionView';
import { ApproachSelectionInfo } from './homiletics/ApproachSelectionInfo';

/**
 * Sub-steps within Homiletics phase
 * @pattern State Machine - Clear transitions between sub-steps
 */
enum HomileticsSubStep {
    /** Step 2a: User selects from 4-5 approach previews */
    APPROACH_SELECTION = 'selection',
    /** Step 2b: Shows developed proposition + outline */
    PROPOSITION_DEVELOPMENT = 'development'
}

export function StepHomiletics() {
    const { exegesis, rules, setHomiletics, setStep, homiletics, saving, config, selectedResourceIds, cacheName, setCacheName, selectHomileticalApproach } = useWizard();
    const { user } = useFirebase();
    
    // 🎯 NEW: Sub-step state management
    const [currentSubStep, setCurrentSubStep] = useState<HomileticsSubStep>(
        homiletics ? HomileticsSubStep.PROPOSITION_DEVELOPMENT : HomileticsSubStep.APPROACH_SELECTION
    );
    
    
    const [loading, setLoading] = useState(false);
    const [developingApproach, setDevelopingApproach] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<CoachingStyle | 'auto'>('auto');
    
    // 🎯 Approach previews (Phase 1)
    const [approachPreviews, setApproachPreviews] = useState<any[]>([]);
    const [tempSelectedApproachId, setTempSelectedApproachId] = useState<string | undefined>(undefined);

    

    // 🎯 NEW: Use Unified Chat Hook
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
        phase: 'homiletics',
        content: homiletics,
        config,
        user,
        initialCacheName: cacheName,
        selectedResourceIds,
        onCacheUpdate: setCacheName // Sync back to WizardContext
    });


    
    // Initialize content history hook
    const contentHistory = useContentHistory('homiletics', config?.id);

    // 🎯 Restore missing state
    const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
    const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    
    // Combine loading states
    const isTotalAiLoading = isAiProcessing || isChatLoading;


    // 🎯 NEW: Extract passage from homiletics
    const passage = useMemo(() => {
        return exegesis?.passage || homiletics?.exegeticalStudy?.passage || '';
    }, [exegesis, homiletics]);


    // 🎯 Compute formatted homiletics content at top level to avoid hook violations
    const formattedHomiletics = useMemo(() => {
        if (!homiletics) return homiletics;
        
        // Find the selected approach
        const selectedApproach = homiletics.homileticalApproaches?.find(
            a => a.id === homiletics.selectedApproachId
        );
        
        // If we have a selected approach, format it nicely
        if (selectedApproach) {
            return {
                ...homiletics,
                selectedApproachId: `**${selectedApproach.type}** - ${selectedApproach.direction}\n\n` +
                    `**Tono:**\n${selectedApproach.tone}\n\n` +
                    `**Propósito:**\n${selectedApproach.purpose}\n\n` +
                    `**Audiencia:**\n${selectedApproach.targetAudience}\n\n` +
                    `**Justificación:**\n${selectedApproach.rationale}`
            };
        }
        
        // Fallback to legacy field if no selected approach
        return {
            ...homiletics,
            selectedApproachId: homiletics.homileticalApproach || 'No se ha seleccionado un enfoque'
        };
    }, [homiletics]);

    /**
     * 🎯 PHASE 1: Generate approach previews (FAST - 3-5 seconds)
     * Shows 4-5 lightweight options for user to choose from
     */
    const handleGenerate = async () => {
        if (!exegesis) return;

        setLoading(true);
        setApproachPreviews([]);
        
        try {
            const baseConfig = config ? config[WorkflowPhase.HOMILETICS] : undefined;
            
            // Merge session config with global config
            const homileticsConfig = baseConfig ? {
                ...baseConfig,
                libraryDocIds: selectedResourceIds.length > 0 
                    ? selectedResourceIds 
                    : baseConfig.documents?.map(d => d.id).filter(Boolean)
            } : undefined;


            
            // 🎯 NEW: Use two-phase generation
            const { previews, cacheName: newCacheName, cachedResources } = 
                await sermonGeneratorService.generateHomileticsPreview(exegesis, rules, homileticsConfig, user?.uid);
            
            // 🎯 Sort previews: Expository approaches first (user's primary approach)
            const sortedPreviews = (previews || []).sort((a: any, b: any) => {
                const isAExpository = a.type?.toLowerCase().includes('expositiv');
                const isBExpository = b.type?.toLowerCase().includes('expositiv');
                
                if (isAExpository && !isBExpository) return -1;
                if (!isAExpository && isBExpository) return 1;
                return 0;
            });
            

            
            // Save previews
            setApproachPreviews(sortedPreviews);
            
            // Save cacheName AND metadata for future chat interactions
            if (newCacheName) {
                setCacheName(newCacheName);
                
                // 🎯 NEW: Save cache metadata with resources
                // This logic is now handled by useGeneratorChat's onCacheUpdate, but we need to ensure the wizard context's cacheName is updated.
                // The hook will also update its internal activeContext.
                // We can remove the direct setCacheMetadata call here.
                // setCacheMetadata({
                //     createdAt: new Date(),
                //     documentIds: effectiveDocIds,
                //     resourceCount: effectiveDocIds.length,
                //     resources: cachedResources || [] // 🎯 NEW: Store hydrated resources
                // });
                

            }
            
            toast.success(`${sortedPreviews.length || 0} enfoques generados. Selecciona el mejor para tu contexto.`);

            // 🎯 Transition to approach selection sub-step
            if (sortedPreviews.length > 0) {
                setCurrentSubStep(HomileticsSubStep.APPROACH_SELECTION);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al generar vistas previas de enfoques');
        } finally {
            setLoading(false);
        }
    };

    /**
     * 🎯 PHASE 2: Develop selected approach (DETAILED - 5-8 seconds)
     * Takes the chosen preview and generates complete proposition + outline
     * Then transitions to proposition development sub-step
     */
    const handleconfirmApproach = async () => {
        if (!tempSelectedApproachId || !exegesis) return;

        // Find the selected preview
        const selectedPreview = approachPreviews.find(p => p.id === tempSelectedApproachId);
        if (!selectedPreview) {
            toast.error('No se encontró el enfoque seleccionado');
            return;
        }

        setDevelopingApproach(true);
        
        try {

            
            const baseConfig = config ? config[WorkflowPhase.HOMILETICS] : undefined;
            
            // Merge session config - REUSE cacheName from Phase 1 if available
            const homileticsConfig = baseConfig ? {
                ...baseConfig,
                libraryDocIds: selectedResourceIds.length > 0 
                    ? selectedResourceIds 
                    : baseConfig.documents?.map(d => d.id).filter(Boolean),
                cacheName: activeCacheName || undefined // Reuse cache from Phase 1 (convert null to undefined)
            } : undefined;

            // 🎯 Call Phase 2: Develop the selected approach
            const { approach } = await sermonGeneratorService.developSelectedApproach(
                exegesis,
                selectedPreview,
                rules,
                homileticsConfig,
                user?.uid
            );

            // Create homiletical analysis with the fully developed approach
            const homileticsAnalysis: HomileticalAnalysis = {
                exegeticalStudy: exegesis,
                homileticalApproaches: [approach], // Only the developed approach
                selectedApproachId: approach.id,
                // Legacy fields populated from developed approach
                homileticalApproach: approach.type as any,
                contemporaryApplication: approach.contemporaryApplication,
                homileticalProposition: approach.homileticalProposition,
                outlinePreview: approach.outlinePreview, // 🎯 NEW: Include outline preview
                outline: approach.outline
            };

            setHomiletics(homileticsAnalysis);
            selectHomileticalApproach(approach.id);
            
            // 🎯 Transition to proposition development sub-step
            setCurrentSubStep(HomileticsSubStep.PROPOSITION_DEVELOPMENT);
            
            toast.success('Enfoque completamente desarrollado. ¡Revisa y refina!');
        } catch (error: any) {
            console.error('❌ [Phase 2] Error developing approach:', error);
            toast.error(error.message || 'Error al desarrollar el enfoque seleccionado');
            // Stay in selection view on error
        } finally {
            setDevelopingApproach(false);
        }
    };

    // 🎯 Handle continuing to next step
    const handleContinue = () => {
        setStep(3);
    };

    // 🎯 OPTIMIZED: Smart cache refresh with validation
    // This function is now provided by useGeneratorChat hook as `refreshContext`
    // const handleRefreshContext = async (force: boolean = false) => {
    //     try {
    //         const effectiveResourceIds = selectedResourceIds.length > 0
    //             ? selectedResourceIds
    //             : (config?.[WorkflowPhase.HOMILETICS]?.libraryDocIds?.length
    //                 ? config[WorkflowPhase.HOMILETICS].libraryDocIds
    //                 : (config?.[WorkflowPhase.HOMILETICS]?.documents?.map((d: any) => d.id) || []));

    //         // 🎯 STEP 1: Check if cache exists and is still valid
    //         if (cacheName && cacheMetadata && !force) {
    //             const now = new Date();
    //             const cacheAge = now.getTime() - cacheMetadata.createdAt.getTime();
    //             const cacheAgeMinutes = Math.floor(cacheAge / 60000);
    //             const remainingMinutes = 60 - cacheAgeMinutes;

    //             // Cache is still valid (< 60 minutes)
    //             if (remainingMinutes > 0) {
    //                 // Check if documents changed
    //                 const documentIds = effectiveResourceIds.sort().join(',');
    //                 const cachedDocumentIds = cacheMetadata.documentIds.sort().join(',');
                    
    //                 if (documentIds === cachedDocumentIds) {
    //                     // Cache is valid and documents haven't changed
    //                     toast.info(
    //                         `El caché actual es válido por ${remainingMinutes} minutos más. ` +
    //                         `Usa el mismo para ahorrar tokens.`,
    //                         { duration: 4000 }
    //                     );
    //                     console.log(`✅ Cache still valid. Remaining: ${remainingMinutes} minutes`);
    //                     return;
    //                 } else {
    //                     // Documents changed - notify user
    //                     console.log('📝 Documents changed. Need to regenerate cache.');
    //                     toast.info('Los documentos cambiaron. Regenerando caché...');
    //                 }
    //             } else {
    //                 console.log('⏰ Cache expired. Regenerating...');
    //                 toast.info('El caché expiró. Regenerando...');
    //             }
    //         }

    //         // 🎯 STEP 2: Proceed with cache regeneration
    //         toast.loading('Regenerando contexto (Cache)...');
            
    //         const refreshConfig = {
    //             ...config?.[WorkflowPhase.HOMILETICS],
    //             libraryDocIds: effectiveResourceIds
    //         };

    //         const result = await sermonGeneratorService.refreshContext(refreshConfig as any);
            
    //         if (result.cacheName) {
    //             setCacheName(result.cacheName);
                
    //             // 🎯 NEW: Save cache metadata
    //             setCacheMetadata({
    //                 createdAt: new Date(),
    //                 documentIds: effectiveResourceIds,
    //                 resourceCount: result.cachedResources?.length || 0,
    //                 resources: result.cachedResources || [] // 🎯 NEW: Store hydrated resources
    //             });
                
    //             setMessages([]); // Clear chat history
    //             const cachedCount = result.cachedResources?.length || 0;
    //             toast.dismiss();
    //             toast.success(`✅ Contexto regenerado con ${cachedCount} recurso(s). Válido por 60 minutos.`);
    //             console.log(`✅ Cache created: ${result.cacheName} (${cachedCount} resources)`);
    //         } else if (result.geminiUris && result.geminiUris.length > 0) {
    //             // 🎯 NEW: Fallback Success (Direct File Mode)
    //             setCacheName(null); // Clear cache name since we are using files directly
                
    //             // Save metadata so UI shows active resources
    //             setCacheMetadata({
    //                 createdAt: new Date(),
    //                 documentIds: effectiveResourceIds,
    //                 resourceCount: result.cachedResources?.length || 0,
    //                 resources: result.cachedResources || []
    //             });
                
    //             toast.dismiss();
    //             toast.success(`✅ Contexto cargado (Modo Directo). Usando ${result.cachedResources?.length} archivo(s) activos.`);
    //             console.log(`✅ Context loaded via Direct File URIs (Fallback Mode)`);
    //         } else {
    //             toast.dismiss();
    //             toast.info(`⚠️ Archivos expirados en Gemini. Usando búsqueda estándar (RAG).`, {
    //                 description: 'Re-sube los documentos a la biblioteca para reactivar el caché rápido.',
    //                 duration: 5000
    //             });
    //             setCacheMetadata(null);
    //         }
    //     } catch (error: any) {
    //         console.error('Error refreshing context:', error);
    //         toast.dismiss();
    //         toast.error('Error al regenerar contexto');
    //     }
    // };

    const handleSendMessage = async (message: string, role: 'user' | 'assistant' = 'user') => {
        // Only add to state manually if we are modifying a section (Refinement)
        // For general chat, the hook handles the state update
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
                if (expandedSectionId && formattedHomiletics) {
                    const sectionConfig = getSectionConfig('homiletics', expandedSectionId);
                    if (sectionConfig) {
                        const currentContent = getValueByPath(formattedHomiletics, sectionConfig.path);
                        currentContextStr = typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent);
                    }
                }

                const validation = await aiService.validateContext(message, currentContextStr.substring(0, 500));

                if (!validation.isValid) {
                    const refusalMessage = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant' as const,
                        content: validation.refusalMessage || "Entiendo tu mensaje, pero mi enfoque está en ayudarte con el análisis homilético. ¿Podrías reformular tu solicitud?",
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, refusalMessage]);
                    setIsAiProcessing(false);
                    return;
                }
            } catch (error) {
                console.error('Error in context validation:', error);
                // Continue if validation fails
            }
        }

        // If it's a user message and we have an expanded section, refine that section
        if (role === 'user' && expandedSectionId && formattedHomiletics) {
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
                
                const sectionConfig = getSectionConfig('homiletics', expandedSectionId);
                if (!sectionConfig) {
                    throw new Error('Section configuration not found');
                }
                
                // Get current section content
                let currentContent = getValueByPath(formattedHomiletics, sectionConfig.path);
                
                const contentString = typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent, null, 2);

                // Get markdown formatting instructions based on section type
                const getFormattingInstructions = (sectionId: string): string => {
                    switch (sectionId) {
                        case 'outline':
                            return `
FORMATO: Devuelve un objeto JSON con esta estructura exacta:
{
  "mainPoints": [
    {
      "title": "Título del punto",
      "description": "Descripción...",
      "scriptureReferences": ["Ref1", "Ref2"]
    }
  ]
}`;
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
                        
                        const searchQuery = `${message} ${sectionConfig.label} ${passage || ''} homilética sermón`;
                        const resourceIds = libraryResources.map(r => r.id);
                        
                        console.log(`📚 [Refinement] Searching ${resourceIds.length} library resources...`);
                        const searchResults = await docProcessor.searchRelevantChunks(
                            searchQuery,
                            resourceIds,
                            8
                        );
                        
                        if (searchResults.length > 0) {
                            const chunks = searchResults.map(r => r.chunk);
                            console.log(`✅ [Refinement] Found ${chunks.length} relevant chunks`);
                            
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
                
                // Build context for AI
                let contextStr = '';
                if (passage || exegesis) {
                    contextStr = `

CONTEXTO DEL ANÁLISIS HOMILÉTICO:
- Pasaje: ${passage || exegesis?.passage || 'No especificado'}
${exegesis?.exegeticalProposition ? `- Proposición Exegética: ${exegesis.exegeticalProposition}` : ''}
${rules?.targetAudience ? `- Audiencia: ${rules.targetAudience}` : ''}
${rules?.tone ? `- Tono: ${rules.tone}` : ''}

El contenido refinado DEBE mantener coherencia con el análisis exegético y las preferencias del pastor.
`;
                }
                
                // Create instruction for AI
                const instruction = `Refina el contenido de la sección "${sectionConfig.label}" según esta instrucción: ${message}
${contextStr}${libraryContextStr}
IMPORTANTE: 
- Devuelve SOLO el contenido refinado, sin explicaciones adicionales
- NO agregues prefijos como "Aquí está..." o "El contenido refinado es..."
${getFormattingInstructions(sectionConfig.id)}`;

                // Call AI service
                const aiResponse = await aiService.refineContent(contentString, instruction);
                
                // Parse the refined content based on the original type
                let parsedContent;
                if (sectionConfig.type === 'object') {
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
                
                // Update only this section
                const updatedHomiletics = JSON.parse(JSON.stringify(formattedHomiletics));
                setValueByPath(updatedHomiletics, sectionConfig.path, parsedContent);

                setHomiletics(updatedHomiletics);
                setModifiedSections(prev => new Set(prev).add(expandedSectionId));
                
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

    
    // Version-Related Handlers
    const getSectionVersions = (sectionId: string) => {
        return contentHistory.getVersions(sectionId);
    };

    const getCurrentVersionId = (sectionId: string) => {
        const currentVersion = contentHistory.getCurrentVersion(sectionId);
        return currentVersion?.id;
    };

    const handleUndo = async (sectionId: string) => {
        const previousVersion = contentHistory.undo(sectionId);
        if (previousVersion && homiletics) {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('homiletics', sectionId);
            if (sectionConfig) {
                const updatedHomiletics = JSON.parse(JSON.stringify(homiletics));
                setValueByPath(updatedHomiletics, sectionConfig.path, previousVersion.content);
                setHomiletics(updatedHomiletics);
                toast.success('Cambio deshecho');
            }
        }
    };

    const handleRedo = async (sectionId: string) => {
        const nextVersion = contentHistory.redo(sectionId);
        if (nextVersion && homiletics) {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('homiletics', sectionId);
            if (sectionConfig) {
                const updatedHomiletics = JSON.parse(JSON.stringify(homiletics));
                setValueByPath(updatedHomiletics, sectionConfig.path, nextVersion.content);
                setHomiletics(updatedHomiletics);
                toast.success('Cambio rehecho');
            }
        }
    };

    const handleRestoreVersion = async (sectionId: string, versionId: string) => {
        const version = contentHistory.goToVersion(sectionId, versionId);
        if (version && homiletics) {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('homiletics', sectionId);
            if (sectionConfig) {
                const updatedHomiletics = JSON.parse(JSON.stringify(homiletics));
                setValueByPath(updatedHomiletics, sectionConfig.path, version.content);
                setHomiletics(updatedHomiletics);
                toast.success('Versión restaurada');
            }
        }
    };

    const handleSectionUpdate = async (sectionId: string, newContent: any) => {
        if (!homiletics) return;

        try {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath, getValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('homiletics', sectionId);
            if (sectionConfig) {
                const currentContent = getValueByPath(homiletics, sectionConfig.path);
                
                contentHistory.saveVersion(
                    sectionId,
                    currentContent,
                    'Antes de edición manual',
                    undefined
                );

                const updatedHomiletics = JSON.parse(JSON.stringify(homiletics));
                setValueByPath(updatedHomiletics, sectionConfig.path, newContent);
                setHomiletics(updatedHomiletics);
                setModifiedSections(prev => new Set(prev).add(sectionId));

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

    const handleApplyChange = (messageId: string, newContent: any) => {
        setHomiletics(newContent);
        setMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, appliedChange: true } : msg
            )
        );
    };

    if (!exegesis) {
        return <div>Error: Falta el estudio exegético.</div>;
    }

    // Phase 1: Loading previews
    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium">Generando enfoques homiléticos...</p>
                    <p className="text-sm text-muted-foreground">📋 Fase 1: Creando 4-5 opciones</p>
                </div>
            </div>
        );
    }

    // Phase 2: Developing selected approach
    if (developingApproach) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium">Desarrollando enfoque seleccionado...</p>
                    <p className="text-sm text-muted-foreground">🎨 Fase 2: Generando proposición y bosquejo detallado</p>
                </div>
            </div>
        );
    }

    // ========== RENDER LOGIC BASED ON SUB-STEP ==========

    /**
     * 🎯 SUB-STEP 2a: APPROACH SELECTION
     * Shows 4-5 approach previews for user to choose from
     */
    if (currentSubStep === HomileticsSubStep.APPROACH_SELECTION) {
        const leftPanel = (
            <ApproachSelectionView
                previews={approachPreviews}
                selectedId={tempSelectedApproachId}
                onSelect={setTempSelectedApproachId}
                onConfirm={handleconfirmApproach}
                onRegenerate={handleGenerate}
                developing={developingApproach}
                regenerating={loading}
            />
        );

        const rightPanel = <ApproachSelectionInfo />;

        return (
            <>
                {saving && (
                    <div className="fixed top-4 right-4 flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm text-muted-foreground">Guardado</span>
                    </div>
                )}
                
                <WizardLayout
                    leftPanel={leftPanel}
                    rightPanel={rightPanel}
                />
            </>
        );
    }

    /**
     * 🎯 SUB-STEP 2b: PROPOSITION DEVELOPMENT
     * Shows developed proposition + outline with chat for refinement
     */
    // Left Panel Content
    const leftPanel = !homiletics ? (
        <div className="h-full flex flex-col">
            <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                    <Mic2 className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">Análisis Homilético</h2>
                </div>
                <p className="text-muted-foreground">
                    Construye el puente hacia la aplicación contemporánea.
                </p>
            </div>

            <Card className="p-6 space-y-4 bg-muted/50 mb-6">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Base Exegética
                </h3>
                <p className="text-lg font-medium italic">"{exegesis.exegeticalProposition}"</p>
            </Card>

            <Card className="p-6 flex-1 flex flex-col justify-center">
                <div className="text-center space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mic2 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Listo para generar tu propuesta homilética</h3>
                        <p className="text-sm text-muted-foreground">
                            Basándome en tu análisis exegético, crearé 4-5 enfoques homiléticos 
                            diferentes para que elijas el más apropiado.
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={loading}
                        size="lg"
                        className="w-full max-w-md mx-auto"
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generar Enfoques Homiléticos
                    </Button>
                </div>
            </Card>
        </div>
    ) : (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="mb-4 flex-shrink-0 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Propuesta Homilética</h3>
                    <p className="text-sm text-muted-foreground">
                        Revisa y refina el contenido usando el chat
                    </p>
                </div>
                {/* 🎯 Regenerate Button */}
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
            <div className="flex-1 min-h-0 overflow-y-auto">
                <ContentCanvas
                    content={formattedHomiletics}
                    contentType="homiletics"
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
                    onSectionUpdate={handleSectionUpdate}
                    modifiedSections={modifiedSections}
                />
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex-shrink-0 pt-4 border-t space-y-2">
                <Button onClick={handleContinue} size="lg" className="w-full">
                    Continuar al Borrador
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={() => setStep(1)} variant="outline" size="sm" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Exégesis
                </Button>
            </div>
        </div>
    );

    // Right Panel Content
    const rightPanel = !homiletics ? (
        <Card className="p-6 h-full flex flex-col justify-center">
            <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mic2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold mb-2">¿Qué es la Homilética?</h3>
                    <p className="text-sm text-muted-foreground">
                        La homilética es el arte de construir el puente entre el texto bíblico
                        y la audiencia contemporánea, transformando la verdad eterna en aplicación práctica.
                    </p>
                </div>
                <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">Después de generar podrás:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 text-left">
                        <li>• Elegir entre 4-5 enfoques diferentes</li>
                        <li>• Refinar proposición homilética</li>
                        <li>• Mejorar el bosquejo del sermón</li>
                        <li>• Agregar ilustraciones relevantes</li>
                    </ul>
                </div>
            </div>
        </Card>
    ) : (
        // When homiletics exists, show resizable chat panel
        <ResizableChatPanel storageKey="homileticsChatWidth">
            <ChatInterface
                messages={messages}
                contentType="homiletics"
                content={homiletics}
                selectedText=""
                onSendMessage={handleSendMessage}
                onApplyChange={handleApplyChange}
                onContentUpdate={setHomiletics}
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
            />
        </ResizableChatPanel>
    );
    
    return (
        <>
            {/* Saving Indicator */}
            {saving && (
                <div className="fixed top-4 right-4 flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg animate-in fade-in-from-top-2 duration-200 z-50">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-muted-foreground">Guardado</span>
                </div>
            )}
            
            {!homiletics ? (
                // Phase 1 or 2 (no homiletics yet): Use WizardLayout
                <WizardLayout
                    leftPanel={leftPanel}
                    rightPanel={rightPanel}
                />
            ) : (
                // Phase 3 (homiletics exists): Custom flex layout like Exegesis
                <div className="h-full flex flex-col gap-4 overflow-hidden p-4">
                    <div className="flex-1 min-h-0 flex gap-4">
                        {/* Left: Content */}
                        {leftPanel}
                        
                        {/* Right: Resizable Chat */}
                        {rightPanel}
                    </div>
                </div>
            )}
        </>
    );
}
