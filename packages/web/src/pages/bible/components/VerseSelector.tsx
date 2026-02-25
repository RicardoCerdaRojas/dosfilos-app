import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, X } from 'lucide-react';
import { useBible } from '@/context/BibleContext';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';

interface VerseSelectorProps {
    className?: string;
    onVerseSelect: (verse: number) => void;
    onBack?: () => void;
    onClose: () => void;
}

export const VerseSelector: React.FC<VerseSelectorProps> = ({ 
    className, 
    onVerseSelect, 
    onBack,
    onClose 
}) => {
    const { versionId, bookId, chapter } = useBible();

    const versesCount = useMemo(() => {
        const repo = BibleVersionFactory.getByVersion(versionId);
        return repo.getVerseCount(bookId, chapter);
    }, [versionId, bookId, chapter]);

    const verses = Array.from({ length: versesCount }, (_, i) => i + 1);

    return (
        <div className={className}>
             <div className="h-14 border-b flex items-center justify-between bg-white px-4 shrink-0">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 -ml-2">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <h3 className="font-semibold text-slate-800">
                        Capítulo {chapter}
                    </h3>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="h-5 w-5" />
                </Button>
            </div>

            <ScrollArea className="flex-1 h-[calc(100%-3.5rem)]">
                <div className="p-4 grid grid-cols-5 gap-3">
                    {verses.map(v => (
                        <Button
                            key={v}
                            variant="outline"
                            className="aspect-square h-auto flex items-center justify-center text-lg font-bible hover:bg-slate-200 hover:text-slate-900 transition-colors"
                            onClick={() => onVerseSelect(v)}
                        >
                            {v}
                        </Button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};
