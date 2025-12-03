import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, History, Undo2, Redo2 } from 'lucide-react';
import { SectionConfig } from './section-configs';
import { HistoryModal } from './HistoryModal';
import { SectionVersion } from '@/hooks/useContentHistory';

/**
 * Props for ExpandedSection component
 */
interface ExpandedSectionProps {
  section: SectionConfig;
  content: any;
  onClose: () => void;
  onViewHistory?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isModified?: boolean;
  // History modal props
  versions?: SectionVersion[];
  currentVersionId?: string;
  onRestoreVersion?: (versionId: string) => void;
}

/**
 * ExpandedSection Component
 * Single Responsibility: Display full section content when expanded
 * 
 * Shows the complete content of a section in focus mode
 */
export function ExpandedSection({
  section,
  content,
  onClose,
  onViewHistory,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isModified = false,
  versions = [],
  currentVersionId,
  onRestoreVersion
}: ExpandedSectionProps) {
  const [showHistoryModal, setShowHistoryModal] = useState(false);

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

  const renderFullContent = () => {
    if (section.type === 'text') {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{content || 'Sin contenido'}</p>
        </div>
      );
    }

    if (section.type === 'array') {
      const items = Array.isArray(content) ? content : [];
      return (
        <div className="space-y-3">
          {items.length > 0 ? (
            items.map((item, i) => {
              // If item is an object, render it as a card with key-value pairs
              if (typeof item === 'object' && item !== null) {
                const sortedEntries = sortObjectEntries(Object.entries(item));
                return (
                  <Card key={i} className="p-4 bg-muted/30">
                    <div className="space-y-2">
                      {sortedEntries.map(([key, value]) => (
                        <div key={key}>
                          <span className="font-semibold text-sm text-primary">
                            {translateFieldName(key)}
                          </span>
                          <p className="text-sm mt-1 text-foreground">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              }
              // If item is a string, render it as a list item
              return (
                <div key={i} className="text-sm pl-4 border-l-2 border-primary/30 py-2">
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
        <pre className="text-sm bg-muted p-4 rounded overflow-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      );
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4 mr-1" />
            Cerrar
          </Button>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg truncate">{section.label}</h2>
            {section.description && (
              <p className="text-sm text-muted-foreground truncate">
                {section.description}
              </p>
            )}
          </div>

          {isModified && (
            <Badge variant="outline" className="flex-shrink-0">
              Modificado
            </Badge>
          )}

          {/* Undo/Redo buttons */}
          <div className="flex gap-1 flex-shrink-0">
            {onUndo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo}
                title="Deshacer"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            )}
            {onRedo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo}
                title="Rehacer"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {versions.length > 0 && onRestoreVersion && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              className="flex-shrink-0"
            >
              <History className="h-3 w-3 mr-1" />
              Historial ({versions.length})
            </Button>
          )}
        </div>
      </div>

      {/* Content - with proper overflow */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {renderFullContent()}
      </div>

      {/* History Modal */}
      {onRestoreVersion && (
        <HistoryModal
          open={showHistoryModal}
          onOpenChange={setShowHistoryModal}
          section={section}
          versions={versions}
          currentVersionId={currentVersionId}
          onRestore={onRestoreVersion}
        />
      )}
    </div>
  );
}
