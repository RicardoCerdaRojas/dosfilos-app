import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ContentType, CanvasChatMessage, CoachingStyle } from '@dosfilos/domain';
import { SourceReference } from '@dosfilos/application';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Sparkles, BookOpen, ChevronDown, ChevronRight, Wrench, MessageCircle, Bot, Brain, Zap, Compass, GraduationCap } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { getSectionConfig } from './section-configs';

interface MessageWithMetadata extends CanvasChatMessage {
  sources?: SourceReference[];
  strategyUsed?: CoachingStyle;
}

export interface ActiveContext {
    isCached: boolean;
    createdAt?: Date | null;
    expiresAt?: Date | null;
    resources: Array<{ 
        title: string; 
        author: string;
        hasGeminiUri?: boolean;
        geminiSyncedAt?: Date | null;
        isGeminiExpired?: boolean;
    }>;
    totalAvailableResources?: number; // 🎯 Total docs configured for this step
    // Computed stats for header indicators
    syncedResourceCount?: number;
    expiredResourceCount?: number;
}

interface ChatInterfaceProps<T = any> {
  messages: CanvasChatMessage[] | MessageWithMetadata[];
  contentType: ContentType;
  content: T;
  selectedText?: string;
  onSendMessage: (message: string, role?: 'user' | 'assistant') => void;
  onApplyChange: (messageId: string, newContent: any) => void;
  onContentUpdate: (content: T) => void;
  focusedSection?: string | null;
  /**
   * Dentro de un `PanelGroup` el marco lo pone el grupo: la Card interna va
   * sin borde ni esquinas — con los dos, el chat era una caja dentro del
   * marco y los paneles nunca se leían como una sola área de trabajo.
   */
  frameless?: boolean;
  disableDefaultAI?: boolean;
  externalIsLoading?: boolean;
  // New: Coaching style support
  selectedStyle?: CoachingStyle | 'auto';
  onStyleChange?: (style: CoachingStyle | 'auto') => void;
  showStyleSelector?: boolean;
  // 🎯 Context props are preserved in interface for compatibility but validly unused in UI
  activeContext?: ActiveContext;
  onRefreshContext?: () => void;
  onSyncDocuments?: () => Promise<void>; 
  isSyncingDocuments?: boolean; 
}


