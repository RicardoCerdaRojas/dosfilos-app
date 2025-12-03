import { useState } from 'react';
import { ContentType, CanvasChatProps, CanvasChatMessage } from '@dosfilos/domain';
import { ContentCanvas } from './ContentCanvas';
import { ChatInterface } from './ChatInterface';
import { cn } from '@/lib/utils';
import { MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CanvasChatPanel<T>({
  content,
  contentType,
  onContentUpdate,
  contextData
}: CanvasChatProps<T>) {
  const [messages, setMessages] = useState<CanvasChatMessage[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showChat, setShowChat] = useState(false);

  const handleSendMessage = async (message: string, role: 'user' | 'assistant' = 'user') => {
    const newMessage: CanvasChatMessage = {
      id: Date.now().toString(),
      role: role,
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
  };

  const handleApplyChange = (messageId: string, newContent: T) => {
    onContentUpdate(newContent);
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, appliedChange: true } : msg
      )
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Canvas Section */}
      <div className={cn(
        "flex-1 min-h-[500px]",
        showChat && "hidden lg:block"
      )}>
        <ContentCanvas
          content={content}
          contentType={contentType}
          onContentUpdate={onContentUpdate}
          onTextSelect={setSelectedText}
        />
      </div>

      {/* Chat Section */}
      <div className={cn(
        "w-full lg:w-[400px] flex flex-col",
        !showChat && "hidden lg:flex"
      )}>
        <ChatInterface
          messages={messages}
          contentType={contentType}
          content={content}
          selectedText={selectedText}
          onSendMessage={handleSendMessage}
          onApplyChange={(msgId, newContent) => handleApplyChange(msgId, newContent as T)}
          onContentUpdate={onContentUpdate}
        />
      </div>

      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => setShowChat(!showChat)}
        >
          {showChat ? (
            <>
              <FileText className="mr-2 h-5 w-5" />
              Ver Contenido
            </>
          ) : (
            <>
              <MessageSquare className="mr-2 h-5 w-5" />
              Abrir Chat
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
