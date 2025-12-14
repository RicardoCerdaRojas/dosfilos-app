import { useState, useRef, useEffect } from 'react';
import { ContentType, CanvasChatMessage, CoachingStyle } from '@dosfilos/domain';
import { SourceReference } from '@dosfilos/application';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Send, Sparkles, BookOpen, ChevronDown, ChevronRight, Library, Zap, Search } from 'lucide-react';
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
    resources: Array<{ title: string; author: string }>;
    totalAvailableResources?: number; // 🎯 Total docs configured for this step
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
  disableDefaultAI?: boolean;
  externalIsLoading?: boolean;
  // New: Coaching style support
  selectedStyle?: CoachingStyle | 'auto';
  onStyleChange?: (style: CoachingStyle | 'auto') => void;
  showStyleSelector?: boolean;
  activeContext?: ActiveContext;
  onRefreshContext?: () => void;
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
  disableDefaultAI = false,
  externalIsLoading = false,
  selectedStyle = 'auto',
  onStyleChange,
  showStyleSelector = false,
  activeContext,
  onRefreshContext
}: ChatInterfaceProps<T>) {
  const [userInput, setUserInput] = useState('');
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  
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

      // Only call AI if no focused section (general mode) AND default AI is not disabled
      // If focused section OR disabled, parent handles the AI call
      if (!focusedSection && !disableDefaultAI) {
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

        if (response.refinedContent) {
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
          <div className="absolute inset-0 rounded-lg border-2 border-transparent bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_100%] animate-[gradient_3s_linear_infinite]" 
               style={{ 
                 WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                 WebkitMaskComposite: 'xor',
                 maskComposite: 'exclude',
                 padding: '2px'
               }} 
          />
        </div>
      )}
      
      <Card className="h-full flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b flex-shrink-0">
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
              <p className="text-xs text-muted-foreground truncate">
                {focusedSection 
                  ? 'Los cambios se aplicarán a esta sección'
                  : 'Hazme preguntas sobre cualquier aspecto'
                }
              </p>
            </div>
            
            {/* Context Info Button */}
            {activeContext && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Ver contexto activo">
                            <Library className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                        <div className="p-3 border-b bg-muted/30">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                                {activeContext.isCached ? (
                                    <><Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Contexto Completo (Cache)</>
                                ) : activeContext.resources.length > 0 ? (
                                    <><Library className="h-4 w-4 text-blue-600" /> Contexto: Archivos Directos</>
                                ) : (
                                    <><Search className="h-4 w-4 text-blue-500" /> Búsqueda Manual (RAG)</>
                                )}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                                {activeContext.isCached 
                                    ? "El asistente tiene acceso al contenido completo de estos recursos:"
                                    : activeContext.resources.length > 0
                                        ? "El asistente usa estos archivos directamente en el prompt (Modo Directo):"
                                        : "El asistente buscará fragmentos relevantes en estos recursos:"}
                            </p>
                            {/* Cache Status with Date and Expiration */}
                            {activeContext.createdAt && (
                                <div className="text-[10px] text-muted-foreground mt-2 space-y-0.5">
                                    <p className="flex items-center gap-1">
                                        <span>Creado:</span>
                                        <span className="font-medium">
                                            {new Date(activeContext.createdAt).toLocaleDateString('es-ES', { 
                                                day: '2-digit', 
                                                month: 'short',
                                                year: 'numeric'
                                            })}{', '}
                                            {new Date(activeContext.createdAt).toLocaleTimeString('es-ES', { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </span>
                                    </p>
                                    {activeContext.expiresAt && (() => {
                                        const now = new Date();
                                        const expiresAt = new Date(activeContext.expiresAt);
                                        const isExpired = now >= expiresAt;
                                        const timeRemaining = expiresAt.getTime() - now.getTime();
                                        const minutesRemaining = Math.max(0, Math.floor(timeRemaining / 60000));
                                        
                                        return (
                                            <p className={`flex items-center gap-1 ${isExpired ? 'text-orange-500' : 'text-emerald-600'}`}>
                                                <span>{isExpired ? '⚠️ Expirado' : '✓ Activo'}</span>
                                                {!isExpired && (
                                                    <span className="text-muted-foreground">
                                                        ({minutesRemaining} min restantes)
                                                    </span>
                                                )}
                                            </p>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                        
                        {/* Refresh Button - Moved to top for visibility */}
                        <div className="p-2 border-b bg-muted/10 flex justify-center">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-xs h-7" 
                                onClick={() => {
                                    console.log('Refresh clicked', { onRefreshContext });
                                    onRefreshContext?.();
                                }}
                                disabled={isLoading || !onRefreshContext || (activeContext.totalAvailableResources === 0)}
                            >
                                <Zap className="h-3 w-3 mr-2" />
                                {onRefreshContext 
                                    ? (activeContext.totalAvailableResources === 0 ? 'Sin documentos para cachear' : 'Regenerar Contexto (Cache)') 
                                    : 'Regenerar no disponible'}
                            </Button>
                        </div>

                        <div className="max-h-60 overflow-y-auto p-2">
                            {activeContext.resources.length > 0 ? (
                                <div className="space-y-1">
                                    {activeContext.resources.map((r, i) => (
                                        <div key={i} className="text-xs px-2 py-1.5 rounded hover:bg-muted/50 flex flex-col">
                                            <span className="font-medium truncate">{r.title}</span>
                                            <span className="text-muted-foreground text-[10px]">{r.author}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground p-2 text-center">
                                    {activeContext.totalAvailableResources === 0 
                                        ? "No hay documentos configurados para este paso." 
                                        : "No hay recursos seleccionados en RAG."
                                    }
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            )}

            {/* Coaching Style Selector */}
            {showStyleSelector && onStyleChange && (
              <Select value={selectedStyle} onValueChange={(v) => onStyleChange(v as CoachingStyle | 'auto')}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">🤖 Automático</SelectItem>
                  <SelectItem value={CoachingStyle.SOCRATIC}>🧠 Socrático</SelectItem>
                  <SelectItem value={CoachingStyle.DIRECT}>⚡ Directo</SelectItem>
                  <SelectItem value={CoachingStyle.EXPLORATORY}>🔍 Exploratorio</SelectItem>
                  <SelectItem value={CoachingStyle.DIDACTIC}>📚 Didáctico</SelectItem>
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
                ? "Describe los cambios que quieres hacer..."
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