export function ChatInterface<T = any>({
  messages,
  contentType,
  content,
  selectedText,
  onSendMessage,
  onApplyChange,
  onContentUpdate,
  focusedSection = null,
  frameless = false,
  disableDefaultAI = false,
  externalIsLoading = false,
  selectedStyle = 'auto',
  onStyleChange,
  showStyleSelector = false,
  // Context props no longer used in UI
  // activeContext,
  // onRefreshContext,
  // onSyncDocuments,
  // isSyncingDocuments = false
}: ChatInterfaceProps<T>) {
  const [userInput, setUserInput] = useState('');
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [chatMode, setChatMode] = useState<'refine' | 'general'>('refine');
  
  // Combine internal and external loading states
  const isLoading = internalIsLoading || externalIsLoading;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleSources = (messageId: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const getStrategyLabel = (style: CoachingStyle): string => {
    switch (style) {
      case CoachingStyle.SOCRATIC: return '🧠 Socrático';
      case CoachingStyle.DIRECT: return '⚡ Directo';
      case CoachingStyle.EXPLORATORY: return '🔍 Exploratorio';
      case CoachingStyle.DIDACTIC: return '📚 Didáctico';
      default: return style;
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!userInput.trim() || isLoading) return;

    const message = userInput;
    setUserInput('');
    console.log('💬 Sending message, setting isLoading to true');
    setInternalIsLoading(true);

    try {
      // Add user message to UI
      onSendMessage(message);

      // Only call AI if:
      // 1. No focused section (general mode) AND default AI is not disabled, OR
      // 2. Focused section BUT user selected general mode
      // If focused section in refine mode OR disabled, parent handles the AI call
      if ((!focusedSection && !disableDefaultAI) || (focusedSection && chatMode === 'general')) {
        // Import the refinement service
        const { contentRefinementService } = await import('@dosfilos/application');
        
        // Call the refinement service
        const response = await contentRefinementService.refineContent(
          content,
          contentType,
          {
            instruction: message,
            selectedText: selectedText
          }
        );

        // Parse the AI response to extract the suggestion
        let suggestion = 'Sugerencia procesada';
        const aiText = response.explanation || '';
        
        if (aiText) {
          try {
            let cleanedResponse = aiText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const parsed = JSON.parse(cleanedResponse);
            
            if (parsed.suggestion) {
              suggestion = parsed.suggestion;
            } else if (typeof parsed === 'string') {
              suggestion = parsed;
            }
          } catch (parseError) {
            const suggestionMatch = aiText.match(/"suggestion":\s*"((?:[^"\\]|\\.)*)"/s);
            if (suggestionMatch && suggestionMatch[1]) {
              suggestion = suggestionMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
            } else {
              suggestion = aiText;
            }
          }
        }

        onSendMessage(suggestion, 'assistant');

        // Only update content if we're NOT in general question mode
        if (response.refinedContent && chatMode !== 'general') {
          onContentUpdate(response.refinedContent);
        }
      }
    } catch (error: any) {
      console.error('Error in chat:', error);
      onSendMessage(
        `Error: ${error.message || 'No se pudo procesar la solicitud. Por favor intenta de nuevo.'}`,
        'assistant'
      );
    } finally {
      // Ensure loading indicator is visible for at least 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('⏹️ Setting isLoading to false');
      setInternalIsLoading(false);
    }
  };

  const getSectionName = () => {
    if (!focusedSection) return null;
    const sectionConfig = getSectionConfig(contentType, focusedSection);
    return sectionConfig?.label || focusedSection;
  };

  return (
    <div className="h-full relative">
      {/* Animated border effect when loading */}
      {isLoading && (
        <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none z-10">
          <div className="absolute inset-0 rounded-lg border-2 border-transparent bg-gradient-to-r from-primary via-primary/50 to-primary bg-[length:200%_100%] animate-[gradient_3s_linear_infinite]" 
               style={{ 
                 WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                 WebkitMaskComposite: 'xor',
                 maskComposite: 'exclude',
                 padding: '2px'
               }} 
          />
        </div>
      )}
      
      {/* `py-0 gap-0`: la Card base trae `py-6 gap-6` y este panel ya pone su
          propio espaciado (header `p-4 border-b`, mensajes `p-4`, input abajo).
          Sumados, empujaban el contenido hacia abajo y el estado vacío quedaba
          flotando lejos del encabezado. Mismo caso que SectionCard. */}
      <Card
        className={cn(
            'h-full flex flex-col overflow-hidden relative py-0 gap-0',
            frameless && 'border-0 rounded-none shadow-none',
        )}
      >
        {/* Header */}
        <div className="p-4 pr-12 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">
                {focusedSection 
                  ? `Refinando: ${getSectionName()}` 
                  : contentType === 'homiletics' 
                    ? 'Asistente de Homilética' 
                    : contentType === 'sermon'
                      ? 'Asistente de Redacción'
                      : 'Asistente de Exégesis'
                }
              </h3>
              {/* El subtítulo solo aparece cuando DICE algo. Fuera de foco era
                  "Hazme preguntas sobre cualquier aspecto": relleno que en una
                  columna angosta se truncaba a "Hazme preguntas so..." y
                  competía con el título por el poco espacio que hay. */}
              {focusedSection && (
                <p className="text-xs text-muted-foreground truncate">
                  Los cambios se aplicarán a esta sección
                </p>
              )}
            </div>
            
            {/* Chat Mode Selector - Show when refining a section */}
            {focusedSection && (
              <Select value={chatMode} onValueChange={(v) => setChatMode(v as 'refine' | 'general')}>
                <SelectTrigger className="w-auto min-w-[7rem] max-w-[11rem] h-8 text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refine">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3 w-3" />
                      <span>Refinar Sección</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="general">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-3 w-3" />
                      <span>Pregunta General</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Coaching Style Selector */}
            {showStyleSelector && onStyleChange && (
              <Select value={selectedStyle} onValueChange={(v) => onStyleChange(v as CoachingStyle | 'auto')}>
                <SelectTrigger className="w-auto min-w-[7rem] max-w-[10rem] h-8 text-xs shrink-0">
                  <SelectValue placeholder="Modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Bot className="h-3 w-3" />
                      <span>Automático</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={CoachingStyle.SOCRATIC}>
                    <div className="flex items-center gap-2">
                      <Brain className="h-3 w-3" />
                      <span>Socrático</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={CoachingStyle.DIRECT}>
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      <span>Directo</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={CoachingStyle.EXPLORATORY}>
                    <div className="flex items-center gap-2">
                      <Compass className="h-3 w-3" />
                      <span>Exploratorio</span>
                    </div>
                  </SelectItem>
                  <SelectItem value={CoachingStyle.DIDACTIC}>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3 w-3" />
                      <span>Didáctico</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

      {/* Messages - with proper overflow */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              {focusedSection 
                ? 'Escribe cómo quieres refinar esta sección...'
                : 'Selecciona texto o usa las acciones rápidas para comenzar'
              }
            </div>
          ) : (
            messages.map((message) => {
              const msgWithMeta = message as MessageWithMetadata;
              return (
                <div key={message.id} className="space-y-1">
                  <MessageBubble
                    message={message}
                    onApply={
                      message.role === 'assistant' && !message.appliedChange
                        ? (content: any) => onApplyChange(message.id, content)
                        : undefined
                    }
                  />
                  {/* Strategy badge and sources for assistant messages */}
                  {message.role === 'assistant' && (msgWithMeta.sources?.length || msgWithMeta.strategyUsed) && (
                    <div className="flex items-center gap-2 ml-11 flex-wrap">
                      {/* Strategy Badge */}
                      {msgWithMeta.strategyUsed && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {getStrategyLabel(msgWithMeta.strategyUsed)}
                        </span>
                      )}
                      {/* Collapsible Sources */}
                      {msgWithMeta.sources && msgWithMeta.sources.length > 0 && (
                        <Collapsible 
                          open={expandedSources.has(message.id)}
                          onOpenChange={() => toggleSources(message.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded hover:bg-muted/50">
                              <BookOpen className="h-3 w-3" />
                              <span>Fuentes ({msgWithMeta.sources.length})</span>
                              {expandedSources.has(message.id) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 space-y-1">
                            {msgWithMeta.sources.map((source, idx) => (
                              <div key={idx} className="text-xs bg-muted/50 rounded p-2 ml-2">
                                <div className="font-medium">{source.title}</div>
                                <div className="text-muted-foreground">
                                  {source.author}{source.page ? ` — Pág. ${source.page}` : ''}
                                </div>
                                <div className="text-muted-foreground mt-1 italic line-clamp-2">
                                  "{source.snippet}"
                                </div>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          
          {/* Loading indicator - Typing animation */}
          {isLoading && (
            <>
              {console.log('🔄 Loading indicator visible - isLoading:', isLoading)}
              <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="max-w-[80%] rounded-lg p-4 bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-medium">El experto está pensando</span>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              focusedSection
                ? chatMode === 'refine'
                  ? "Describe los cambios que quieres hacer..."
                  : "Haz una pregunta general sobre esta sección..."
                : "Escribe tu solicitud..."
            }
            className="min-h-[80px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!userInput.trim() || isLoading}
            size="icon"
            className="flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
    </div>
  );
}
