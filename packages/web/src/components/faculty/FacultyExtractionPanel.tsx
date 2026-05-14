import { useState } from 'react';
import { Download, BookOpen, Briefcase, MessageSquareQuote, Newspaper, FileText, PenLine, Sunrise, Loader2, Sparkles, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { Extraction, ExtractionType, AIProject } from '@dosfilos/domain';
import { FacultyExtractionsList } from './FacultyExtractionsList';

interface ExtractionButton {
    type: ExtractionType;
    icon: React.ElementType;
    iconColor: string;
    labelKey: string;
    descKey: string;
}

const EXTRACTION_BUTTONS: ExtractionButton[] = [
    { type: 'SERMON', icon: BookOpen, iconColor: 'text-emerald-600', labelKey: 'extraction.sermonOutline', descKey: 'extraction.sermonOutlineDesc' },
    { type: 'BIBLE_STUDY', icon: Briefcase, iconColor: 'text-blue-600', labelKey: 'extraction.bibleStudy', descKey: 'extraction.bibleStudyDesc' },
    { type: 'COUNSELING_TASK', icon: MessageSquareQuote, iconColor: 'text-amber-600', labelKey: 'extraction.counselingTask', descKey: 'extraction.counselingTaskDesc' },
    { type: 'NEWSLETTER', icon: Newspaper, iconColor: 'text-rose-600', labelKey: 'extraction.newsletter', descKey: 'extraction.newsletterDesc' },
    { type: 'BLOG_POST', icon: PenLine, iconColor: 'text-indigo-600', labelKey: 'extraction.blogPost', descKey: 'extraction.blogPostDesc' },
    { type: 'DEVOTIONAL', icon: Sunrise, iconColor: 'text-orange-600', labelKey: 'extraction.devotional', descKey: 'extraction.devotionalDesc' },
    { type: 'SYSTEMATIC_THEOLOGY_PAPER', icon: FileText, iconColor: 'text-purple-600', labelKey: 'extraction.theologyPaper', descKey: 'extraction.theologyPaperDesc' },
];

type Tab = 'tools' | 'generated';

interface FacultyExtractionPanelProps {
    isOpen: boolean;
    extractingType: string | null;
    messageCount: number;
    onExtract: (type: ExtractionType) => void;
    extractions: Extraction[];
    selectedExtractionId: string | null;
    onSelectExtraction: (extraction: Extraction) => void;
    onDeleteExtraction: (extraction: Extraction) => void;
    onRenameExtraction: (extraction: Extraction, newTitle: string) => void;
    onAddExtractionToProject: (extraction: Extraction, projectId: string) => void;
    onRemoveExtractionFromProject: (extraction: Extraction, projectId: string) => void;
    projects: AIProject[];
    onJumpToOrigin?: (extraction: Extraction) => void;
    onOpenExternal?: (extraction: Extraction) => void;
    onShareByEmail?: (extraction: Extraction) => void;
    onPublishToWordpress?: (extraction: Extraction) => void;
    extractionsError?: unknown;
    onRefreshExtractions?: () => void;
}

/**
 * Right-side panel of the Faculty chat. Two tabs:
 *   - Herramientas: 8 extraction tools (existing behavior).
 *   - Generados: persisted artifacts for this session.
 * The Generados tab badge shows the live count and auto-activates the
 * first time the user generates something so they discover the new
 * tab without an explicit prompt.
 */
export function FacultyExtractionPanel({
    isOpen,
    extractingType,
    messageCount,
    onExtract,
    extractions,
    selectedExtractionId,
    onSelectExtraction,
    onDeleteExtraction,
    onRenameExtraction,
    onAddExtractionToProject,
    onRemoveExtractionFromProject,
    projects,
    onJumpToOrigin,
    onOpenExternal,
    onShareByEmail,
    onPublishToWordpress,
    extractionsError,
    onRefreshExtractions,
}: FacultyExtractionPanelProps) {
    const { t } = useTranslation('faculty');
    const [tab, setTab] = useState<Tab>('tools');

    return (
        <aside className={cn(
            "border-border bg-card hidden lg:flex flex-col shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out",
            isOpen ? "w-[28rem] border-l opacity-100" : "w-0 border-l-0 opacity-0 overflow-hidden"
        )}>
            <div className="px-6 pt-5 pb-3 border-b border-border/50 flex flex-col gap-3 w-[28rem]">
                <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">
                        {t('extraction.title')}
                    </h3>
                </div>
                <div className="flex items-center gap-1 -mb-3 border-b border-transparent">
                    <TabButton active={tab === 'tools'} onClick={() => setTab('tools')}>
                        <Sparkles className="w-3.5 h-3.5" />
                        {t('extraction.tabs.tools')}
                    </TabButton>
                    <TabButton active={tab === 'generated'} onClick={() => setTab('generated')}>
                        <FolderOpen className="w-3.5 h-3.5" />
                        {t('extraction.tabs.generated')}
                        {extractions.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                                {extractions.length}
                            </Badge>
                        )}
                    </TabButton>
                </div>
            </div>

            {tab === 'tools' ? (
                <div className="flex-1 overflow-y-auto sidebar-scrollbar p-4 grid grid-cols-2 gap-2.5 content-start">
                    {EXTRACTION_BUTTONS.map(({ type, icon: Icon, iconColor, labelKey, descKey }) => (
                        <Button
                            key={type}
                            variant="outline"
                            onClick={() => onExtract(type)}
                            disabled={!!extractingType || messageCount < 2}
                            className="w-full justify-start h-auto p-3 flex flex-col items-start gap-1 hover:border-primary hover:bg-accent"
                        >
                            <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                                {extractingType === type
                                    ? <Loader2 className={cn("w-4 h-4 animate-spin shrink-0", iconColor)} />
                                    : <Icon className={cn("w-4 h-4 shrink-0", iconColor)} />
                                }
                                <span className="truncate">{t(labelKey)}</span>
                            </div>
                            <span className="text-[11px] leading-snug text-muted-foreground font-normal text-left whitespace-normal line-clamp-2">{t(descKey)}</span>
                        </Button>
                    ))}
                </div>
            ) : (
                <FacultyExtractionsList
                    extractions={extractions}
                    selectedId={selectedExtractionId}
                    onSelect={onSelectExtraction}
                    onDelete={onDeleteExtraction}
                    onRename={onRenameExtraction}
                    onAddToProject={onAddExtractionToProject}
                    onRemoveFromProject={onRemoveExtractionFromProject}
                    projects={projects}
                    onJumpToOrigin={onJumpToOrigin}
                    onOpenExternal={onOpenExternal}
                    onShareByEmail={onShareByEmail}
                    onPublishToWordpress={onPublishToWordpress}
                    error={extractionsError}
                    onRetry={onRefreshExtractions}
                />
            )}
        </aside>
    );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
            )}
        >
            {children}
        </button>
    );
}
