import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    Minus,
    PanelRightClose,
    Plus,
    Search,
    X,
} from 'lucide-react';
import { LocalBibleService } from '@/services/LocalBibleService';
import { cn } from '@/lib/utils';

interface BibleReaderPanelProps {
    /** Passage string used to auto-load + highlight on mount. */
    passage: string;
    /** Called when the user clicks the close affordance in the header. */
    onClose: () => void;
}

const FONT_SIZE_KEY = 'bible-reader-font-size';
const MIN_FONT = 14;
const MAX_FONT = 32;

/**
 * Sticky Bible reader used by the sermon wizard's right panel.
 *
 * Loads the passage automatically on mount, scrolls the chosen verse
 * into view, and highlights it so the pastor can find the passage at
 * a glance. Book + chapter dropdowns + search + font-size controls
 * live in a single toolbar; verses render verse-per-line for easier
 * scanning (vs the older inline-prose layout that buried the verse
 * numbers).
 *
 * Search navigation fix (2026-05-26): the previous handler matched
 * `b.name === ref.book` but `parseReference` returns the RVR key,
 * not the display name. Replaced with `resolveBookId` which honours
 * the repo's own mapping.
 */
export function BibleReaderPanel({ passage, onClose }: BibleReaderPanelProps) {
    const [currentBook, setCurrentBook] = useState<string>('');
    const [currentChapter, setCurrentChapter] = useState<number>(1);
    const [highlightVerse, setHighlightVerseInternal] = useState<{ start: number; end: number } | null>(null);
    const [verses, setVerses] = useState<string[]>([]);
    const [fontSize, setFontSize] = useState(() => {
        if (typeof window === 'undefined') return 18;
        const stored = Number(localStorage.getItem(FONT_SIZE_KEY));
        if (Number.isFinite(stored) && stored >= MIN_FONT && stored <= MAX_FONT) return stored;
        return 18;
    });
    const [isLoading, setIsLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ reference: string; text: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});

    // Resolve the passage prop into book/chapter/verse range on mount
    // + whenever the upstream passage string changes.
    useEffect(() => {
        if (!passage) return;
        const ref = LocalBibleService.parseReference(passage);
        if (!ref) return;
        const books = LocalBibleService.getBooks();
        const normalized = ref.book.toLowerCase();
        const matched = books.find((b) => b.id.toLowerCase() === normalized);
        if (matched) {
            setCurrentBook(matched.id);
        } else if (books.length > 0) {
            setCurrentBook(books[0].id);
        }
        setCurrentChapter(ref.chapter || 1);
        setHighlightVerseInternal({
            start: ref.verseStart || 1,
            end: ref.verseEnd ?? ref.verseStart ?? 1,
        });
    }, [passage]);

    // Fetch the chapter content when book / chapter changes.
    useEffect(() => {
        if (!currentBook) return;
        setIsLoading(true);
        try {
            const content = LocalBibleService.getChapterContent(currentBook, currentChapter);
            setVerses(content || []);
        } catch (error) {
            console.error('[BibleReaderPanel]', error);
            setVerses([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentBook, currentChapter]);

    // After verses render, scroll the highlighted verse into view so
    // the pastor lands exactly on the passage they're studying.
    useEffect(() => {
        if (!highlightVerse) return;
        if (isLoading) return;
        const target = verseRefs.current[highlightVerse.start];
        if (target) {
            target.scrollIntoView({ block: 'start', behavior: 'auto' });
        }
    }, [highlightVerse, verses, isLoading]);

    // Persist font size across sessions so the pastor's reading
    // preference survives a refresh + applies across all sermons.
    useEffect(() => {
        try {
            localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
        } catch {
            // localStorage may be disabled (incognito); silently no-op.
        }
    }, [fontSize]);

    const books = useMemo(() => LocalBibleService.getBooks(), []);
    const chapterCount = useMemo(
        () => (currentBook ? LocalBibleService.getChapterCount(currentBook) : 0),
        [currentBook],
    );
    const chapters = useMemo(
        () => Array.from({ length: chapterCount }, (_, i) => i + 1),
        [chapterCount],
    );
    const currentBookName = books.find((b) => b.id === currentBook)?.name || currentBook;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (q.length < 3) {
            setSearchResults([]);
            setHasSearched(true);
            return;
        }
        setIsSearching(true);
        setHasSearched(true);
        setTimeout(() => {
            const results = LocalBibleService.search(q);
            setSearchResults(results);
            setIsSearching(false);
        }, 150);
    };

    const handleNavigateResult = (refString: string) => {
        const ref = LocalBibleService.parseReference(refString);
        if (!ref) return;
        const bookList = LocalBibleService.getBooks();
        // Honour the parser's RVR-key output by matching against `id`
        // (lowercased) — the previous implementation matched against
        // `name` which never aligned with the parser's return shape.
        const matched = bookList.find((b) => b.id.toLowerCase() === ref.book.toLowerCase());
        if (!matched) return;
        setCurrentBook(matched.id);
        setCurrentChapter(ref.chapter);
        setHighlightVerseInternal({
            start: ref.verseStart || 1,
            end: ref.verseEnd ?? ref.verseStart ?? 1,
        });
        setIsSearchOpen(false);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setHasSearched(false);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            {/* Toolbar */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-muted/40 flex-shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1"
                    title="Ocultar Biblia"
                >
                    <PanelRightClose className="h-4 w-4" />
                    <span className="hidden md:inline text-xs">Ocultar</span>
                </Button>

                <div className="h-4 w-[1px] bg-border mx-0.5" />

                <Select value={currentBook} onValueChange={setCurrentBook}>
                    <SelectTrigger className="h-8 text-xs font-medium w-[120px] border bg-background shadow-sm focus:ring-0">
                        <SelectValue placeholder="Libro" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                        {books.map((b) => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">
                                {b.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={currentChapter.toString()}
                    onValueChange={(v) => {
                        setCurrentChapter(parseInt(v));
                        setHighlightVerseInternal(null);
                    }}
                >
                    <SelectTrigger className="h-8 text-xs font-medium w-[60px] border bg-background shadow-sm focus:ring-0">
                        <SelectValue placeholder="Cap." />
                    </SelectTrigger>
                    <SelectContent className="max-h-80 min-w-[3rem]">
                        {chapters.map((c) => (
                            <SelectItem key={c} value={c.toString()} className="text-xs">
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex-1" />

                <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Buscar"
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end" sideOffset={5}>
                        <form onSubmit={handleSearch} className="p-2 border-b flex gap-1.5">
                            <div className="relative flex-1">
                                <Input
                                    placeholder="Buscar texto bíblico…"
                                    className="h-8 text-xs pl-2 pr-7"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label="Limpiar"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                            <Button
                                type="submit"
                                size="sm"
                                variant="default"
                                className="h-8 px-2"
                                disabled={isSearching || searchQuery.trim().length < 3}
                            >
                                {isSearching ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Search className="h-3 w-3" />
                                )}
                            </Button>
                        </form>
                        <ScrollArea className="h-64">
                            {!hasSearched && (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                    Escribe ≥3 caracteres y presiona buscar.
                                </div>
                            )}
                            {hasSearched && searchResults.length === 0 && !isSearching && (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                    Sin resultados para "{searchQuery}".
                                </div>
                            )}
                            {searchResults.length > 0 && (
                                <div className="divide-y">
                                    {searchResults.map((res, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            className="w-full text-left p-2.5 hover:bg-muted/50 transition-colors"
                                            onClick={() => handleNavigateResult(res.reference)}
                                        >
                                            <div className="font-medium text-xs text-primary mb-0.5">
                                                {res.reference}
                                            </div>
                                            <div className="text-xs text-muted-foreground line-clamp-2">
                                                {res.text}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </PopoverContent>
                </Popover>

                {/* Font size controls */}
                <div className="flex items-center bg-background rounded-md border shadow-sm h-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-7 rounded-r-none"
                        onClick={() => setFontSize((prev) => Math.max(MIN_FONT, prev - 2))}
                        disabled={fontSize <= MIN_FONT}
                        title="Reducir fuente"
                    >
                        <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-[10px] font-mono px-1.5 text-muted-foreground tabular-nums">
                        {fontSize}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-7 rounded-l-none"
                        onClick={() => setFontSize((prev) => Math.min(MAX_FONT, prev + 2))}
                        disabled={fontSize >= MAX_FONT}
                        title="Aumentar fuente"
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="px-5 py-5 max-w-3xl mx-auto">
                    <div className="mb-5 text-center space-y-1">
                        <h2 className="text-2xl font-bold text-foreground font-serif tracking-tight">
                            {currentBookName} {currentChapter}
                        </h2>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.15em]">
                            Reina Valera 1960
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="space-y-3 animate-pulse max-w-2xl mx-auto">
                            <div className="h-3 bg-muted/50 rounded w-full" />
                            <div className="h-3 bg-muted/50 rounded w-11/12" />
                            <div className="h-3 bg-muted/50 rounded w-full" />
                            <div className="h-3 bg-muted/50 rounded w-3/4" />
                        </div>
                    ) : (
                        <div
                            className="font-serif leading-relaxed text-foreground/90 space-y-1"
                            style={{ fontSize: `${fontSize}px` }}
                        >
                            {verses.map((text, i) => {
                                const verseNum = i + 1;
                                const isHighlighted =
                                    highlightVerse &&
                                    verseNum >= highlightVerse.start &&
                                    verseNum <= highlightVerse.end;
                                return (
                                    <div
                                        key={i}
                                        ref={(el) => (verseRefs.current[verseNum] = el)}
                                        className={cn(
                                            'px-2 py-1 rounded transition-colors',
                                            isHighlighted &&
                                                'bg-primary/10 border-l-2 border-primary',
                                        )}
                                    >
                                        <sup className="text-[0.55em] text-muted-foreground font-sans mr-1.5 font-semibold select-none tabular-nums">
                                            {verseNum}
                                        </sup>
                                        <span>{text}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-10 pt-5 border-t flex justify-between text-muted-foreground">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={currentChapter <= 1}
                            onClick={() => {
                                setCurrentChapter((prev) => prev - 1);
                                setHighlightVerseInternal(null);
                            }}
                            className="gap-1 hover:bg-background hover:text-primary"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={currentChapter >= chapterCount}
                            onClick={() => {
                                setCurrentChapter((prev) => prev + 1);
                                setHighlightVerseInternal(null);
                            }}
                            className="gap-1 hover:bg-background hover:text-primary"
                        >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
