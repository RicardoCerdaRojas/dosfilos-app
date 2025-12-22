import { useState, useEffect } from 'react';
import { useWizard } from './WizardContext';
import { useTranslation } from '@/i18n';
import { useFirebase } from '@/context/firebase-context';
import { useGeneratorChat } from '@/hooks/useGeneratorChat';
import { WizardLayout } from './WizardLayout';
import { GenerationProgress } from '@/components/sermons/GenerationProgress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, BookOpen, Sparkles, GraduationCap } from 'lucide-react';
import { sermonGeneratorService } from '@dosfilos/application';
import { toast } from 'sonner';
import { WorkflowPhase, CoachingStyle } from '@dosfilos/domain';
import { generatorChatService } from '@dosfilos/application';
import { ContentCanvas } from '@/components/canvas-chat/ContentCanvas';
import { ChatInterface } from '@/components/canvas-chat/ChatInterface';
import { ResizableChatPanel } from '@/components/canvas-chat/ResizableChatPanel';
import { BiblePassageSelector } from '@/components/sermons/BiblePassageSelector';
import { BibleReaderPanel } from '@/components/bible/BibleReaderPanel';
import { useContentHistory } from '@/hooks/useContentHistory';
import { GreekTutorOverlay } from './exegesis/greek-tutor/GreekTutorOverlay';
import { GreekTutorProvider } from './exegesis/greek-tutor/GreekTutorProvider';

export function StepExegesis() {
    return (
        <GreekTutorProvider>
            <StepExegesisContent />
        </GreekTutorProvider>
    );
}

