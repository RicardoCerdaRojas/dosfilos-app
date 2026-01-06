import { useState, Fragment, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Maximize2, BookOpen } from 'lucide-react';
import { SectionConfig } from './section-configs';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { BiblePassageViewer } from '@/components/bible/BiblePassageViewer';
import { LocalBibleService } from '@/services/LocalBibleService';

// Comprehensive pattern to match Bible references in Spanish
const BIBLE_REF_PATTERN = /(?:^|[^\wáéíóúñ])((?:[1-3]\s?)?(?:Génesis|Genesis|Gén|Gen|Gn|Éxodo|Exodo|Éx|Ex|Levítico|Levitico|Lev|Lv|Números|Numeros|Núm|Num|Nm|Deuteronomio|Deut|Dt|Josué|Josue|Jos|Jueces|Jue|Jc|Rut|Rt|Samuel|Sam|S|Reyes|Rey|R|Crónicas|Cronicas|Cr|Esdras|Esd|Ezr|Nehemías|Nehemias|Neh|Ne|Ester|Est|Et|Job|Jb|Salmos?|Sal|Sl|Ps|Proverbios|Prov|Pr|Prv|Eclesiastés|Eclesiastes|Ecl|Ec|Cantares|Cantar|Cnt|Ct|Isaías|Isaias|Is|Isa|Jeremías|Jeremias|Jer|Jr|Lamentaciones|Lam|Lm|Ezequiel|Ezeq|Ez|Daniel|Dan|Dn|Oseas|Os|Joel|Jl|Amós|Amos|Am|Abdías|Abdias|Abd|Ab|Jonás|Jonas|Jon|Miqueas|Miq|Mi|Nahúm|Nahum|Nah|Na|Habacuc|Hab|Sofonías|Sofonias|Sof|Hageo|Hag|Zacarías|Zacarias|Zac|Zc|Malaquías|Malaquias|Mal|Mateo|Mat|Mt|Marcos|Mar|Mc|Mr|Lucas|Luc|Lc|Juan|Jn|Hechos|Hch|Hec|Romanos|Rom|Ro|Rm|Corintios|Cor|Co|Gálatas|Galatas|Gál|Gal|Ga|Efesios|Ef|Efe|Filipenses|Fil|Fp|Colosenses|Col|Tesalonicenses|Tes|Ts|Timoteo|Tim|Ti|Tito|Tit|Filemón|Filemon|Flm|Flmn|Hebreos|Heb|He|Santiago|Sant|Stg|Pedro|Ped|Pe|P|Judas|Jud|Apocalipsis|Apoc|Ap)\s*\d+[:.]\d+(?:[-–]\d+)?)/gi;


/**
 * Props for SectionCard component
 * Simplified: No embedded chat, just display and expand action
 */
interface SectionCardProps {
  section: SectionConfig;
  content: any;
  fullContent?: any; // 🎯 NEW: Full content object for accessing related fields
  contentType?: string; // 🎯 NEW: Type of content (homiletics, sermon, etc.)
  onExpand: () => void;
  isModified?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * SectionCard Component
 * Single Responsibility: Display section summary with expand action
 * 
 * Features:
 * - Collapsible section
 * - Content preview
 * - Expand button to focus on this section
 * - Modified indicator
 */
export function SectionCard({
  section,
  content,
  fullContent,
  contentType,
  onExpand,
  isModified = false,
  isCollapsed = false,
  onToggleCollapse
}: SectionCardProps) {
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  
  // Helper function to render text with clickable Bible references
  const renderTextWithBibleLinks = (text: string): ReactNode => {
    if (typeof text !== 'string') return String(text);
    
    // Helper to parse bold text
    const parseBold = (content: string): ReactNode => {
      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    const parts: ReactNode[] = [];
    let lastIndex = 0;
    
    BIBLE_REF_PATTERN.lastIndex = 0;
    
    let match;
    while ((match = BIBLE_REF_PATTERN.exec(text)) !== null) {
      const fullMatch = match[1];
      if (!fullMatch) continue;
      
      const startIndex = text.indexOf(fullMatch, lastIndex);
      if (startIndex === -1) continue;
      
      // Validate that this is a parseable reference
      const isValid = LocalBibleService.parseReference(fullMatch.trim()) !== null;
      if (!isValid) continue;
      
      // Add text before the match (parsed for bold)
      if (startIndex > lastIndex) {
        parts.push(parseBold(text.substring(lastIndex, startIndex)));
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
            "bg-primary/5 px-1 py-0.5 rounded"
          )}
          title={`Ver ${ref}`}
        >
          <BookOpen className="h-3 w-3 flex-shrink-0" />
          <span>{ref}</span>
        </button>
      );
      
      lastIndex = startIndex + fullMatch.length;
    }
    
    // Add remaining text (parsed for bold)
    if (lastIndex < text.length) {
      parts.push(parseBold(text.substring(lastIndex)));
    }
    
    return parts.length > 0 ? (
      <>
        {parts.map((part, index) => (
          <Fragment key={index}>{part}</Fragment>
        ))}
      </>
    ) : parseBold(text);
  };
  // Translation map for common field names
  const fieldTranslations: Record<string, string> = {
    // Sermon Points
    point: 'Punto',
    content: 'Contenido',
    scriptureReferences: 'Referencias Cruzadas',
    illustration: 'Ilustración',
    implications: 'Implicaciones',
    authorityQuote: 'Cita de Autoridad',
    transition: 'Transición',
    // Exegesis Keywords
    original: 'Original',
    transliteration: 'Transliteración',
    lemma: 'Lema (Raíz)',
    literalTranslation: 'Traducción Literal',
    morphology: 'Morfología',
    syntacticFunction: 'Función Sintáctica',
    significance: 'Significado',
    audience: 'Audiencia',
    historical: 'Histórico',
    literary: 'Literario'
  };

