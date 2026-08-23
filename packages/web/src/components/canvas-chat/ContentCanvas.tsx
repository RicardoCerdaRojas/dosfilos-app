import { ContentType } from '@dosfilos/domain';
import { getSectionsForType, SectionConfig } from './section-configs';
import { SectionCard } from './SectionCard';
import { ExpandedSection } from './ExpandedSection';
import { getValueByPath } from '@/utils/path-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';

/**
 * Props for ContentCanvas component
 */
interface ContentCanvasProps<T = any> {
  content: T;
  contentType: ContentType;
  expandedSectionId: string | null;
  onSectionExpand: (sectionId: string) => void;
  onSectionClose: () => void;
  onSectionViewHistory?: (sectionId: string) => void;
  onSectionUndo?: (sectionId: string) => void;
  onSectionRedo?: (sectionId: string) => void;
  canUndo?: (sectionId: string) => boolean;
  canRedo?: (sectionId: string) => boolean;
  // History modal props
  getSectionVersions?: (sectionId: string) => any[];
  /**
   * Sección cuyo historial debe abrirse al expandir.
   *
   * Lo decide quien está afuera —el aviso tras regenerar, o el indicador de la
   * tarjeta— porque los dos caminos tienen que llegar al mismo lugar.
   */
  openHistoryFor?: string | null;
  /** El pastor pidió ver el historial de esta sección desde la tarjeta. */
  onSectionOpenHistory?: (sectionId: string) => void;
  getCurrentVersionId?: (sectionId: string) => string | undefined;
  onRestoreVersion?: (sectionId: string, versionId: string) => void;
  modifiedSections?: Set<string>;
  onSectionUpdate?: (sectionId: string, newContent: any) => void;
  onRegenerate?: (sectionId: string, itemIndex?: number) => void;
  /**
   * Cuerpo propio por sección, en vez del render genérico por tipo.
   *
   * Permite que una sección tenga su editor a medida SIN salir de la tarjeta,
   * conservando refinar por chat, historial y undo/redo. La alternativa —
   * renderizarlo al lado del canvas— duplicaba en pantalla lo que la tarjeta ya
   * mostraba, y encima le comía la altura al canvas (es `h-full` con su propio
   * scroll), dejando las tarjetas de abajo inalcanzables.
   */
  sectionBodies?: Record<string, React.ReactNode>;
}

/**
 * ContentCanvas Component
 * Single Responsibility: Manages section display modes (list vs expanded)
 * 
 * Two modes:
 * 1. List mode: Shows all sections as cards
 * 2. Expanded mode: Shows one section in full view
 */
export function ContentCanvas<T = any>({
  content,
  contentType,
  expandedSectionId,
  onSectionExpand,
  onSectionClose,
  onSectionViewHistory,
  onSectionUndo,
  onSectionRedo,
  canUndo,
  canRedo,
  getSectionVersions,
  openHistoryFor,
  onSectionOpenHistory,
  getCurrentVersionId,
  onRestoreVersion,
  modifiedSections = new Set(),
  onSectionUpdate,
  onRegenerate,
  sectionBodies,
}: ContentCanvasProps<T>) {
  const sections: SectionConfig[] = getSectionsForType(contentType);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set(sections.filter((x) => x.collapsedByDefault).map((x) => x.id)),
  );

  // 🎯 Initialize readonly sections as collapsed
  useEffect(() => {
    const readonlySections = sections
      .filter(s => s.readonly)
      .map(s => s.id);
    
    if (readonlySections.length > 0) {
      setCollapsedSections(new Set(readonlySections));
    }
  }, [contentType]); // Re-run when content type changes

  const toggleCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Expanded mode: Show single section
  if (expandedSectionId) {
    const section = sections.find(s => s.id === expandedSectionId);
    if (section) {
      const sectionContent = getValueByPath(content, section.path);
      const isModified = modifiedSections.has(section.id);

      return (
        <ExpandedSection
          section={section}
          content={sectionContent}
          onClose={onSectionClose}
          onViewHistory={
            onSectionViewHistory
              ? () => onSectionViewHistory(section.id)
              : undefined
          }
          onUndo={
            onSectionUndo
              ? () => onSectionUndo(section.id)
              : undefined
          }
          onRedo={
            onSectionRedo
              ? () => onSectionRedo(section.id)
              : undefined
          }
          canUndo={canUndo ? canUndo(section.id) : false}
          canRedo={canRedo ? canRedo(section.id) : false}
          versions={getSectionVersions ? getSectionVersions(section.id) : []}
          initialShowHistory={openHistoryFor === section.id}
          currentVersionId={getCurrentVersionId ? getCurrentVersionId(section.id) : undefined}
          onRestoreVersion={
            onRestoreVersion
              ? (versionId) => onRestoreVersion(section.id, versionId)
              : undefined
          }
          onSave={
            onSectionUpdate
              ? (newContent) => onSectionUpdate(section.id, newContent)
              : undefined
          }
          onRegenerate={
            onRegenerate
              ? (itemIndex) => onRegenerate(section.id, itemIndex)
              : undefined
          }
          isModified={isModified}
        />
      );
    }
  }

  // List mode: Show all sections
  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        {sections.map((section) => {
          const sectionContent = getValueByPath(content, section.path);
          const isModified = modifiedSections.has(section.id);
          const isCollapsed = collapsedSections.has(section.id);

          return (
            <SectionCard
              key={section.id}
              section={section}
              content={sectionContent}
              onExpand={() => onSectionExpand(section.id)}
              isModified={isModified}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleCollapse(section.id)}
              {...(sectionBodies?.[section.id] ? { customBody: sectionBodies[section.id] } : {})}
              versionCount={getSectionVersions ? getSectionVersions(section.id).length : 0}
              {...(onSectionOpenHistory ? { onOpenHistory: () => onSectionOpenHistory(section.id) } : {})}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
