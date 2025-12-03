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
}

export function ChatInterface<T = any>({
  messages,
  contentType,
  content,
  selectedText,
  onSendMessage,
  onApplyChange,
  onContentUpdate,
  focusedSection = null
}: ChatInterfaceProps<T>) {
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!userInput.trim() || isLoading) return;

    const message = userInput.trim();
    setUserInput('');
    setIsLoading(true);

    try {
      // Add user message
      onSendMessage(message);

      // Only call AI if no focused section (general mode)
      // If focused section, parent handles the AI call
      if (!focusedSection) {
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
      setIsLoading(false);
    }
  };

  const getSectionName = () => {
    if (!focusedSection) return null;
    const sectionConfig = getSectionConfig(contentType, focusedSection);
    return sectionConfig?.label || focusedSection;
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
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
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Procesando...</span>
                </div>
              </div>
            </div>
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
  );
}
