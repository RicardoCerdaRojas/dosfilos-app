import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '@/i18n';
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
import { useGeneratorChat } from '@/hooks/useGeneratorChat';
import { ApproachSelectionView } from './homiletics/ApproachSelectionView';
import { ApproachSelectionInfo } from './homiletics/ApproachSelectionInfo';
import { BibleReaderPanel } from '@/components/bible/BibleReaderPanel';
import { BookOpen, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    const { exegesis, rules, setHomiletics, setStep, homiletics, saving, config, selectHomileticalApproach } = useWizard();
    const { user } = useFirebase();
    const { t } = useTranslation('generator');
    
    // 🎯 NEW: Sub-step state management
    const [currentSubStep, setCurrentSubStep] = useState<HomileticsSubStep>(
        homiletics ? HomileticsSubStep.PROPOSITION_DEVELOPMENT : HomileticsSubStep.APPROACH_SELECTION
    );
    
    
    const [loading, setLoading] = useState(false);
    const [developingApproach, setDevelopingApproach] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<CoachingStyle | 'auto'>('auto');
    const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'bible'>('chat');
    
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
    } = useGeneratorChat({
        phase: 'homiletics',
        content: homiletics,
        config,
        user,
        initialCacheName: null,
        selectedResourceIds: []
    });


    
    // Initialize content history hook
    const contentHistory = useContentHistory('homiletics', config?.id);

    // 🎯 Restore missing state
    const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
    const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    
    // Combine loading states
    const isTotalAiLoading = isAiProcessing || isChatLoading;

    // 🎯 Auto-generation logic
    // We use a local ref to ensure we only trigger this once per mount when conditions are met
    const autoGenAttempted = useState(false); 
    const hasAttempted = autoGenAttempted[0];
    const setHasAttempted = autoGenAttempted[1];

    useEffect(() => {
        // triggers only if:
        // 1. We have exegesis (prerequisite)
        // 2. We don't have homiletics yet (need generation)
        // 3. We haven't already generated (loading check)
        // 4. We haven't already attempted in this session
        if (exegesis && !homiletics && !loading && !approachPreviews.length && !hasAttempted) {
            setHasAttempted(true);
            handleGenerate();
        }
    }, [exegesis, homiletics, hasAttempted]);


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
        
        // If we have a selected approach, add formatted display field
        if (selectedApproach) {
            return {
                ...homiletics,
                // 🎯 FIX: Use separate field for display, don't overwrite selectedApproachId
                approachDisplay: `**${selectedApproach.type}** - ${selectedApproach.direction}\n\n` +
                    `**Tono:**\n${selectedApproach.tone}\n\n` +
                    `**Propósito:**\n${selectedApproach.purpose}\n\n` +
                    `**Audiencia:**\n${selectedApproach.targetAudience}\n\n` +
                    `**Justificación:**\n${selectedApproach.rationale}`
            };
        }
        
        // Fallback to legacy field if no selected approach
        return {
            ...homiletics,
            approachDisplay: homiletics.homileticalApproach || 'No se ha seleccionado un enfoque'
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
            // 🎯 Use LibraryContext no longer needed (Global Context Only)
            // toast.loading(t('exegesis.loading.preparingContext'), { id: 'context-prep' });
            
            const baseConfig = config ? config[WorkflowPhase.HOMILETICS] : undefined;
            
            // Merge session config with global config
            const homileticsConfig = baseConfig ? {
                ...baseConfig,
                aiModel: config?.advanced?.aiModel, // Inject Global Model with optional chaining
                temperature: config?.[WorkflowPhase.HOMILETICS]?.temperature || config?.advanced?.globalTemperature // Fallback to global temp
            } : undefined;

            
            // 🎯 NEW: Use two-phase generation
            const { previews } = 
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
            
            toast.success(t('homiletics.success.previewsGenerated', { count: sortedPreviews.length || 0 }));

            // 🎯 Transition to approach selection sub-step
            if (sortedPreviews.length > 0) {
                setCurrentSubStep(HomileticsSubStep.APPROACH_SELECTION);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t('homiletics.errors.generatePreviews'));
        } finally {
            setLoading(false);
            // toast.dismiss('context-prep');
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
            toast.error(t('homiletics.errors.notFound'));
            return;
        }

        setDevelopingApproach(true);
        
        try {

            
            const baseConfig = config ? config[WorkflowPhase.HOMILETICS] : undefined;
            
            // Merge session config - REUSE cacheName from Phase 1 if available
            const homileticsConfig = baseConfig ? {
                ...baseConfig,
                aiModel: config?.advanced?.aiModel,
                temperature: config?.[WorkflowPhase.HOMILETICS]?.temperature || config?.advanced?.globalTemperature
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
            
            toast.success(t('homiletics.success.developed'));
        } catch (error: any) {
            console.error('❌ [Phase 2] Error developing approach:', error);
            toast.error(error.message || t('homiletics.errors.develop'));
            // Stay in selection view on error
        } finally {
            setDevelopingApproach(false);
        }
    };

    // 🎯 REFACTORED: Navigation is instant - context prep happens in handleGenerate only
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
                        content: validation.refusalMessage || t('homiletics.errors.refine'), // Using general error message or English fallback if not specific key
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
                // Initialize AI Service - NOT NEEDED, using sermonGeneratorService
                
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
                
                // Library usage for refinement is now handled by the global context
                const refinementSources: Array<{author: string; title: string; page?: number; snippet: string}> = [];
                
                // Build context for AI
                let contextStr = '';
                // Library context is now handled via Global File Search Store implicitly
                const libraryContextStr = ''; 
                
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
                // Call AI service
                // Use global service with proper phase context for Global Store access
                const aiResponse = await sermonGeneratorService.refineContent(contentString, instruction, { 
                    phase: 'homiletics',
                    aiModel: config?.advanced?.aiModel,
                    temperature: config?.[WorkflowPhase.HOMILETICS]?.temperature || config?.advanced?.globalTemperature
                });
                
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
                        ? `✅ ${t('homiletics.success.refined').replace('Sección', '')} "${sectionConfig.label}"`
                        : `✅ ${t('homiletics.success.refined').replace('Sección', '')} "${sectionConfig.label}"`,
                    timestamp: new Date(),
                    sources: refinementSources.length > 0 ? refinementSources : undefined
                };
                setMessages(prev => [...prev, aiMessage]);
                toast.success(t('homiletics.success.refined'));

            } catch (error: any) {
                console.error('Error refining section:', error);
                toast.error(error.message || t('homiletics.errors.refine'));
                
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
                toast.success(t('homiletics.success.undo'));
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
                toast.success(t('homiletics.success.redo'));
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
                toast.success(t('homiletics.success.restored'));
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
                // 🎯 FIX: Prevent editing readonly sections
                if (sectionConfig.readonly) {
                    toast.error('Esta sección es de solo lectura y no puede ser editada directamente');
                    return;
                }

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

                toast.success(t('homiletics.success.updated'));
            }
        } catch (error) {
            console.error('Error updating section:', error);
            toast.error(t('homiletics.errors.update'));
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
        return <div>{t('homiletics.errorNoExegesis')}</div>;
    }

    // Phase 1: Loading previews
    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="text-lg font-medium">{t('homiletics.phase1Loading')}</p>
                    <p className="text-sm text-muted-foreground">{t('homiletics.phase1Sub')}</p>
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
                    <p className="text-lg font-medium">{t('homiletics.phase2Loading')}</p>
                    <p className="text-sm text-muted-foreground">{t('homiletics.phase2Sub')}</p>
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
                        <span className="text-sm text-muted-foreground">{t('exegesis.saved')}</span>
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
                    <h2 className="text-2xl font-bold">{t('homiletics.title')}</h2>
                </div>
                <p className="text-muted-foreground">
                    {t('homiletics.subtitle2')}
                </p>
            </div>

            <Card className="p-6 space-y-4 bg-muted/50 mb-6">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    {t('homiletics.exegeticalBasis')}
                </h3>
                <p className="text-lg font-medium italic">"{exegesis.exegeticalProposition}"</p>
            </Card>

            <Card className="p-6 flex-1 flex flex-col justify-center">
                <div className="text-center space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mic2 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">{t('homiletics.readyToGenerate')}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t('homiletics.readyDesc')}
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={loading}
                        size="lg"
                        className="w-full max-w-md mx-auto"
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t('homiletics.generateBtn')}
                    </Button>
                </div>
            </Card>
        </div>
    ) : (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="mb-4 flex-shrink-0 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">{t('homiletics.proposalTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t('homiletics.proposalDesc')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2 bg-background border-primary/20 text-primary hover:text-primary hover:bg-primary/5"
                        onClick={() => setRightPanelMode(prev => prev === 'bible' ? 'chat' : 'bible')}
                    >
                        <BookOpen className="h-4 w-4" />
                        <span className="text-xs font-medium">{passage}</span>
                    </Button>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('homiletics.regeneratingBtn')}
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        {t('homiletics.regenerateShort')}
                                    </>
                                )}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('homiletics.regenerateConfirmTitle', '¿Regenerar Estudio Homilético?')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('homiletics.confirmRegenerateFull', 'Esta acción reiniciará todo el proceso homilético. Generated new approaches and you will lose the current selection and manual refinements.')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel', 'Cancelar')}</AlertDialogCancel>
                                <AlertDialogAction onClick={handleGenerate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {t('common.regenerate', 'Regenerar')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            <div className="flex-1 min-h-0">
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
                    {t('homiletics.continueToDrafting')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={() => setStep(1)} variant="outline" size="sm" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('homiletics.backToExegesis')}
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
                    <h3 className="font-semibold mb-2">{t('homiletics.whatIsTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t('homiletics.whatIsDesc')}
                    </p>
                </div>
                <div className="pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">{t('homiletics.afterGenerateTitle')}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 text-left">
                        {(t('homiletics.afterGenerateList', { returnObjects: true }) as string[]).map((item, i) => (
                            <li key={i}>• {item}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </Card>
    ) : (
        // When homiletics exists, show resizable chat panel
        <ResizableChatPanel storageKey="homileticsChatWidth">
            {rightPanelMode === 'bible' && exegesis ? (
                <BibleReaderPanel 
                    passage={exegesis.passage} 
                    onClose={() => setRightPanelMode('chat')} 
                />
            ) : (
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
            )}
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
                <div className="flex flex-col gap-4 overflow-hidden p-4" style={{ height: 'calc(100vh - 130px)' }}>
                    <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
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
