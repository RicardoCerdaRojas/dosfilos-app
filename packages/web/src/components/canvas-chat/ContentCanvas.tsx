import { ContentType } from '@dosfilos/domain';
import { getSectionsForType, SectionConfig } from './section-configs';
import { SectionCard } from './SectionCard';
import { ExpandedSection } from './ExpandedSection';
import { getValueByPath } from '@/utils/path-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

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
  modifiedSections?: Set<string>;
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
  modifiedSections = new Set()
}: ContentCanvasProps<T>) {
  const sections = getSectionsForType(contentType);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

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
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