function StepExegesisContent() {
    const { t } = useTranslation('generator');
    const { passage, setPassage, rules, setExegesis, setStep, exegesis, config, saving } = useWizard();
    const { user } = useFirebase();
    const contentHistory = useContentHistory('exegesis', config?.id);

    // Unified Chat Hook
    const {
        messages,
        setMessages, // Needed for local state updates (refinement)
        isLoading: isChatLoading,
        activeContext,
        refreshContext: handleRefreshContext,
        handleSendMessage: sendGeneralMessage,
    } = useGeneratorChat({
        phase: 'exegesis',
        content: exegesis,
        config,
        user,
        initialCacheName: null,
        selectedResourceIds: []
    });


    const [loading, setLoading] = useState(false);
    const [rightPanelMode, setRightPanelMode] = useState<'chat' | 'bible'>('chat'); 
    const [showGreekTutor, setShowGreekTutor] = useState(false); // 🎯 Greek Tutor State
    const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
    const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<CoachingStyle | 'auto'>('auto');
    
    // Combine loading states
    const isTotalAiLoading = isAiProcessing || isChatLoading;

    useEffect(() => {
        
    }, [config?.id, contentHistory.history]);

    useEffect(() => {
        
    }, [exegesis]);

    const handleGenerate = async () => {
        if (!passage.trim()) {
            toast.error(t('exegesis.errors.enterPassage'));
            return;
        }

        setLoading(true);
        try {
            // Global Context Only
            // toast.loading(t('exegesis.loading.preparingContext'), { id: 'context-prep' });
            
            // 🎯 MERGE CONFIG: Mix phase-specific Settings with Advanced Global Settings
            const exegesisConfig = config ? {
                ...config[WorkflowPhase.EXEGESIS],
                aiModel: config.advanced?.aiModel, // Inject Global Model
                temperature: config[WorkflowPhase.EXEGESIS]?.temperature || config.advanced?.globalTemperature // Fallback to global temp
            } : undefined;

            const result = await sermonGeneratorService.generateExegesis(passage, rules, exegesisConfig, user?.uid);
            setExegesis(result.exegesis);
            
            // toast.dismiss('context-prep');
            toast.success(t('exegesis.success.generated'));
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t('exegesis.errors.generateError'));
        } finally {
            setLoading(false);
        }
    };

    // 🎯 REFACTORED: Navigation is now instant - context prep happens in handleGenerate only

    // Version getters for history modal
    const getSectionVersions = (sectionId: string) => {
        return contentHistory.getVersions(sectionId);
    };

    const getCurrentVersionId = (sectionId: string) => {
        const currentVersion = contentHistory.getCurrentVersion(sectionId);
        return currentVersion?.id;
    };

    const handleRestoreVersion = async (sectionId: string, versionId: string) => {
        const version = contentHistory.goToVersion(sectionId, versionId);
        if (version && exegesis) {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('exegesis', sectionId);
            if (sectionConfig) {
                const updatedExegesis = JSON.parse(JSON.stringify(exegesis));
                setValueByPath(updatedExegesis, sectionConfig.path, version.content);
                setExegesis(updatedExegesis);
                toast.success(t('exegesis.success.restored'));
            }
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


        // 🎯 REMOVED: Manual Validation Logic (handled by Service now if needed, or skipped)
        // Since useGeneratorChat handles the general flow, we rely on it.
        // For strict validation of "Is this related to Exegesis?", the AutomaticStrategySelector in Service handles it contextually.

        // If it's a user message and we have an expanded section, refine that section
        if (role === 'user' && expandedSectionId && exegesis) {
            setIsAiProcessing(true); // 🎯 Activate loading indicator
            try {
                const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
                const { getValueByPath, setValueByPath } = await import('@/utils/path-utils');
                // Initialize AI Service - NOT NEEDED, using sermonGeneratorService
                
                // Get the section config
                const sectionConfig = getSectionConfig('exegesis', expandedSectionId);
                if (!sectionConfig) {
                    throw new Error('Section configuration not found');
                }
                
                // Get current section content
                let currentContent = getValueByPath(exegesis, sectionConfig.path);
                
                // If currentContent is a string that looks like JSON, try to parse it first
                if (typeof currentContent === 'string') {
                    const trimmed = currentContent.trim();
                    if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('```')) {
                        try {
                            let cleaned = trimmed;
                            // Remove markdown code blocks
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
                        case 'literary':
                        case 'historical':
                        case 'theological':
                            return `
FORMATO REQUERIDO (usa markdown):
- Usa **negritas** para conceptos clave y términos importantes
- Separa ideas en párrafos distintos (línea en blanco entre párrafos)
- Si mencionas múltiples puntos, usa listas con guiones (-)
- Para subtemas, usa **Subtítulo:** seguido del contenido
Ejemplo:
**Contexto Político:** [descripción]

**Contexto Social:** [descripción]

- Punto importante 1
- Punto importante 2`;

                        case 'pastoral':
                            return `
FORMATO REQUERIDO (usa markdown):
- Cada insight debe empezar con **[Título del Insight]:** en negrita
- Separa cada insight en un párrafo distinto
- Usa listas con guiones (-) para enumerar aplicaciones prácticas
Ejemplo:
**La identidad precede a la acción:** Jesús primero declara "Vosotros sois la luz" antes de mandar "Dejad que vuestra luz brille".

**Equilibrio entre visibilidad y motivación:** El pasaje presenta una tensión...`;

                        case 'keywords':
                            return `
FORMATO: Devuelve un array JSON de objetos con esta estructura exacta:
[
  {
    "original": "palabra en griego/hebreo",
    "transliteration": "transliteración",
    "significance": "significado teológico",
    "morphology": "análisis morfológico",
    "syntacticFunction": "función sintáctica"
  }
]`;

                        default:
                            return `
FORMATO: Usa markdown para mejor legibilidad:
- **Negritas** para énfasis
- Párrafos separados para ideas distintas
- Listas con guiones (-) cuando sea apropiado`;
                    }
                };
                
                // Create instruction for AI
                const instruction = `Refina el contenido de la sección "${sectionConfig.label}" según esta instrucción: ${message}

IMPORTANTE: 
- Devuelve SOLO el contenido refinado, sin explicaciones adicionales
- NO agregues prefijos como "Aquí está..." o "El contenido refinado es..."
${getFormattingInstructions(sectionConfig.id)}`;


                // Call AI service
                // Call AI service
                // Use global service with proper phase context for Global Store access
                const aiResponse = await sermonGeneratorService.refineContent(contentString, instruction, { 
                    phase: 'exegesis',
                    aiModel: config?.advanced?.aiModel,
                    temperature: config?.[WorkflowPhase.EXEGESIS]?.temperature || config?.advanced?.globalTemperature
                });
                

                
                // Parse the refined content based on the original type
                let parsedContent;
                if (Array.isArray(currentContent)) {
                    // For arrays, try to parse JSON
                    try {
                        // Clean up the response (remove markdown code blocks if present)
                        let cleanedResponse = aiResponse.trim();
                        // Remove ```json or ``` markers at start and end
                        cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
                        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
                        cleanedResponse = cleanedResponse.trim();
                        

                        
                        parsedContent = JSON.parse(cleanedResponse);
                        
                        // Ensure it's an array
                        if (!Array.isArray(parsedContent)) {
                            throw new Error('Expected array but got object');
                        }
                    } catch (parseError) {
                        console.error('Failed to parse array response:', parseError);
                        console.error('Raw response:', aiResponse);
                        console.error('Raw response:', aiResponse);
                        toast.error(t('exegesis.errors.parseError'));
                        throw new Error(t('exegesis.errors.invalidArray'));
                    }
                } else if (typeof currentContent === 'object') {
                    // For objects, try to parse JSON
                    try {
                        let cleanedResponse = aiResponse.trim();
                        cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
                        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
                        cleanedResponse = cleanedResponse.trim();
                        parsedContent = JSON.parse(cleanedResponse);
                    } catch (parseError) {
                        console.error('Failed to parse object response:', parseError);
                        parsedContent = aiResponse; // Fallback to string
                    }
                } else {
                    // For strings, use as-is
                    parsedContent = aiResponse.trim();
                }
                

                
                // Save version BEFORE updating (for undo)
                if (expandedSectionId) {
                    contentHistory.saveVersion(
                        expandedSectionId,
                        currentContent,
                        `Antes de: ${message.substring(0, 50)}...`,
                        undefined
                    );
                }
                
                // Update only this section in the exegesis
                const updatedExegesis = JSON.parse(JSON.stringify(exegesis));
                setValueByPath(updatedExegesis, sectionConfig.path, parsedContent);

                
                setExegesis(updatedExegesis);
                setModifiedSections(prev => new Set(prev).add(expandedSectionId));
                
                // Save version AFTER updating (the new refined content)
                if (expandedSectionId) {
                    contentHistory.saveVersion(
                        expandedSectionId,
                        parsedContent,
                        message.substring(0, 100),
                        `✅ Sección "${sectionConfig.label}" refinada exitosamente.`
                    );
                }
                
                // Add AI response to chat
                const aiMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant' as const,
                    content: `✅ ${t('exegesis.success.refined').replace('Sección', '')} "${sectionConfig.label}"`,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
                

                toast.success(t('exegesis.success.refined'));
            } catch (error: any) {
                console.error('Error refining section:', error);
                toast.error(error.message || t('exegesis.errors.refineError'));
                
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
        setExegesis(newContent);
        setMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, appliedChange: true } : msg
            )
        );
    };

    const handleContentUpdate = (newContent: any) => {
        setExegesis(newContent);
    };

    // Undo/Redo handlers
    const handleUndo = async (sectionId: string) => {
        const previousVersion = contentHistory.undo(sectionId);
        if (previousVersion && exegesis) {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('exegesis', sectionId);
            if (sectionConfig) {
                const updatedExegesis = JSON.parse(JSON.stringify(exegesis));
                setValueByPath(updatedExegesis, sectionConfig.path, previousVersion.content);
                setExegesis(updatedExegesis);
                toast.success(t('exegesis.success.undo'));
            }
        }
    };

    const handleRedo = async (sectionId: string) => {
        const nextVersion = contentHistory.redo(sectionId);
        if (nextVersion && exegesis) {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('exegesis', sectionId);
            if (sectionConfig) {
                const updatedExegesis = JSON.parse(JSON.stringify(exegesis));
                setValueByPath(updatedExegesis, sectionConfig.path, nextVersion.content);
                setExegesis(updatedExegesis);
                toast.success(t('exegesis.success.redo'));
            }
        }
    };

    const handleSectionUpdate = async (sectionId: string, newContent: any) => {
        if (!exegesis) return;

        try {
            const { getSectionConfig } = await import('@/components/canvas-chat/section-configs');
            const { setValueByPath, getValueByPath } = await import('@/utils/path-utils');
            
            const sectionConfig = getSectionConfig('exegesis', sectionId);
            if (sectionConfig) {
                // Get current content for history
                const currentContent = getValueByPath(exegesis, sectionConfig.path);
                
                // Save version BEFORE updating
                contentHistory.saveVersion(
                    sectionId,
                    currentContent,
                    'Antes de edición manual',
                    undefined
                );

                // Update content
                const updatedExegesis = JSON.parse(JSON.stringify(exegesis));
                setValueByPath(updatedExegesis, sectionConfig.path, newContent);
                setExegesis(updatedExegesis);
                setModifiedSections(prev => new Set(prev).add(sectionId));

                // Save version AFTER updating
                contentHistory.saveVersion(
                    sectionId,
                    newContent,
                    'Edición manual',
                    'Cambios guardados manualmente'
                );

                toast.success(t('exegesis.success.updated'));
            }
        } catch (error) {
            console.error('Error updating section:', error);
            toast.error(t('exegesis.errors.updateError'));
        }
    };



    const hasContext = config && config[WorkflowPhase.EXEGESIS]?.documents?.length > 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                <GenerationProgress phase={WorkflowPhase.EXEGESIS} />
            </div>
        );
    }

    // Left Panel Content
    const leftPanel = !exegesis ? (
        <div className="h-full flex flex-col">
            <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">{t('exegesis.title')}</h2>
                </div>
                <p className="text-muted-foreground">
                    {t('exegesis.subtitle')}
                </p>
                {hasContext && (
                    <div className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-md text-sm flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>
                            {t('exegesis.contextActive', { count: config[WorkflowPhase.EXEGESIS].documents.length })}
                        </span>
                    </div>
                )}
            </div>

            <Card className="p-6 space-y-6">
                <BiblePassageSelector 
                    value={passage}
                    onChange={setPassage}
                    onValidPassage={() => {}}
                />

                <Button
                    onClick={handleGenerate}
                    disabled={loading || !passage.trim()}
                    className="w-full mt-6"
                    size="lg"
                >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('exegesis.generateBtn')}
                </Button>
            </Card>
        </div>
    ) : (
        <div className="flex flex-col p-4" style={{ height: 'calc(100vh - 130px)' }}>
            {/* Header - fixed height */}
            <div className="mb-4 flex-shrink-0 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">{t('exegesis.analysisTitle', { passage: exegesis.passage })}</h3>
                    <p className="text-sm text-muted-foreground">
                        {expandedSectionId 
                            ? t('exegesis.refiningStatus')
                            : t('exegesis.defaultStatus')
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* 🎯 Greek Tutor Trigger */}
                    <Button 
                        variant="outline" 
                        className="h-8 gap-2 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-300"
                        onClick={() => setShowGreekTutor(true)}
                    >
                        <GraduationCap className="h-4 w-4" />
                        <span className="text-xs font-medium">Entrenar Griego</span>
                    </Button>

                    <Button 
                        variant="outline" 
                        className="h-8 gap-2 bg-background border-primary/20 text-primary hover:text-primary hover:bg-primary/5"
                        onClick={() => setRightPanelMode(prev => prev === 'bible' ? 'chat' : 'bible')}
                    >
                        <BookOpen className="h-4 w-4" />
                        <span className="text-xs font-medium">{passage}</span>
                    </Button>
                </div>
            </div>

            {/* Main content area - fixed height for scroll to work */}
            <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
                {/* Left: Content Canvas - uses internal ScrollArea */}
                <div className="flex-1 min-w-0 h-full">
                    <ContentCanvas
                        content={exegesis}
                        contentType="exegesis"
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

                {/* Right: Resizable Chat Interface */}
                {/* Right: Resizable Chat Interface or Bible Reader */}
                <ResizableChatPanel storageKey="exegesisChatWidth">
                    {rightPanelMode === 'bible' && exegesis ? (
                         <BibleReaderPanel 
                            passage={exegesis.passage} 
                            onClose={() => setRightPanelMode('chat')} 
                        />
                    ) : (
                        <ChatInterface
                            messages={messages}
                            contentType="exegesis"
                            content={exegesis}
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
                        />
                    )}
                </ResizableChatPanel>
            </div>

            {/* Continue Button */}
            <div className="flex-shrink-0 pt-4">
                <Button onClick={() => setStep(2)} size="lg" className="w-full">
                    {t('exegesis.continueBtn')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>

            {/* 🎯 Greek Tutor Overlay */}
            <GreekTutorOverlay 
                isOpen={showGreekTutor} 
                onClose={() => setShowGreekTutor(false)} 
                passage={exegesis.passage} 
            />
        </div>
    );


    // Right Panel Content - Only show when no exegesis
    const rightPanel = !exegesis ? (
        <Card className="p-6 h-full flex flex-col justify-start">
            <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold mb-2">{t('exegesis.whatIsTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t('exegesis.whatIsDesc')}
                    </p>
                </div>
                <div className="pt-4 space-y-2 text-left">
                    <h4 className="font-medium text-sm">{t('exegesis.includesLabel')}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        {(t('exegesis.includesList', { returnObjects: true }) as string[]).map((item, i) => (
                            <li key={i}>• {item}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </Card>
    ) : null; // No right panel when exegesis exists (chat is integrated in main view)


    return (
        <>
            {/* Saving Indicator */}
            {saving && (
                <div className="fixed top-4 right-4 flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-muted-foreground">{t('exegesis.saved')}</span>
                </div>
            )}
            
            {/* Render layout based on whether exegesis exists */}
            {exegesis ? (
                // When exegesis exists, render integrated layout directly
                leftPanel
            ) : (
                // When no exegesis, use WizardLayout with two panels
                <WizardLayout
                    leftPanel={leftPanel}
                    rightPanel={rightPanel}
                />
            )}
        </>
    );
}
