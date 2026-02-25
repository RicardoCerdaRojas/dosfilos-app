import React, { useState, useMemo } from 'react';
import { BookSelector } from './BookSelector';
import { ChapterSelector } from './ChapterSelector';
import { VerseSelector } from './VerseSelector';
import { Button } from '@/components/ui/button';
import { ChevronLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBible } from '@/context/BibleContext';

interface NavigationDrawerProps {
    className?: string;
    onClose: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ className, onClose }) => {
    const [view, setView] = useState<'books' | 'chapters' | 'verses'>('books');
    const { bookName, chapter, setTargetVerse } = useBible();

    const headerTitle = useMemo(() => {
        if (view === 'books') return 'Libros';
        if (view === 'chapters') return bookName;
        return `${bookName} ${chapter}`;
    }, [view, bookName, chapter]);

    const handleBack = () => {
        if (view === 'verses') setView('chapters');
        else if (view === 'chapters') setView('books');
    };

    const handleVerseSelect = (verse: number) => {
        setTargetVerse(verse);
        onClose();
        // Fallback: reset view for next time
        setTimeout(() => setView('books'), 300);
    };

    return (
        <div className={cn("flex flex-col h-full bg-white shadow-2xl z-50", className)}>
             <div className="h-14 border-b flex items-center justify-between bg-white px-4 shrink-0">
                <div className="flex items-center gap-2">
                    {view !== 'books' && (
                        <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 -ml-2">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <h3 className="font-semibold text-slate-800">
                        {headerTitle}
                    </h3>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="h-5 w-5" />
                </Button>
            </div>
            
            <div className="flex-1 overflow-hidden relative bg-slate-50">
                 {view === 'books' && (
                     <BookSelector 
                        className="w-full h-full border-none"
                        onBookSelect={() => setView('chapters')}
                     />
                 )}
                 {view === 'chapters' && (
                     <ChapterSelector 
                        className="w-full h-full border-none"
                        onClose={() => setView('verses')} // Change behavior to go to verses
                     />
                 )}
                 {view === 'verses' && (
                     <VerseSelector 
                        className="w-full h-full border-none"
                        onClose={onClose}
                        onVerseSelect={handleVerseSelect}
                        onBack={() => setView('chapters')}
                     />
                 )}
            </div>
        </div>
    );
};
