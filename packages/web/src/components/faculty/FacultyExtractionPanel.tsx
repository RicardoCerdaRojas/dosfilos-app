import React from 'react';
import { Download, BookOpen, Briefcase, MessageSquareQuote, Newspaper, FileText, PenLine, Sunrise, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface ExtractionButton {
    type: string;
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

interface FacultyExtractionPanelProps {
    isOpen: boolean;
    extractingType: string | null;
    messageCount: number;
    onExtract: (type: string) => void;
}

export function FacultyExtractionPanel({
    isOpen,
    extractingType,
    messageCount,
    onExtract,
}: FacultyExtractionPanelProps) {
    const { t } = useTranslation('faculty');

    return (
        <aside className={cn(
            "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hidden lg:flex flex-col shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out",
            isOpen ? "w-[28rem] border-l opacity-100" : "w-0 border-l-0 opacity-0 overflow-hidden"
        )}>
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800/50 flex flex-col gap-1 w-[28rem]">
                <h3 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <Download className="w-4 h-4 text-indigo-500" />
                    {t('extraction.title')}
                </h3>
                <p className="text-xs text-muted-foreground">{t('extraction.description')}</p>
            </div>

            <div className="flex-1 overflow-y-auto sidebar-scrollbar p-4 grid grid-cols-2 gap-2.5 content-start">
                {EXTRACTION_BUTTONS.map(({ type, icon: Icon, iconColor, labelKey, descKey }) => (
                    <Button
                        key={type}
                        variant="outline"
                        onClick={() => onExtract(type)}
                        disabled={!!extractingType || messageCount < 2}
                        className="w-full justify-start h-auto p-3 flex flex-col items-start gap-1 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    >
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100 text-sm">
                            {extractingType === type
                                ? <Loader2 className={cn("w-4 h-4 animate-spin shrink-0", iconColor)} />
                                : <Icon className={cn("w-4 h-4 shrink-0", iconColor)} />
                            }
                            <span className="truncate">{t(labelKey)}</span>
                        </div>
                        <span className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 font-normal text-left whitespace-normal line-clamp-2">{t(descKey)}</span>
                    </Button>
                ))}
            </div>
        </aside>
    );
}
