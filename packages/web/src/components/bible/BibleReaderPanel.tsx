import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';
import { LocalBibleService } from '@/services/LocalBibleService';

interface BibleReaderPanelProps {
    passage: string;
    onClose: () => void;
}

export function BibleReaderPanel({ passage, onClose }: BibleReaderPanelProps) {
    // Navigation State
    const [currentBook, setCurrentBook] = useState<string>('');
    const [currentChapter, setCurrentChapter] = useState<number>(1);
    
    // Content State
    const [verses, setVerses] = useState<string[]>([]);
    
    // UI State
    const [fontSize, setFontSize] = useState(18);
    const [isLoading, setIsLoading] = useState(false);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{reference: string, text: string}[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Initial Load - Parse passage to set book and chapter
    useEffect(() => {
        if (passage) {
            const ref = LocalBibleService.parseReference(passage);
            if (ref) {
                 const books = LocalBibleService.getBooks();
                 // Try to match by name (case insensitive) or ID
                 const normalizedRefBook = ref.book.toLowerCase();
                 const matchedBook = books.find(b => 
                    b.name.toLowerCase() === normalizedRefBook || 
                    b.id === normalizedRefBook
                 );
                 
                if (matchedBook) {
                    setCurrentBook(matchedBook.id);
                } else {
                     // Fallback: if we can't find it, maybe it's using an abbreviation?
                     // We rely on parseReference usually returning a valid mapped name if possible,
                     // but parseReference returns the *key* in the map (e.g. 'Juan'). 
                     // Our getBooks returns names based on the map keys too. 
                     // So matching name should work most of the time.
                     if (books.length > 0) setCurrentBook(books[0].id);
                }
                setCurrentChapter(ref.chapter || 1);
            }
        }
    }, [passage]);

    // Fetch Content when Book/Chapter changes
    useEffect(() => {
        if (!currentBook) return;
        
        setIsLoading(true);
        try {
            const content = LocalBibleService.getChapterContent(currentBook, currentChapter);
            setVerses(content || []);
        } catch (error) {
            console.error(error);
            setVerses([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentBook, currentChapter]);

    // Derived Data
    const books = useMemo(() => LocalBibleService.getBooks(), []);
    const chapterCount = useMemo(() => currentBook ? LocalBibleService.getChapterCount(currentBook) : 0, [currentBook]);
    const chapters = useMemo(() => Array.from({ length: chapterCount }, (_, i) => i + 1), [chapterCount]);

    // Handlers
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        // Simulate small delay for UX
        setTimeout(() => {
            const results = LocalBibleService.search(searchQuery);
            setSearchResults(results);
            setIsSearching(false);
        }, 300);
    };

    const handleNavigateResult = (refString: string) => {
        const ref = LocalBibleService.parseReference(refString);
        if (ref) {
             const bookList = LocalBibleService.getBooks();
             const matchedBook = bookList.find(b => b.name === ref.book);
             if (matchedBook) {
                 setCurrentBook(matchedBook.id);
                 setCurrentChapter(ref.chapter);
                 setIsSearchOpen(false);
             }
        }
    };

    // Helper to get formatted book name
    const currentBookName = books.find(b => b.id === currentBook)?.name || currentBook;

    return (
        <Card className="h-full flex flex-col overflow-hidden bg-background border-none shadow-none">
            {/* Header Toolbar */}
            <div className="h-12 flex items-center gap-2 px-2 border-b bg-muted/30 pr-12 flex-shrink-0 relative">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClose}
                    className="gap-2 text-muted-foreground hover:text-foreground h-8 px-2 -ml-1"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Asistente
                </Button>

                <div className="h-4 w-[1px] bg-border mx-1" />

                <Select value={currentBook} onValueChange={setCurrentBook}>
                    <SelectTrigger className="h-8 text-xs font-medium w-[130px] border-none bg-background shadow-sm focus:ring-0">
                        <SelectValue placeholder="Libro" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                        {books.map(b => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">
                                {b.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={currentChapter.toString()} onValueChange={v => setCurrentChapter(parseInt(v))}>
                    <SelectTrigger className="h-8 text-xs font-medium w-[65px] border-none bg-background shadow-sm focus:ring-0">
                        <SelectValue placeholder="Cap." />
                    </SelectTrigger>
                    <SelectContent className="max-h-80 min-w-[3rem]">
                        {chapters.map(c => (
                            <SelectItem key={c} value={c.toString()} className="text-xs">
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                <div className="flex-1" />

                {/* Search */}
                <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Search className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end" sideOffset={5}>
                        <form onSubmit={handleSearch} className="p-2 border-b flex gap-2">
                            <Input 
                                placeholder="Buscar versículo..." 
                                className="h-8 text-xs border-none bg-muted/50 focus-visible:ring-0"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <Button type="submit" size="sm" variant="ghost" className="h-8 px-2" disabled={isSearching}>
                                {isSearching ? <Loader2 className="h-3 w-3 animate-spin"/> : <Search className="h-3 w-3" />}
                            </Button>
                        </form>
                        <ScrollArea className="h-64">
                            {searchResults.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                    {searchQuery ? "Sin resultados" : "Escribe para buscar"}
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {searchResults.map((res, i) => (
                                        <button 
                                            key={i}
                                            className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                                            onClick={() => handleNavigateResult(res.reference)}
                                        >
                                            <div className="font-medium text-xs text-primary mb-1">{res.reference}</div>
                                            <div className="text-xs text-muted-foreground line-clamp-2">{res.text}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </PopoverContent>
                </Popover>

                {/* Font Size */}
                <div className="flex items-center bg-background rounded-md border shadow-sm h-8">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-r-none px-0"
                        onClick={() => setFontSize(prev => Math.max(14, prev - 2))}
                        disabled={fontSize <= 14}
                    >
                        <span className="text-xs font-semibold">A-</span>
                    </Button>
                    <div className="h-4 w-[1px] bg-border" />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-l-none px-0"
                        onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                        disabled={fontSize >= 32}
                    >
                        <span className="text-sm font-semibold">A+</span>
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 relative">
                <ScrollArea className="h-full w-full bg-amber-50/30 dark:bg-stone-950/30">
                    <div className="p-6 md:p-8 max-w-3xl mx-auto min-h-full">
                        <div className="mb-8 text-center space-y-2">
                            <h2 className="text-3xl font-bold text-foreground font-serif tracking-tight">
                                {currentBookName} {currentChapter}
                            </h2>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">Reina Valera 1960</p>
                        </div>

                        {isLoading ? (
                            <div className="space-y-4 animate-pulse max-w-2xl mx-auto">
                                <div className="h-4 bg-muted/50 rounded w-full"></div>
                                <div className="h-4 bg-muted/50 rounded w-11/12"></div>
                                <div className="h-4 bg-muted/50 rounded w-full"></div>
                                <div className="h-4 bg-muted/50 rounded w-3/4"></div>
                            </div>
                        ) : (
                            <div 
                                className="font-serif leading-loose text-foreground/90 transition-all duration-200"
                                style={{ fontSize: `${fontSize}px` }}
                            >
                                {verses.map((text, i) => (
                                    <span key={i} className="relative inline">
                                        <sup className="text-[0.6em] text-muted-foreground/60 font-sans mr-1 select-none font-medium">{i + 1}</sup>
                                        <span className="hover:bg-primary/5 rounded px-0.5 transition-colors cursor-text decoration-primary/20">
                                            {text}{' '}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Navigation Footer */}
                        <div className="mt-16 pt-8 border-t flex justify-between text-muted-foreground">
                            <Button 
                                variant="ghost" 
                                disabled={currentChapter <= 1}
                                onClick={() => setCurrentChapter(prev => prev - 1)}
                                className="gap-2 hover:bg-background hover:text-primary"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Cap. Anterior
                            </Button>
                            <Button 
                                variant="ghost" 
                                disabled={currentChapter >= chapterCount}
                                onClick={() => setCurrentChapter(prev => prev + 1)}
                                className="gap-2 hover:bg-background hover:text-primary"
                            >
                                Cap. Siguiente
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </Card>
    );
}
