import { cn } from '@/lib/utils';
import { useState, Fragment, ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { BiblePassageViewer } from '@/components/bible/BiblePassageViewer';
import { LocalBibleService } from '@/services/LocalBibleService';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** If true, Bible references will be clickable to view the passage */
  enableBibleLinks?: boolean;
}

// Comprehensive pattern to match Bible references in Spanish
// Matches: "Juan 3:16", "Jn 3:16", "1 Juan 3:16-18", "1Jn 3.16", "Gén 1:1", etc.
// Supports: Full names, abbreviations, with/without spaces, : or . as separator
const BIBLE_REF_PATTERN = /(?:^|[^\wáéíóúñ])((?:[1-3]\s?)?(?:Génesis|Genesis|Gén|Gen|Gn|Éxodo|Exodo|Éx|Ex|Levítico|Levitico|Lev|Lv|Números|Numeros|Núm|Num|Nm|Deuteronomio|Deut|Dt|Josué|Josue|Jos|Jueces|Jue|Jc|Rut|Rt|Samuel|Sam|S|Reyes|Rey|R|Crónicas|Cronicas|Cr|Esdras|Esd|Ezr|Nehemías|Nehemias|Neh|Ne|Ester|Est|Et|Job|Jb|Salmos?|Sal|Sl|Ps|Proverbios|Prov|Pr|Prv|Eclesiastés|Eclesiastes|Ecl|Ec|Cantares|Cantar|Cnt|Ct|Isaías|Isaias|Is|Isa|Jeremías|Jeremias|Jer|Jr|Lamentaciones|Lam|Lm|Ezequiel|Ezeq|Ez|Daniel|Dan|Dn|Oseas|Os|Joel|Jl|Amós|Amos|Am|Abdías|Abdias|Abd|Ab|Jonás|Jonas|Jon|Miqueas|Miq|Mi|Nahúm|Nahum|Nah|Na|Habacuc|Hab|Sofonías|Sofonias|Sof|Hageo|Hag|Zacarías|Zacarias|Zac|Zc|Malaquías|Malaquias|Mal|Mateo|Mat|Mt|Marcos|Mar|Mc|Mr|Lucas|Luc|Lc|Juan|Jn|Hechos|Hch|Hec|Romanos|Rom|Ro|Rm|Corintios|Cor|Co|Gálatas|Galatas|Gál|Gal|Ga|Efesios|Ef|Efe|Filipenses|Fil|Fp|Colosenses|Col|Tesalonicenses|Tes|Ts|Timoteo|Tim|Ti|Tito|Tit|Filemón|Filemon|Flm|Flmn|Hebreos|Heb|He|Santiago|Sant|Stg|Pedro|Ped|Pe|P|Judas|Jud|Apocalipsis|Apoc|Ap)\s*\d+[:.]\d+(?:[-–]\d+)?)/gi;


/**
 * Simple Markdown Renderer with Bible verse detection
 * Handles basic markdown: **bold**, paragraphs, lists, and Bible references
 */
export function MarkdownRenderer({ content, className, enableBibleLinks = true }: MarkdownRendererProps) {
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  
  // Ensure content is a string
  const textContent = typeof content === 'string' ? content : String(content ?? '');
  
  if (!textContent) return <p className="text-muted-foreground text-sm">Sin contenido</p>;

  // Split content into paragraphs
  const paragraphs = textContent.split('\n\n').filter(p => p.trim());

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

  const renderInlineMarkdown = (text: string): ReactNode => {
    // First, parse bold text
    const parts = parseBoldText(text);
    
    // Then, if Bible links are enabled, parse Bible references within each part
    if (enableBibleLinks) {
      return parts.map((part, partIndex) => {
        if (typeof part === 'string') {
          return (
            <Fragment key={partIndex}>
              {parseBibleReferences(part)}
            </Fragment>
          );
        }
        // It's already a React element (bold text), check if it contains Bible refs
        if (typeof (part as any).props?.children === 'string') {
          return (
            <strong key={partIndex} className="font-semibold text-foreground">
              {parseBibleReferences((part as any).props.children)}
            </strong>
          );
        }
        return part;
      });
    }
    
    return parts;
  };

  const parseBoldText = (text: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    let currentIndex = 0;
    
    // Regex to find **bold** text
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
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

    return parts.length > 0 ? parts : [text];
  };

  const parseBibleReferences = (text: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    
    // Reset regex state
    BIBLE_REF_PATTERN.lastIndex = 0;
    
    let match;
    while ((match = BIBLE_REF_PATTERN.exec(text)) !== null) {
      const fullMatch = match[1]; // The actual reference (captured group)
      if (!fullMatch) continue;
      
      const startIndex = text.indexOf(fullMatch, lastIndex);
      
      if (startIndex === -1) continue;
      
      // Validate that this is a parseable reference
      const isValid = LocalBibleService.parseReference(fullMatch.trim()) !== null;
      
      if (!isValid) {
        continue;
      }
      
      // Add text before the match
      if (startIndex > lastIndex) {
        parts.push(text.substring(lastIndex, startIndex));
      }
      
      // Add the clickable reference
      const ref = fullMatch.trim();
      parts.push(
        <button
          key={`ref-${startIndex}-${ref}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedReference(ref);
          }}
          className={cn(
            "inline-flex items-center gap-0.5 text-primary font-medium",
            "hover:underline decoration-dotted underline-offset-2",
            "cursor-pointer transition-colors hover:text-primary/80",
            "bg-primary/5 px-1 py-0.5 rounded text-sm"
          )}
          title={`Ver ${ref}`}
        >
          <BookOpen className="h-3 w-3 flex-shrink-0" />
          <span>{ref}</span>
        </button>
      );
      
      lastIndex = startIndex + fullMatch.length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  };

  return (
    <>
      <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
        {paragraphs.map((paragraph, index) => renderParagraph(paragraph, index))}
      </div>
      
      {/* Bible Passage Viewer Dialog */}
      {enableBibleLinks && (
        <BiblePassageViewer
          reference={selectedReference}
          onClose={() => setSelectedReference(null)}
        />
      )}
    </>
  );
}

