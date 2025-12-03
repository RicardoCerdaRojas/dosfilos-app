import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Simple Markdown Renderer
 * Handles basic markdown: **bold**, paragraphs, and lists
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  console.log('🎨 MarkdownRenderer rendering:', content?.substring(0, 100));
  
  if (!content) return <p className="text-muted-foreground text-sm">Sin contenido</p>;

  // Split content into paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim());

  const renderParagraph = (text: string, index: number) => {
    // Check if it's a list
    if (text.trim().startsWith('- ') || text.trim().startsWith('* ')) {
      const items = text.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'));
      return (
        <ul key={index} className="list-disc list-inside mb-3 space-y-1">
          {items.map((item, i) => {
            const cleanItem = item.replace(/^[-*]\s+/, '');
            return (
              <li key={i} className="text-sm leading-relaxed ml-2">
                {renderInlineMarkdown(cleanItem)}
              </li>
            );
          })}
        </ul>
      );
    }

    // Regular paragraph
    return (
      <p key={index} className="mb-3 leading-relaxed text-sm">
        {renderInlineMarkdown(text)}
      </p>
    );
  };

  const renderInlineMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // Regex to find **bold** text
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let match;
    
    console.log('🔍 Parsing text:', text.substring(0, 100));

    while ((match = boldRegex.exec(text)) !== null) {
      console.log('✅ Found bold text:', match[1]);
      
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }
      
      // Add the bold text
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {match[1]}
        </strong>
      );
      
      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }
    
    console.log('📦 Parts generated:', parts.length);

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      {paragraphs.map((paragraph, index) => renderParagraph(paragraph, index))}
    </div>
  );
}
