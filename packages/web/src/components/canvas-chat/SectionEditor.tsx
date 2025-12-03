import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronDown, ChevronRight, History } from 'lucide-react';
import { SectionConfig } from './section-configs';
import { cn } from '@/lib/utils';

/**
 * Props for SectionEditor component
 * Interface Segregation: Only the props needed for this component
 */
interface SectionEditorProps {
  section: SectionConfig;
  content: any;
  onRefine: (instruction: string) => void;
  onContentChange?: (newContent: any) => void;
  isRefining?: boolean;
  hasHistory?: boolean;
  onViewHistory?: () => void;
  isModified?: boolean;
}

/**
 * SectionEditor Component
 * Single Responsibility: Renders and manages a single content section
 * 
 * Features:
 * - Collapsible section
 * - Direct content editing
 * - AI refinement with custom instructions
 * - Version history access
 * - Modified indicator
 */
export function SectionEditor({
  section,
  content,
  onRefine,
  onContentChange,
  isRefining = false,
  hasHistory = false,
  onViewHistory,
  isModified = false
}: SectionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showRefinement, setShowRefinement] = useState(false);
  const [refinementInstruction, setRefinementInstruction] = useState('');

  const handleRefine = () => {
    if (refinementInstruction.trim()) {
      onRefine(refinementInstruction);
      setRefinementInstruction('');
      setShowRefinement(false);
    }
  };

  const renderContent = () => {
    if (section.type === 'text') {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-sm">{content || 'Sin contenido'}</p>
        </div>
      );
    }

    if (section.type === 'array') {
      const items = Array.isArray(content) ? content : [];
      return (
        <ul className="list-disc list-inside space-y-1 text-sm">
          {items.length > 0 ? (
            items.map((item, i) => (
              <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
            ))
          ) : (
            <li className="text-muted-foreground">Sin elementos</li>
          )}
        </ul>
      );
    }

    if (section.type === 'object') {
      return (
        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      );
    }

    return null;
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      isModified && "border-primary/50 shadow-sm"
    )}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          
          <h3 className="font-semibold text-sm">{section.label}</h3>
          
          {section.description && (
            <span className="text-xs text-muted-foreground hidden md:inline">
              • {section.description}
            </span>
          )}
          
          {isModified && (
            <Badge variant="outline" className="ml-2 text-xs">
              Modificado
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {hasHistory && onViewHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewHistory}
              className="h-7 px-2"
            >
              <History className="h-3 w-3" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRefinement(!showRefinement)}
            className="h-7 px-2"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Refinar
          </Button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Section content */}
          <div className="border-t pt-3">
            {renderContent()}
          </div>

          {/* Refinement input */}
          {showRefinement && (
            <div className="space-y-2 border-t pt-3">
              <label className="text-xs font-medium text-muted-foreground">
                ¿Cómo quieres refinar esta sección?
              </label>
              <Textarea
                value={refinementInstruction}
                onChange={(e) => setRefinementInstruction(e.target.value)}
                placeholder="Ej: Profundizar en el contexto cultural, agregar más referencias..."
                className="min-h-[80px] text-sm"
                disabled={isRefining}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleRefine}
                  disabled={!refinementInstruction.trim() || isRefining}
                  size="sm"
                  className="flex-1"
                >
                  {isRefining ? (
                    <>
                      <Sparkles className="mr-2 h-3 w-3 animate-pulse" />
                      Refinando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-3 w-3" />
                      Aplicar Refinamiento
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowRefinement(false);
                    setRefinementInstruction('');
                  }}
                  variant="outline"
                  size="sm"
                  disabled={isRefining}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
