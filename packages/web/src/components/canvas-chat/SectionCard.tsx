import { useState, Fragment, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Maximize2, BookOpen, History } from 'lucide-react';
import { SectionConfig } from './section-configs';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SermonPointBlocksView } from '@/components/sermons/SermonPointBlocksView';
import { stripLeadingFieldLabel } from './stripLeadingFieldLabel';
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
  onExpand: () => void;
  isModified?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  /**
   * Cuerpo propio para esta sección, en vez del render genérico por tipo.
   *
   * Existe para que una sección pueda tener su propio editor CONSERVANDO lo que
   * la tarjeta ya le da: refinar por chat, historial de versiones, undo/redo.
   * Sin esto, un editor a medida tendría que vivir fuera de la tarjeta y
   * duplicaría en pantalla lo que la tarjeta ya muestra.
   */
  customBody?: React.ReactNode;
  /** Cuántas versiones guardadas tiene esta sección. 0 = no se muestra nada. */
  versionCount?: number;
  /** Abre el historial de esta sección directamente. */
  onOpenHistory?: () => void;
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
  onExpand,
  isModified = false,
  isCollapsed = false,
  customBody,
  versionCount = 0,
  onOpenHistory,
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
      const rendered = <MarkdownRenderer content={text} reading />;
      
      // (Se quitó el parche que metía los puntos del bosquejo dentro de la
      // tarjeta de proposición. Existía porque no había forma de verlos juntos;
      // ahora el editor del contrato los muestra y editarlos ahí, y repetirlos
      // acá los mostraba una tercera vez en la misma pantalla.)

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
              // EL CUERPO DEL SERMÓN TIENE SU PROPIO RENDERIZADOR, que consume la
              // misma descripción que el sermón publicado. El camino genérico de
              // abajo dibuja pares campo-valor con rótulos de formulario —útil
              // para exégesis, impropio para un sermón— y además había divergido
              // del serializador de la vista previa.
              if (section.id === 'body' && typeof item === 'object' && item !== null) {
                return (
                  <Card key={i} className="p-3 bg-muted/30">
                    <SermonPointBlocksView
                      point={item as never}
                      renderFallbackReference={(r) => renderTextWithBibleLinks(r)}
                    />
                  </Card>
                );
              }

              // If item is an object, render it as a card with key-value pairs
              if (typeof item === 'object' && item !== null) {
                const sortedEntries = sortObjectEntries(Object.entries(item))
                  // Skip empty fields (e.g. authorityQuote: null) so they don't
                  // render as "Cita de Autoridad: null" or a bare label.
                  .filter(([, value]) =>
                    value !== null &&
                    value !== undefined &&
                    !(typeof value === 'string' && value.trim() === '') &&
                    !(Array.isArray(value) && value.length === 0),
                  );
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
                                // Las referencias cruzadas van SIN viñeta: cada una ocupa
                                // dos líneas (cita y texto), y el marcador quedaba solo
                                // arriba porque su contenido deja de ser inline.
                                <ul className="list-disc list-inside pl-2 space-y-1">
                                  {value.map((v, idx) => {
                                    // Cross-refs arrive with a leading "> " blockquote prefix; inside a
                                    // list item it renders as a literal char, so strip it.
                                    const texto = typeof v === 'string' ? v.replace(/^\s*>\s*/, '') : v;
                                    // (Las referencias cruzadas del sermón las dibuja
                                    // `SermonPointBlocksView`, con su texto. Acá sólo
                                    // quedan las listas genéricas de otras secciones.)
                                    return <li key={idx}>{renderTextWithBibleLinks(texto)}</li>;
                                  })}
                                </ul>
                              ) : typeof value === 'string' ? (
                                // Use MarkdownRenderer for content, illustration, and other long text fields.
                                // The LLM sometimes repeats the field label inside the value
                                // (e.g. authorityQuote starts with "Cita de Autoridad:") — strip it
                                // so the label doesn't render twice.
                                (key === 'content' || key === 'illustration' || key === 'significance' || value.length > 100) ? (
                                  <MarkdownRenderer content={stripLeadingFieldLabel(value, translateFieldName(key))} reading />
                                ) : (
                                  renderTextWithBibleLinks(stripLeadingFieldLabel(value, translateFieldName(key)))
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
      // `py-0 gap-0` neutraliza el padding vertical y el gap que la Card base
      // trae por defecto (`py-6 gap-6`). Esta tarjeta pone su propio espaciado
      // en el header (`p-4`) y en el cuerpo (`pb-4 pt-3`), así que el de la base
      // se sumaba: colapsada arrastraba ~80px de aire muerto y la lista entera
      // se veía deformada.
      "py-0 gap-0 overflow-hidden transition-all duration-200 hover:shadow-md",
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

          {/* EL SEGURO TIENE QUE VERSE DESDE DONDE SE NECESITA.
              El historial vivía sólo dentro de la vista expandida, y el momento
              en que hace falta es justo después de regenerar — cuando el pastor
              mira el canvas, no una sección abierta. Un indicador acá lo
              anuncia y lo abre de un clic. */}
          {versionCount > 0 && onOpenHistory && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs flex-shrink-0 text-muted-foreground hover:text-foreground"
              title={`Ver ${versionCount} versión(es) anterior(es) de esta sección`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenHistory();
              }}
            >
              <History className="h-3 w-3 mr-1" />
              {versionCount}
            </Button>
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
          {customBody ?? renderContent()}
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

/** Sólo para tests: la limpieza de etiquetas es pura y se prueba sin montar la tarjeta. */
