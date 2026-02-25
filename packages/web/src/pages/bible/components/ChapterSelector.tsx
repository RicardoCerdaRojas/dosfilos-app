import React from 'react';
import { useBible } from '@/context/BibleContext';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChapterSelectorProps {
    className?: string;
    onClose?: () => void;
}

export const ChapterSelector: React.FC<ChapterSelectorProps> = ({ className, onClose }) => {
    const { bookId, chapter, setChapter, versionId } = useBible();

    const chapterCount = React.useMemo(() => {
        const repo = BibleVersionFactory.getByVersion(versionId);
        return repo.getChapterCount(bookId);
    }, [bookId, versionId]);

    const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

    return (
        <div className={cn("flex flex-col h-full bg-slate-50 border-l", className)}>
            <ScrollArea className="flex-1 h-full">
                <div className="p-4">
                    <div className="grid grid-cols-5 gap-3">
                        {chapters.map((c) => (
                            <Button
                                key={c}
                                variant="ghost"
                                className={cn(
                                    "h-12 w-full p-0 font-bible text-lg transition-all duration-200",
                                    chapter === c 
                                        ? "bg-slate-900 text-white hover:bg-slate-800 shadow-md scale-105" 
                                        : "bg-white text-slate-600 border border-slate-100 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 hover:shadow-sm"
                                )}
                                onClick={() => {
                                    setChapter(c);
                                    onClose?.();
                                }}
                            >
                                {c}
                            </Button>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};
