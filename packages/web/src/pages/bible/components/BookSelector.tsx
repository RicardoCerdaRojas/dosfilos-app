import React, { useMemo } from 'react';
import { useBible } from '@/context/BibleContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getBookMetadata } from '@/domain/bible/utils/BibleMetadata';

export const BookSelector: React.FC<{ className?: string; onBookSelect?: () => void }> = ({ className, onBookSelect }) => {
    const { books, bookId, setBook, versionId } = useBible();

    const categorizedBooks = useMemo(() => {
        const groups: Record<string, Record<string, typeof books>> = {
            'Old': {},
            'New': {}
        };

        books.forEach(book => {
            const meta = getBookMetadata(book.id, versionId);
            if (!meta) return;
            
            let testamentGroup = groups[meta.testament];
            if (!testamentGroup) {
                testamentGroup = {};
                groups[meta.testament] = testamentGroup;
            }
            
            if (!testamentGroup[meta.category]) {
                testamentGroup[meta.category] = [];
            }
            testamentGroup[meta.category]?.push(book);
        });

        return groups;
    }, [books, versionId]);

    const categoryTranslations: Record<string, string> = {
        'Pentateuch': 'Pentateuco',
        'History': 'Históricos',
        'Poetry': 'Poéticos',
        'Major Prophets': 'Profetas Mayores',
        'Minor Prophets': 'Profetas Menores',
        'Gospels': 'Evangelios',
        'History (NT)': 'Históricos',
        'Pauline Epistles': 'Cartas Paulinas',
        'General Epistles': 'Cartas Generales',
        'Apocalyptic': 'Apocalíptico'
    };

    const renderTestament = (testament: string, label: string) => (
        <div key={testament} className="mb-8">
            <h4 className="px-3 mb-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                {label}
            </h4>
            {Object.entries(categorizedBooks[testament] || {}).map(([category, categoryBooks]) => (
                <div key={category} className="mb-6">
                    <h5 className="px-3 mb-2 text-[10px] font-medium text-slate-400/80 uppercase tracking-wider">
                        {categoryTranslations[category] || category}
                    </h5>
                    <div className="space-y-1">
                        {categoryBooks.map(book => (
                            <Button
                                key={book.id}
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start font-normal h-9 text-sm px-3 relative transition-all duration-200",
                                    bookId === book.id 
                                        ? "bg-slate-900 text-white font-medium" 
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                                )}
                                onClick={() => {
                                    setBook(book.id, book.name);
                                    onBookSelect?.();
                                }}
                            >
                                {bookId === book.id && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-white rounded-r-full" />
                                )}
                                {book.name}
                            </Button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className={cn("flex flex-col h-full bg-slate-50 border-r", className)}>
            <ScrollArea className="flex-1 h-full">
                <div className="p-3">
                    {renderTestament('Old', 'Antiguo Testamento')}
                    {renderTestament('New', 'Nuevo Testamento')}
                </div>
            </ScrollArea>
        </div>
    );
};
