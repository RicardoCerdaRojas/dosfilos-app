import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Clock, RotateCcw, FileText } from 'lucide-react';
import { SectionVersion } from '@/hooks/useContentHistory';
import { DiffViewer } from './DiffViewer';
import { SectionConfig } from './section-configs';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownRenderer } from './MarkdownRenderer';


/**
 * Props for HistoryModal component
 */
interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SectionConfig;
  versions: SectionVersion[];
  currentVersionId?: string;
  onRestore: (versionId: string) => void;
}

/**
 * HistoryModal Component
 * Displays complete version history for a section with diff preview
 */
export function HistoryModal({
  open,
  onOpenChange,
  section,
  versions,
  currentVersionId,
  onRestore
}: HistoryModalProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'content' | 'diff'>('content');

  // Auto-select the current version when modal opens
  useEffect(() => {
    if (open && versions.length > 0 && !selectedVersionId) {
      const current = versions.find(v => v.id === currentVersionId);
      const versionToSelect = current?.id || versions[versions.length - 1]?.id || null;
      if (versionToSelect) {
        setSelectedVersionId(versionToSelect);
      }
    }
  }, [open, versions, currentVersionId, selectedVersionId]);

  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  const selectedIndex = versions.findIndex(v => v.id === selectedVersionId);
  const previousVersion = selectedIndex > 0 ? versions[selectedIndex - 1] : null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return formatDate(date);
  };

  const renderContent = (content: any) => {
    if (section.type === 'text') {
      return <MarkdownRenderer content={content || 'Sin contenido'} />;
    }
    
    if (section.type === 'array') {
      return (
        <div className="space-y-2">
          {Array.isArray(content) && content.length > 0 ? (
            content.map((item, i) => (
              <Card key={i} className="p-3 bg-muted/30">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                </pre>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin elementos</p>
          )}
        </div>
      );
    }

    return (
      <pre className="text-xs bg-muted p-3 rounded overflow-auto font-mono">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="!max-w-[95vw] !w-full sm:!w-[1200px] lg:!w-[1600px] h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0" 
        showCloseButton={true}
      >
        {/* Header */}
        <div className="p-6 border-b flex-shrink-0 bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl">Historial: {section.label}</DialogTitle>
            <DialogDescription>
              {versions.length} versión{versions.length !== 1 ? 'es' : ''} guardada{versions.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex">
          {/* Left Sidebar: Version List */}
          <div className="w-[420px] border-r flex flex-col bg-muted/10">
            <div className="p-4 border-b bg-muted/30 flex-shrink-0">
              <h3 className="font-semibold text-sm">Versiones</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {[...versions].reverse().map((version) => {
                  const isSelected = version.id === selectedVersionId;
                  const isCurrent = version.id === currentVersionId;

                  return (
                    <Card
                      key={version.id}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                          : 'hover:bg-muted/50 hover:border-muted-foreground/30'
                      }`}
                      onClick={() => {
                        setSelectedVersionId(version.id);
                        setViewMode('content');
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium line-clamp-2 leading-tight flex-1">
                            {version.changeDescription}
                          </p>
                          {isCurrent && (
                            <Badge variant="default" className="flex-shrink-0 text-xs">
                              Actual
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatRelativeTime(version.timestamp)}</span>
                        </div>

                        {version.aiSuggestion && (
                          <p className="text-xs text-muted-foreground italic line-clamp-2 pt-1 border-t">
                            {version.aiSuggestion}
                          </p>
                        )}
                        
                        <div className="pt-2 flex justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs w-full bg-background border hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestore(version.id);
                              onOpenChange(false);
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1.5" />
                            {isCurrent ? 'Recargar' : 'Restaurar'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Version Details */}
          <div className="flex-1 flex flex-col min-w-0 bg-background/50">
            {selectedVersion ? (
              <>
                {/* Actions Bar (Top) */}
                <div className="p-4 border-b flex items-center justify-between gap-4 flex-shrink-0 bg-background">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">
                      {selectedVersion.changeDescription}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(selectedVersion.timestamp)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {previousVersion && (
                      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
                        <TabsList className="grid w-full grid-cols-2 h-9">
                          <TabsTrigger value="content" className="text-xs px-3">
                            <FileText className="h-3 w-3 mr-1.5" />
                            Contenido
                          </TabsTrigger>
                          <TabsTrigger value="diff" className="text-xs px-3">
                            <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                            Cambios
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    )}
                  </div>
                </div>

                {/* Content Area */}
                <ScrollArea className="flex-1 p-6 bg-background">
                  {viewMode === 'diff' && previousVersion ? (
                    <div>
                      <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Comparando con versión anterior
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {previousVersion.changeDescription} • {formatRelativeTime(previousVersion.timestamp)}
                        </p>
                      </div>
                      <DiffViewer
                        oldContent={previousVersion.content}
                        newContent={selectedVersion.content}
                        contentType={section.type}
                      />
                    </div>
                  ) : (
                    <div>
                      {renderContent(selectedVersion.content)}
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Selecciona una versión para ver detalles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
