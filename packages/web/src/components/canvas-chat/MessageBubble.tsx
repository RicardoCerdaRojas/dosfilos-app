import { CanvasChatMessage } from '@dosfilos/domain';
import { cn } from '@/lib/utils';
import { User, Sparkles } from 'lucide-react';

interface MessageBubbleProps {
  message: CanvasChatMessage;
  onApply?: (content: any) => void;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex gap-3 w-full items-start",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      )}
      
      <div className={cn(
        "rounded-lg p-3 overflow-hidden flex-1 min-w-0 max-w-[75%]",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
          {message.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
