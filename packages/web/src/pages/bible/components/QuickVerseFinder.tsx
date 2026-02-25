import React, { useState } from 'react';
import { useBible } from '@/context/BibleContext';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export const QuickVerseFinder: React.FC<{ className?: string }> = ({ className }) => {
    const [query, setQuery] = useState('');
    const { books, versionId, setBook, setChapter, setTargetVerse } = useBible();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!query.trim()) return;

        const repo = BibleVersionFactory.getByVersion(versionId);
        const ref = repo.parseReference(query);

        if (ref) {
            // Find book name from ID
            const bookId = ref.book.toLowerCase();
            const foundBook = books.find(b => b.id.toLowerCase() === bookId);
            
            if (foundBook) {
                setBook(foundBook.id, foundBook.name);
                setChapter(ref.chapter);
                if (ref.verseStart) {
                    setTargetVerse(ref.verseStart);
                }
                setQuery('');
                toast.success(`Navegando a ${foundBook.name} ${ref.chapter}${ref.verseStart ? `:${ref.verseStart}` : ''}`);
            } else {
                 toast.error('Libro no encontrado en la base de datos');
            }
        } else {
            toast.error('Referencia no encontrada');
        }
    };

    return (
        <form onSubmit={handleSearch} className={`relative flex items-center ${className}`}>
            <Search className="absolute left-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input 
                type="text" 
                placeholder="Ir a... (ej: Jn 3:16)" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors w-40 focus:w-60"
            />
            {query && (
                <Button 
                    type="submit" 
                    size="icon" 
                    variant="ghost" 
                    className="absolute right-0.5 h-8 w-8 text-slate-400 hover:text-slate-600"
                >
                    <ArrowRight className="h-4 w-4" />
                </Button>
            )}
        </form>
    );
};