  const translateFieldName = (key: string): string => {
    return fieldTranslations[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  // Define preferred field order for keywords and sermon points
  const fieldOrder = [
    // Sermon Points
    'point',
    'content',
    'scriptureReferences',
    'illustration',
    'implications',
    'authorityQuote',
    'transition',
    // Exegesis Keywords
    'original',
    'transliteration',
    'lemma',
    'literalTranslation',
    'morphology',
    'syntacticFunction',
    'significance'
  ];

  const sortObjectEntries = (entries: [string, any][]): [string, any][] => {
    return entries.sort((a, b) => {
      const indexA = fieldOrder.indexOf(a[0]);
      const indexB = fieldOrder.indexOf(b[0]);
      
      // If both are in the order list, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // If only A is in the list, it comes first
      if (indexA !== -1) return -1;
      // If only B is in the list, it comes first
      if (indexB !== -1) return 1;
      // If neither is in the list, maintain original order
      return 0;
    });
  };

  const renderContent = () => {
    if (section.type === 'text') {
      const text = content || 'Sin contenido';
      
      
      // If collapsed, show preview (plain text)
      if (isCollapsed) {
        // Remove markdown for preview
        const plainText = text.replace(/[*_#`]/g, '');
        const preview = plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
        return (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
            {preview}
          </p>
        );
      }
      
      // If expanded, render markdown
      const rendered = <MarkdownRenderer content={text} />;
      
      // 🎯 Special case: If this is homiletics proposition, also show outline points
      // Use live outline.mainPoints instead of static outlinePreview to reflect edits
      if (contentType === 'homiletics' && section.id === 'proposition' && fullContent?.outline?.mainPoints?.length > 0) {
        return (
          <div>
            {rendered}
            <div className="mt-4 pt-4 border-t border-border/50">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                Puntos del Sermón:
              </h4>
              <ul className="space-y-1.5 text-sm">
                {fullContent.outline.mainPoints.map((point: any, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">▪</span>
                    <span className="text-foreground/90">{point.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      }
      
      return rendered;
    }

    if (section.type === 'array') {
      const items = Array.isArray(content) ? content : [];
      
      // If collapsed, show count
      if (isCollapsed) {
        return (
          <div className="text-sm text-muted-foreground">
            {items.length > 0 ? (
              <span>{items.length} elemento(s)</span>
            ) : (
              <span>Sin elementos</span>
            )}
          </div>
        );
      }
      
      // Special rendering for keywords section with table format
      if (section.id === 'keywords' && items.length > 0 && typeof items[0] === 'object') {
        return (
          <div className="space-y-4">
            {items.map((item, i) => {
              const keyword = item as any;
              return (
                <Card key={i} className="p-4 bg-muted/30 space-y-4">
                  {/* Table Row: Original, Transliteración, Lema, Traducción */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Original</th>
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Transliteración</th>
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Lema (Raíz)</th>
                          <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Traducción Literal</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2 px-3 font-medium text-lg">{keyword.original || '—'}</td>
                          <td className="py-2 px-3 italic">{keyword.transliteration || '—'}</td>
                          <td className="py-2 px-3">{keyword.lemma || '—'}</td>
                          <td className="py-2 px-3">{keyword.literalTranslation || '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Morfología */}
                  {keyword.morphology && (
                    <div className="border-l-2 border-primary/30 pl-3">
                      <h4 className="font-semibold text-sm text-primary mb-1">Morfología</h4>
                      <p className="text-sm text-foreground">{renderTextWithBibleLinks(keyword.morphology)}</p>
                    </div>
                  )}
                  
                  {/* Función Sintáctica */}
                  {keyword.syntacticFunction && (
                    <div className="border-l-2 border-primary/30 pl-3">
                      <h4 className="font-semibold text-sm text-primary mb-1">Función Sintáctica</h4>
                      <p className="text-sm text-foreground">{renderTextWithBibleLinks(keyword.syntacticFunction)}</p>
                    </div>
                  )}
                  
                  {/* Significado */}
                  {keyword.significance && (
                    <div className="border-l-2 border-primary/30 pl-3">
                      <h4 className="font-semibold text-sm text-primary mb-1">Significado</h4>
                      <p className="text-sm text-foreground">{renderTextWithBibleLinks(keyword.significance)}</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        );
      }
      
      // If expanded, show all items with better formatting (for non-keyword arrays)
      return (
        <div className="space-y-3">
          {items.length > 0 ? (
            items.map((item, i) => {
              // If item is an object, render it as a card with key-value pairs
              if (typeof item === 'object' && item !== null) {
                const sortedEntries = sortObjectEntries(Object.entries(item));
                return (
                  <Card key={i} className="p-3 bg-muted/30">
                    <div className="space-y-1">
                        {sortedEntries.map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-muted-foreground">
                              {translateFieldName(key)}:{' '}
                            </span>
                            <span className="text-foreground block mt-1">
                              {Array.isArray(value) ? (
                                <ul className="list-disc list-inside pl-2 space-y-1">
                                  {value.map((v, idx) => (
                                    <li key={idx}>{renderTextWithBibleLinks(v)}</li>
                                  ))}
                                </ul>
                              ) : typeof value === 'string' ? (
                                // Use MarkdownRenderer for content, illustration, and other long text fields
                                (key === 'content' || key === 'illustration' || key === 'significance' || value.length > 100) ? (
                                  <MarkdownRenderer content={value} />
                                ) : (
                                  renderTextWithBibleLinks(value)
                                )
                              ) : (
                                JSON.stringify(value)
                              )}
                            </span>
                          </div>
                        ))}
                    </div>
                  </Card>
                );
              }
              // If item is a string, render it as a list item with Bible links
              return (
                <div key={i} className="text-sm pl-4 border-l-2 border-primary/20">
                  {typeof item === 'string' ? renderTextWithBibleLinks(item) : String(item)}
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground text-sm">Sin elementos</p>
          )}
        </div>
      );
    }

    if (section.type === 'object') {
      // Check if it's an outline
      if (content && Array.isArray(content.mainPoints)) {
        const points = content.mainPoints;
        
        if (isCollapsed) {
          return (
            <div className="text-sm text-muted-foreground">
              {points.length > 0 ? (
                <span>{points.length} punto(s) principal(es)</span>
              ) : (
                <span>Sin puntos definidos</span>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {points.map((point: any, i: number) => (
              <div key={i} className="border-l-2 border-primary/20 pl-4">
                <h4 className="font-medium text-sm">{renderTextWithBibleLinks(point.title)}</h4>
                <p className="text-sm text-muted-foreground mt-1">{renderTextWithBibleLinks(point.description)}</p>
                {point.scriptureReferences && point.scriptureReferences.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {point.scriptureReferences.map((ref: string, j: number) => (
                      <button
                        key={j}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReference(ref);
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                          "bg-secondary text-secondary-foreground",
                          "hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                        )}
                        title={`Ver ${ref}`}
                      >
                        <BookOpen className="h-3 w-3" />
                        {ref}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      return (
        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-60">
          {JSON.stringify(content, null, 2)}
        </pre>
      );
    }

    return null;
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      isModified && "border-primary/50"
    )}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2 flex-1">
          {onToggleCollapse && (
            isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{section.label}</h3>
            {section.description && (
              <p className="text-xs text-muted-foreground truncate">
                {section.description}
              </p>
            )}
          </div>
          
          {isModified && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              Modificado
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (!section.readonly) {
              onExpand();
            }
          }}
          disabled={section.readonly}
          className="ml-2 flex-shrink-0"
          title={section.readonly ? 'Esta sección es de solo lectura' : 'Refinar esta sección'}
        >
          <Maximize2 className="h-3 w-3 mr-1" />
          Refinar
        </Button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 border-t pt-3">
          {renderContent()}
        </div>
      )}

      {/* Bible Passage Viewer Dialog */}
      <BiblePassageViewer
        reference={selectedReference}
        onClose={() => setSelectedReference(null)}
      />
    </Card>
  );
}
