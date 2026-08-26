import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SBLGNTBibleProvider } from '@dosfilos/infrastructure';
import { getBooksByTestament, type BibleBookId, type GreekVerseTokens } from '@dosfilos/domain';

export interface GreekVerseNavigation {
    books: { id: BibleBookId; nameEs: string; nameEn: string }[];
    chapters: number[];
    verses: number[];
}

/**
 * Estado y navegación del analizador griego.
 *
 * TODO ES DETERMINISTA: el provider baja el libro de MorphGNT una vez por
 * sesión y de ahí salen texto, tokens y navegación — ninguna llamada a modelo,
 * ninguna fuente aparte que pueda divergir del texto.
 */
export function useGreekVerse(initial: { book: BibleBookId; chapter: number; verse: number }) {
    // Un provider por montaje: su caché interna vive lo que la página.
    const providerRef = useRef<SBLGNTBibleProvider>();
    if (!providerRef.current) providerRef.current = new SBLGNTBibleProvider();
    const provider = providerRef.current;

    const [book, setBook] = useState<BibleBookId>(initial.book);
    const [chapter, setChapter] = useState(initial.chapter);
    const [verse, setVerse] = useState(initial.verse);
    const [nav, setNav] = useState<{ chapter: number; verses: number }[]>([]);
    const [data, setData] = useState<GreekVerseTokens | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const books = useMemo(
        () =>
            getBooksByTestament('NT')
                .filter((b) => provider.supports(b.id))
                .map((b) => ({ id: b.id, nameEs: b.nameEs, nameEn: b.nameEn })),
        [provider],
    );

    useEffect(() => {
        let vivo = true;
        setLoading(true);
        setError(null);
        (async () => {
            try {
                const navegacion = await provider.getNavigation(book);
                const tokens = await provider.getVerseTokens(book, chapter, verse);
                if (!vivo) return;
                setNav(navegacion);
                setData(tokens);
            } catch (e) {
                if (vivo) setError(e instanceof Error ? e.message : String(e));
            } finally {
                if (vivo) setLoading(false);
            }
        })();
        return () => {
            vivo = false;
        };
    }, [provider, book, chapter, verse]);

    const chapters = useMemo(() => nav.map((n) => n.chapter), [nav]);
    const versesInChapter = useMemo(
        () => nav.find((n) => n.chapter === chapter)?.verses ?? 0,
        [nav, chapter],
    );

    const goTo = useCallback((b: BibleBookId, c: number, v: number) => {
        setBook(b);
        setChapter(c);
        setVerse(v);
    }, []);

    /** Avanza o retrocede UN versículo, cruzando límites de capítulo. */
    const step = useCallback(
        (delta: 1 | -1) => {
            const idx = nav.findIndex((n) => n.chapter === chapter);
            const actual = nav[idx];
            if (!actual) return;
            const siguiente = nav[idx + delta];
            const next = verse + delta;
            if (next >= 1 && next <= actual.verses) {
                setVerse(next);
            } else if (siguiente) {
                setChapter(siguiente.chapter);
                setVerse(delta === 1 ? 1 : siguiente.verses);
            }
        },
        [nav, chapter, verse],
    );

    return { book, chapter, verse, books, chapters, versesInChapter, data, loading, error, goTo, step };
}
