import React, { useState } from 'react';
import { useBible } from '@/context/BibleContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, X, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SearchSidebarProps {
    className?: string;
    onClose?: () => void;
}

export const SearchSidebar: React.FC<SearchSidebarProps> = ({ className, onClose }) => {
    const { searchBible } = useBible();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ reference: string; text: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setSearched(true);
        try {
            const data = await searchBible(query);
            setResults(data);
        } catch (error) {
            console.error("Search failed", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleResultClick = (reference: string) => {
        // Parse reference "Genesis 1:1" -> book "GEN", chapter 1
        // This is a bit naive, ideally we get structured data from search
        // But for now let's try to parse the string or use the same parser logic
        // Actually BaseJSONRepository.search returns "Book Name Chapter:Verse"
        // We might need a better way to navigate. 
        // For MVP: simple parsing logic or just pass raw ref if we had a navigation method by ref.
        // We have setBookId and setChapter.
        
        // Let's implement a simple parser for "Book Name C:V"
        // We can use regex.
        const match = reference.match(/^(.+)\s(\d+):(\d+)$/);
        if (match) {
            // const [, bookName, chapterNum] = match;
            // Ideally we need to map bookName back to ID.
            // But setBookId expects ID (e.g. GEN).
            // We might need a helper or map.
            // For now, let's assume we can't easily jump without book ID mapping 
            // from the display name returned by search.
            // Wait, BaseJSONRepository search returns reference string constructed from book.name.
            // AND book.name comes from bookMapping keys usually or defaults.
            // This is a limitation of the current search implementation in BaseJSONRepository.
            
            // FIXME: Enhanced search should return bookId.
            // For now, we unfortunately can't reliably jump without bookId. 
            // I'll leave the click handler empty or log it for this step.
            console.log("Navigating to", reference);
        }
    };

    return (
        <div className={cn("flex flex-col h-full bg-slate-50 border-l", className)}>
            <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Búsqueda</h2>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            
            <div className="p-4 border-b">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <Input 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        placeholder="Buscar..." 
                        className="bg-white"
                    />
                    <Button type="submit" size="icon" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </form>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {searched && results.length === 0 && !loading && (
                        <p className="text-center text-slate-500 text-sm">No se encontraron resultados.</p>
                    )}
                    {results.map((result, i) => (
                        <div 
                            key={i} 
                            className="bg-white p-3 rounded-md border text-sm hover:border-slate-300 transition-colors group relative"
                            onClick={() => handleResultClick(result.reference)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-semibold text-blue-600">{result.reference}</div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // El asset traía el literal `/n` y esta era la
                                        // única superficie que lo limpiaba; el resto de la
                                        // app lo mostraba tal cual. Ahora el dato viene con
                                        // saltos reales, así que sólo queda recortar.
                                        const cleanText = result.text.trim();
                                        navigator.clipboard.writeText(`${cleanText}\n\n${result.reference} - RVR1960`);
                                        toast.success('Pasaje copiado');
                                    }}
                                    title="Copiar pasaje"
                                >
                                    <Copy className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                                </Button>
                            </div>
                            <div className="text-slate-700 leading-relaxed">
                                {result.text.split(/\/n/).map((segment, index) => (
                                    <React.Fragment key={index}>
                                        {segment.trim()}
                                        {index < result.text.split(/\/n/).length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};
