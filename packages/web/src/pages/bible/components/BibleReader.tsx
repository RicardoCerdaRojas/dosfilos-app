import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useBible } from '@/context/BibleContext';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';
import { BibleVerse } from '@/domain/bible/entities/BibleEntities';
import { getCanonicalId, getVersionSpecificId } from '@/domain/bible/utils/BibleMetadata';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';

interface LoadedChapter {
    id: string; // unique key: "GEN-1"
    bookId: string;
    chapter: number;
    verses: BibleVerse[];
}

export const BibleReader: React.FC<{ className?: string, versionId?: string }> = ({ className, versionId: propVersionId }) => {
    const { 
        versionId: contextVersionId, 
        bookId, 
        chapter, 
        setBook, 
        setChapter, 
        fontSize, 
        targetVerse, 
        setTargetVerse,
        books 
    } = useBible();
    
    const versionId = propVersionId || contextVersionId;
    const [chaptersData, setChaptersData] = useState<LoadedChapter[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Refs to manage internal state updates without triggering re-fetches
    const lastInternalUpdate = useRef<{ bookId: string, chapter: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isInitialLoad = useRef(true);

    // Helper to fetch a specific chapter. The incoming bId is in the
    // PRIMARY version's id convention (since BibleContext tracks the
    // primary's bookId). When this reader is rendering a SECONDARY
    // version (parallel mode), translate primary→canonical→secondary
    // before asking the secondary repo for content. This is what makes
    // RVR (uses 'gn') and ASV (uses '1') stay in sync visually.
    const fetchChapterData = useCallback((bId: string, cNum: number): LoadedChapter | null => {
        try {
            const repo = BibleVersionFactory.getByVersion(versionId);

            // First try direct resolution (works when the caller already
            // passed an id this repo understands).
            let resolvedBookId = repo.resolveBookId(bId);

            // Cross-version: translate the primary's id to the secondary
            // via the canonical 3-letter id.
            if (!resolvedBookId && versionId !== contextVersionId) {
                const canonical = getCanonicalId(bId, contextVersionId);
                const secondarySpecific = getVersionSpecificId(canonical, versionId);
                resolvedBookId = repo.resolveBookId(secondarySpecific) || secondarySpecific;
            }

            // Last-ditch: maybe the id IS canonical (set programmatically
            // before any nav happened). Translate canonical → version.
            if (!resolvedBookId) {
                const asCanonical = bId.toUpperCase();
                const guess = getVersionSpecificId(asCanonical, versionId);
                resolvedBookId = repo.resolveBookId(guess) || guess;
            }

            const content = repo.getChapterContent(resolvedBookId, cNum);
            if (!content) return null;

            return {
                id: `${resolvedBookId}-${cNum}`,
                bookId: resolvedBookId,
                chapter: cNum,
                verses: content.map((text, index) => ({
                    book: resolvedBookId,
                    chapter: cNum,
                    verse: index + 1,
                    text: text
                }))
            };
        } catch (error) {
            console.error(`Failed to fetch chapter ${bId} ${cNum}`, error);
            return null;
        }
    }, [versionId, contextVersionId]);

    // Initial Load & External Navigation Handler
    useEffect(() => {
        // If the update matches our last internal update (scroll spy), ignore it to prevent reset
        if (
            lastInternalUpdate.current && 
            lastInternalUpdate.current.bookId === bookId && 
            lastInternalUpdate.current.chapter === chapter
        ) {
            return;
        }

        const loadInitialChapter = () => {
             setLoading(true);
             const data = fetchChapterData(bookId, chapter);
             if (data) {
                 setChaptersData([data]);
                 setTimeout(() => {
                     // Scroll to top or specific verse logic handled by the separate effect
                     if (!targetVerse && containerRef.current) {
                         containerRef.current.scrollTop = 0;
                     }
                 }, 0);
             } else {
                 setChaptersData([]);
             }
             setLoading(false);
             isInitialLoad.current = false;
        };

        loadInitialChapter();
    }, [bookId, chapter, fetchChapterData, targetVerse]);


    // Next/Prev Chapter Logic
    const loadNextChapter = useCallback(() => {
        if (loading) return;
        
        const lastChapter = chaptersData[chaptersData.length - 1];
        if (!lastChapter) return;

        const repo = BibleVersionFactory.getByVersion(versionId);
        const chapterCount = repo.getChapterCount(lastChapter.bookId);

        let nextBookId = lastChapter.bookId;
        let nextChapterNum = lastChapter.chapter + 1;

        if (nextChapterNum > chapterCount) {
             // Move to next book
             const currentBookIndex = books.findIndex(b => b.id === lastChapter.bookId);
             if (currentBookIndex < books.length - 1) {
                 nextBookId = books[currentBookIndex + 1].id;
                 nextChapterNum = 1;
             } else {
                 return; // End of Bible
             }
        }

        const newData = fetchChapterData(nextBookId, nextChapterNum);
        if (newData) {
            setChaptersData(prev => [...prev, newData]);
        }
    }, [chaptersData, loading, books, versionId, fetchChapterData]);

    const loadPrevChapter = useCallback(() => {
        if (loading) return;

        const firstChapter = chaptersData[0];
        if (!firstChapter) return;

        let prevBookId = firstChapter.bookId;
        let prevChapterNum = firstChapter.chapter - 1;

        if (prevChapterNum < 1) {
            // Move to prev book
            const currentBookIndex = books.findIndex(b => b.id === firstChapter.bookId);
            if (currentBookIndex > 0) {
                prevBookId = books[currentBookIndex - 1].id;
                const repo = BibleVersionFactory.getByVersion(versionId);
                prevChapterNum = repo.getChapterCount(prevBookId);
            } else {
               return; // Start of Bible
            }
        }

        // Implementation Detail: Prepending content maintains scroll position relative to the viewport
        // but since we are inserting DOM elements above, the current content is pushed down.
        // We need to adjust scroll position to keep the user visually in the same place.
        // For MVP, we might accept a small jump or use useLayoutEffect to adjust.
        // Let's rely on standard behavior first.
        
        const newData = fetchChapterData(prevBookId, prevChapterNum);
        if (newData) {
             const currentScrollHeight = containerRef.current?.scrollHeight || 0;
             setChaptersData(prev => [newData, ...prev]);
             
             // Restore scroll position
             requestAnimationFrame(() => {
                 if (containerRef.current) {
                      const newScrollHeight = containerRef.current.scrollHeight;
                      const diff = newScrollHeight - currentScrollHeight;
                      containerRef.current.scrollTop += diff;
                 }
             });
        }

    }, [chaptersData, loading, books, versionId, fetchChapterData]);


    // Intersection Observer for Infinite Scroll Loading
    // Using simple divs at top/bottom as sentinels
    const [bottomRef, bottomInView] = useInView({ threshold: 0.1 });
    const [topRef, topInView] = useInView({ threshold: 0.1 });

    useEffect(() => {
        if (bottomInView) loadNextChapter();
    }, [bottomInView, loadNextChapter]);

    useEffect(() => {
        if (topInView) loadPrevChapter();
    }, [topInView, loadPrevChapter]);


    // Scroll Spy Logic (Update Context)
    useEffect(() => {
        const handleScroll = () => {
             if (!containerRef.current) return;
             
             // Find whichever chapter occupies the middle of the screen
             const containerRect = containerRef.current.getBoundingClientRect();
             const midPoint = containerRect.top + containerRect.height / 2;
             
             const chapterElements = containerRef.current.querySelectorAll('[data-chapter-id]');
             
             for (const el of chapterElements) {
                  const rect = el.getBoundingClientRect();
                  if (rect.top <= midPoint && rect.bottom >= midPoint) {
                       const [bId, cNumStr] = (el.getAttribute('data-chapter-id') || '').split('|');
                       const cNum = parseInt(cNumStr);
                       
                       if (bId && cNum && (bId !== bookId || cNum !== chapter)) {
                            // Update Context
                            lastInternalUpdate.current = { bookId: bId, chapter: cNum };
                            
                            // Find book name
                            const bookObj = books.find(b => b.id.toLowerCase() === bId.toLowerCase());
                            setBook(bookObj?.id || bId, bookObj?.name || bId); 
                            setChapter(cNum);
                       }
                       break;
                  }
             }
        };

        const container = containerRef.current;
        if (container) {
             container.addEventListener('scroll', handleScroll, { passive: true });
             return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [bookId, chapter, books, setBook, setChapter]);


    // Handle scroll to verse (Initial & Navigation)
    useEffect(() => {
         if (!loading && targetVerse && chaptersData.length > 0) {
             // Find target verse element
             // We need to ensure the chapter containing the verse is loaded. 
             // With current logic, if we navigate to a specific verse, 
             // the initial load effect will load that chapter, so it should be there.
             
             // Wait for render
             setTimeout(() => {
                 const elementId = `${bookId}-${chapter}-${targetVerse}`;
                 const element = document.getElementById(elementId);
                 
                 if (element) {
                     element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                     element.classList.add('bg-yellow-100');
                     setTimeout(() => element.classList.remove('bg-yellow-100'), 2000);
                     setTargetVerse(null);
                 }
             }, 100);
         }
    }, [loading, targetVerse, chaptersData, bookId, chapter, setTargetVerse]);


    if (loading && chaptersData.length === 0) {
         return (
             <div className="flex items-center justify-center h-full text-slate-400">
                 <Loader2 className="h-8 w-8 animate-spin" />
             </div>
         );
    }
    
    // Fallback if no data
    if (chaptersData.length === 0) return null;


    return (
        <div ref={containerRef} className={cn("flex-1 overflow-y-auto bg-[#FDFBF7]", className)}>
            <div className="max-w-3xl mx-auto p-8 pb-32 min-h-full">
                {/* Top Sentinel */}
                <div ref={topRef} className="h-10 w-full" />

                <div className="space-y-12">
                    {chaptersData.map((chap) => (
                        <div 
                             key={chap.id} 
                             data-chapter-id={`${chap.bookId}|${chap.chapter}`}
                             className="chapter-block"
                        >
                            {/* Chapter Header (Optional/Visual separator) */}
                            {chaptersData.length > 1 && (
                                <div className="text-center mb-6 mt-2">
                                     <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                                          {books.find(b => b.id === chap.bookId)?.name} {chap.chapter}
                                     </span>
                                </div>
                            )}

                            <div className="space-y-4">
                                {chap.verses.map((verse) => (
                                    <span 
                                        key={`${verse.book}-${verse.chapter}-${verse.verse}`} 
                                        id={`${verse.book}-${verse.chapter}-${verse.verse}`}
                                        className="inline leading-relaxed text-[#2D3748] font-bible cursor-pointer hover:bg-yellow-100/50 transition-colors rounded px-0.5 relative group"
                                        title="Click to copy"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${verse.text} (${verse.book} ${verse.chapter}:${verse.verse})`);
                                            toast.success("Versículo copiado");
                                        }}
                                        style={{ fontSize: `${fontSize}px` }}
                                    >
                                        <sup className="text-[10px] font-medium text-slate-400 mr-1 select-none opacity-60">
                                            {verse.verse}
                                        </sup>
                                        {verse.text}{" "}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Sentinel */}
                <div ref={bottomRef} className="h-20 w-full flex items-center justify-center text-slate-300 text-sm">
                     {/* Optional loading indicator or end marker */}
                </div>
            </div>
        </div>
    );
};

