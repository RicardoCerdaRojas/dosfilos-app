import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';
// Note: We'll likely need hook-based persistence later, for now using standard state

interface BibleState {
    versionId: string;
    secondaryVersionId: string | null;
    isParallelMode: boolean;
    bookId: string;
    bookName: string;
    chapter: number;
    fontSize: number;
    books: { id: string; name: string; chapters: number }[];
    targetVerse: number | null;
}

interface BibleContextType extends BibleState {
    setVersion: (versionId: string) => void;
    setSecondaryVersion: (versionId: string | null) => void;
    toggleParallelMode: () => void;
    setBook: (bookId: string, bookName: string) => void;
    setChapter: (chapter: number) => void;
    setTargetVerse: (verse: number | null) => void;
    nextChapter: () => void;
    prevChapter: () => void;
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    searchBible: (query: string) => Promise<{ reference: string; text: string }[]>;
}

const BibleContext = createContext<BibleContextType | undefined>(undefined);

export const BibleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // State
    const [versionId, setVersionId] = useState('RVR1960');
    const [secondaryVersionId, setSecondaryVersionIdState] = useState<string | null>(null);
    const [isParallelMode, setIsParallelMode] = useState(false);
    const [bookId, setBookId] = useState('GEN');
    const [bookName, setBookName] = useState('Génesis');
    const [chapter, setChapterState] = useState(1);
    const [fontSize, setFontSize] = useState(18); // Default web font size

    // Data
    const [books, setBooks] = useState<{ id: string; name: string; chapters: number }[]>([]);

    useEffect(() => {
        const repository = BibleVersionFactory.getByVersion(versionId);
        setBooks(repository.getBooks());
    }, [versionId]);

    const setVersion = (id: string) => setVersionId(id);

    const setSecondaryVersion = (id: string | null) => setSecondaryVersionIdState(id);

    const toggleParallelMode = () => {
        setIsParallelMode(prev => {
            const nextMode = !prev;
            // Auto-select secondary if enabling and none selected
            if (nextMode && !secondaryVersionId) {
                setSecondaryVersionIdState(versionId === 'RVR1960' ? 'ASV' : 'RVR1960');
            }
            return nextMode;
        });
    };

    const setBook = (id: string, name: string) => {
        setBookId(id);
        setBookName(name);
        setChapterState(1);
    };

    const setChapter = (num: number) => setChapterState(num);

    const nextChapter = () => {
        const repository = BibleVersionFactory.getByVersion(versionId);
        const bookChapters = repository.getChapterCount(bookId);

        if (chapter < bookChapters) {
            setChapterState(c => c + 1);
        } else {
            // Logic to go to next book could be added here
        }
    };

    const prevChapter = () => {
        if (chapter > 1) {
            setChapterState(c => c - 1);
        } else {
             // Logic to go to prev book could be added here
        }
    };

    const increaseFontSize = () => setFontSize(s => Math.min(s + 4, 32));
    const decreaseFontSize = () => setFontSize(s => Math.max(s - 4, 12));

    const searchBible = async (query: string) => {
        const repo = BibleVersionFactory.getByVersion(versionId);
        return repo.search(query);
    };

    const [targetVerse, setTargetVerse] = useState<number | null>(null);

    const value: BibleContextType = {
        versionId,
        secondaryVersionId,
        isParallelMode,
        bookId,
        bookName,
        chapter,
        fontSize,
        books,
        targetVerse,
        setVersion,
        setSecondaryVersion,
        toggleParallelMode,
        setBook,
        setChapter,
        setTargetVerse,
        nextChapter,
        prevChapter,
        increaseFontSize,
        decreaseFontSize,
        searchBible
    };

    return (
        <BibleContext.Provider value={value}>
            {children}
        </BibleContext.Provider>
    );
};

export const useBible = () => {
    const context = useContext(BibleContext);
    if (context === undefined) {
        throw new Error('useBible must be used within a BibleProvider');
    }
    return context;
};
