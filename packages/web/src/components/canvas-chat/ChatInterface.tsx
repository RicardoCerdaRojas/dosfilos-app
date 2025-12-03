import { useState, useRef, useEffect } from 'react';
import { ContentType, CanvasChatMessage } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { getSectionConfig } from './section-configs';

interface ChatInterfaceProps<T = any> {
  messages: CanvasChatMessage[];
  contentType: ContentType;
  content: T;
  selectedText?: string;
  onSendMessage: (message: string, role?: 'user' | 'assistant') => void;
  onApplyChange: (messageId: string, newContent: any) => void;
  onContentUpdate: (content: T) => void;
  focusedSection?: string | null; // ID of currently expanded section
  disableDefaultAI?: boolean; // If true, ChatInterface won't trigger AI automatically
  externalIsLoading?: boolean; // If true, forces loading state
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
  externalIsLoading = false
}: ChatInterfaceProps<T>) {
  const [userInput, setUserInput] = useState('');
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  
  // Combine internal and external loading states
  const isLoading = internalIsLoading || externalIsLoading;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
                {focusedSection ? `Refinando: ${getSectionName()}` : 'Asistente de Exégesis'}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {focusedSection 
                  ? 'Los cambios se aplicarán a esta sección'
                  : 'Hazme preguntas sobre cualquier aspecto'
                }
              </p>
            </div>
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
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onApply={
                  message.role === 'assistant' && !message.appliedChange
                    ? (content: any) => onApplyChange(message.id, content)
                    : undefined
                }
              />
            ))
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
