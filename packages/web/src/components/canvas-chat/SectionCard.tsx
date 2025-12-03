import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Maximize2 } from 'lucide-react';
import { SectionConfig } from './section-configs';
import { cn } from '@/lib/utils';

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
  onToggleCollapse
}: SectionCardProps) {
  // Translation map for common field names
  const fieldTranslations: Record<string, string> = {
    original: 'Original',
    transliteration: 'Transliteración',
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

  // Define preferred field order
  const fieldOrder = [
    'original',
    'transliteration',
    'significance',
    'morphology',
    'syntacticFunction'
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
      
      // If collapsed, show preview
      if (isCollapsed) {
        const preview = text.length > 150 ? text.substring(0, 150) + '...' : text;
        return (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
            {preview}
          </p>
        );
      }
      
      // If expanded, show full content
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-sm whitespace-pre-wrap">{text}</p>
        </div>
      );
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
      
      // If expanded, show all items with better formatting
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
                          <span className="text-foreground">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              }
              // If item is a string, render it as a list item
              return (
                <div key={i} className="text-sm pl-4 border-l-2 border-primary/20">
                  {item}
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
            onExpand();
          }}
          className="ml-2 flex-shrink-0"
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
    </Card>
  );
}
