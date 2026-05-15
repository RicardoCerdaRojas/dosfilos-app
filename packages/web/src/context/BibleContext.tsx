import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from '@/i18n';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';

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
    /**
     * Verse number currently visible in the primary reader's mid-viewport.
     * The secondary reader watches this to scroll its matching verse into
     * view (verse-level parallel sync). Updates as the user scrolls.
     */
    activeVerse: number | null;
}

interface BibleContextType extends BibleState {
    setVersion: (versionId: string) => void;
    setSecondaryVersion: (versionId: string | null) => void;
    toggleParallelMode: () => void;
    setBook: (bookId: string, bookName: string) => void;
    setChapter: (chapter: number) => void;
    setTargetVerse: (verse: number | null) => void;
    setActiveVerse: (verse: number | null) => void;
    nextChapter: () => void;
    prevChapter: () => void;
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    searchBible: (query: string) => Promise<{ reference: string; text: string }[]>;
}

const BibleContext = createContext<BibleContextType | undefined>(undefined);

const STORAGE_KEY = 'dosfilos.bible.prefs';

interface PersistedPrefs {
    versionId?: string;
    secondaryVersionId?: string | null;
    isParallelMode?: boolean;
    fontSize?: number;
}

/**
 * Resolves the initial primary version. Order of precedence:
 *   1. Persisted user preference (localStorage).
 *   2. UI locale ('en' → ASV, anything else → RVR1960).
 *   3. Hard fallback to RVR1960.
 */
function resolveInitialVersion(locale: string): string {
    if (typeof window !== 'undefined') {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as PersistedPrefs;
                if (parsed.versionId) return parsed.versionId;
            }
        } catch {
            // Ignore corrupted localStorage; fall through to locale logic.
        }
    }
    return locale.startsWith('en') ? 'ASV' : 'RVR1960';
}

function readPersistedPrefs(): PersistedPrefs {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as PersistedPrefs) : {};
    } catch {
        return {};
    }
}

function writePersistedPrefs(prefs: PersistedPrefs) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        // localStorage may be unavailable (private mode etc); fail silently.
    }
}

export const BibleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { i18n } = useTranslation();
    const initialLocale = i18n.language ?? 'es';
    const initialPrefs = readPersistedPrefs();

    const [versionId, setVersionId] = useState(() => resolveInitialVersion(initialLocale));
    const [secondaryVersionId, setSecondaryVersionIdState] = useState<string | null>(
        initialPrefs.secondaryVersionId ?? null,
    );
    const [isParallelMode, setIsParallelMode] = useState(initialPrefs.isParallelMode ?? false);
    const [bookId, setBookId] = useState('GEN');
    const [bookName, setBookName] = useState('Génesis');
    const [chapter, setChapterState] = useState(1);
    const [fontSize, setFontSize] = useState(initialPrefs.fontSize ?? 18);
    const [targetVerse, setTargetVerse] = useState<number | null>(null);
    const [activeVerse, setActiveVerse] = useState<number | null>(null);

    // Books for the current primary version.
    const [books, setBooks] = useState<{ id: string; name: string; chapters: number }[]>([]);

    useEffect(() => {
        const repository = BibleVersionFactory.getByVersion(versionId);
        setBooks(repository.getBooks());
    }, [versionId]);

    // Persist prefs whenever they change. We don't persist book/chapter
    // because navigation is part of the reading session, not a setting.
    useEffect(() => {
        writePersistedPrefs({
            versionId,
            secondaryVersionId,
            isParallelMode,
            fontSize,
        });
    }, [versionId, secondaryVersionId, isParallelMode, fontSize]);

    const setVersion = (id: string) => setVersionId(id);
    const setSecondaryVersion = (id: string | null) => setSecondaryVersionIdState(id);

    const toggleParallelMode = () => {
        setIsParallelMode((prev) => {
            const nextMode = !prev;
            // When enabling parallel and no secondary picked yet, auto-pair
            // with whichever version isn't currently primary. Picks the
            // first registered version that's different from primary.
            if (nextMode && !secondaryVersionId) {
                const all = BibleVersionFactory.getAllVersions();
                const candidate = all.find((v) => v.id !== versionId)?.id ?? null;
                setSecondaryVersionIdState(candidate);
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
            setChapterState((c) => c + 1);
        }
    };

    const prevChapter = () => {
        if (chapter > 1) {
            setChapterState((c) => c - 1);
        }
    };

    const increaseFontSize = () => setFontSize((s) => Math.min(s + 4, 32));
    const decreaseFontSize = () => setFontSize((s) => Math.max(s - 4, 12));

    const searchBible = async (query: string) => {
        const repo = BibleVersionFactory.getByVersion(versionId);
        return repo.search(query);
    };

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
        activeVerse,
        setVersion,
        setSecondaryVersion,
        toggleParallelMode,
        setBook,
        setChapter,
        setTargetVerse,
        setActiveVerse,
        nextChapter,
        prevChapter,
        increaseFontSize,
        decreaseFontSize,
        searchBible,
    };

    return <BibleContext.Provider value={value}>{children}</BibleContext.Provider>;
};

export const useBible = () => {
    const context = useContext(BibleContext);
    if (context === undefined) {
        throw new Error('useBible must be used within a BibleProvider');
    }
    return context;
};
