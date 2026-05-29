import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Minus, Plus } from 'lucide-react';
import { LocalBibleService } from '@/services/LocalBibleService';
import { GreekOriginalRepository } from '@/data/repositories/bible/GreekOriginalRepository';
import { HebrewOriginalRepository } from '@/data/repositories/bible/HebrewOriginalRepository';
import { getCanonicalId } from '@/domain/bible/utils/BibleMetadata';

interface Props {
    passage: string;
}

const SBLGNT_FONT_KEY = 'sblgnt-panel-font-size';
const MIN_FONT = 14;
const MAX_FONT = 36;

interface ChapterRender {
    bookId: string;
    chapter: number;
    verses: { num: number; text: string }[];
    language: 'greek' | 'hebrew' | 'unknown';
}

/**
 * Read-only inline panel that renders the passage in its original
 * language (SBLGNT for NT, MorphHB for OT). Lives inside SyntaxStep —
 * the pastor reads the Greek/Hebrew alongside writing the main clause
 * note. No interactive syntax analyzer in this phase (deferred).
 *
 * Failure modes are silent: if the passage parses to an OT book and we
 * only have a Greek provider available (or vice versa), the component
 * renders an "no disponible" hint instead of an error toast.
 */
export function SblgntPassagePanel({ passage }: Props) {
    const [render, setRender] = useState<ChapterRender | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fontSize, setFontSize] = useState(() => {
        if (typeof window === 'undefined') return 18;
        const stored = Number(localStorage.getItem(SBLGNT_FONT_KEY));
        if (Number.isFinite(stored) && stored >= MIN_FONT && stored <= MAX_FONT) return stored;
        return 18;
    });

    useEffect(() => {
        try {
            localStorage.setItem(SBLGNT_FONT_KEY, String(fontSize));
        } catch {
            // ignore — localStorage may be disabled.
        }
    }, [fontSize]);

    useEffect(() => {
        let cancelled = false;
        const parsed = LocalBibleService.parseReference(passage);
        if (!parsed) {
            setRender(null);
            setError('No pudimos interpretar la referencia para mostrar el texto original.');
            return;
        }
        setLoading(true);
        setError(null);

        const repo = inferRepository(parsed.book);
        if (!repo) {
            setRender(null);
            setLoading(false);
            setError('Sin proveedor de idioma original para este libro todavía.');
            return;
        }
        const bookId = repo.normalizeBookId(parsed.book);
        if (!bookId) {
            setRender(null);
            setLoading(false);
            setError('Libro no reconocido en el corpus original.');
            return;
        }
        repo.instance.loadChapter(bookId, parsed.chapter)
            .then((verses) => {
                if (cancelled) return;
                if (!verses) {
                    setRender(null);
                    setError('No pudimos cargar el capítulo en idioma original.');
                    return;
                }
                // `verseStart === 0` is the parser's sentinel for "no
                // specific verse" — covers book-only ("Filemón") and
                // chapter-only ("Romanos 1") references. Render the
                // whole chapter in that case instead of slicing
                // `verses.slice(-1, 0)` (empty), which previously
                // showed the SBLGNT/MorphHB header with no content.
                const wholeChapter = parsed.verseStart === 0;
                const start = wholeChapter ? 1 : parsed.verseStart;
                const end = wholeChapter
                    ? verses.length
                    : (parsed.verseEnd ?? parsed.verseStart);
                const sliced = verses.slice(start - 1, end).map((text, i) => ({
                    num: start + i,
                    text,
                }));
                setRender({
                    bookId,
                    chapter: parsed.chapter,
                    verses: sliced,
                    language: repo.language,
                });
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('[SblgntPassagePanel]', err);
                setError('No pudimos cargar el texto original.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [passage]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando texto original…
            </div>
        );
    }
    if (error) {
        return <p className="text-xs text-muted-foreground italic">{error}</p>;
    }
    if (!render) return null;

    const langClass = render.language === 'greek' ? 'font-serif' : 'font-serif text-right';

    return (
        <div className="bg-muted/40 rounded-md overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/50">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {render.language === 'greek' ? 'SBLGNT' : 'MorphHB'} · {render.bookId} {render.chapter}
                </p>
                <div className="flex items-center bg-background rounded-md border shadow-sm h-7">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-6 rounded-r-none"
                        onClick={() => setFontSize((prev) => Math.max(MIN_FONT, prev - 2))}
                        disabled={fontSize <= MIN_FONT}
                        type="button"
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
                        className="h-7 w-6 rounded-l-none"
                        onClick={() => setFontSize((prev) => Math.min(MAX_FONT, prev + 2))}
                        disabled={fontSize >= MAX_FONT}
                        type="button"
                        title="Aumentar fuente"
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
            </div>
            <div
                className={`leading-loose p-4 ${langClass}`}
                style={{ fontSize: `${fontSize}px` }}
            >
                {render.verses.map((v) => (
                    <p key={v.num} className="mb-1">
                        <sup className="text-[0.55em] text-muted-foreground mr-1.5 font-sans tabular-nums">{v.num}</sup>
                        {v.text}
                    </p>
                ))}
            </div>
        </div>
    );
}

interface RepoSelection {
    instance: { loadChapter: (id: string, ch: number) => Promise<string[] | null> };
    normalizeBookId: (book: string) => string | null;
    language: 'greek' | 'hebrew';
}

/**
 * Spanish (RVR1960) book name → web canonical 3-letter id. Used when
 * the upstream parser already canonicalised to the Spanish form
 * instead of the RVR short key (e.g. "Juan" rather than "jo").
 *
 * Kept in sync with `RVR1960Repository.bookMapping` — extend both
 * when adding new aliases.
 */
const SPANISH_NAME_TO_CANONICAL: Record<string, string> = {
    // Pentateuco
    genesis: 'GEN', exodo: 'EXO', levitico: 'LEV', numeros: 'NUM', deuteronomio: 'DEU',
    // Históricos
    josue: 'JOS', jueces: 'JDG', rut: 'RUT',
    '1samuel': '1SA', '2samuel': '2SA', '1reyes': '1KI', '2reyes': '2KI',
    '1cronicas': '1CH', '2cronicas': '2CH',
    esdras: 'EZR', nehemias: 'NEH', ester: 'EST',
    // Sapienciales
    job: 'JOB', salmos: 'PSA', salmo: 'PSA', proverbios: 'PRO', eclesiastes: 'ECC', cantares: 'SON',
    // Profetas
    isaias: 'ISA', jeremias: 'JER', lamentaciones: 'LAM', ezequiel: 'EZE', daniel: 'DAN',
    oseas: 'HOS', joel: 'JOE', amos: 'AMO', abdias: 'OBA', jonas: 'JON', miqueas: 'MIC',
    nahum: 'NAH', habacuc: 'HAB', sofonias: 'ZEP', hageo: 'HAG', zacarias: 'ZEC', malaquias: 'MAL',
    // Evangelios + Hechos
    mateo: 'MAT', marcos: 'MAR', lucas: 'LUK', juan: 'JOH', hechos: 'ACT',
    // Paulinas
    romanos: 'ROM', '1corintios': '1CO', '2corintios': '2CO', galatas: 'GAL',
    efesios: 'EPH', filipenses: 'PHI', colosenses: 'COL',
    '1tesalonicenses': '1TH', '2tesalonicenses': '2TH', '1timoteo': '1TI', '2timoteo': '2TI',
    tito: 'TIT', filemon: 'PHM',
    // Generales + Apocalipsis
    hebreos: 'HEB', santiago: 'JAM', '1pedro': '1PE', '2pedro': '2PE',
    '1juan': '1JO', '2juan': '2JO', '3juan': '3JO', judas: 'JUD', apocalipsis: 'REV',
};

function stripAccents(input: string): string {
    return input.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function resolveCanonical(book: string): string | null {
    // Try every plausible interpretation of the input so we don't
    // care which layer of the bible stack handed it to us.
    const candidates: (string | undefined)[] = [];

    // (a) Already a 3-letter canonical id (e.g. "JOH", "ROM").
    candidates.push(book.toUpperCase().replace(/\s+/g, '').replace(/\./g, ''));

    // (b) RVR1960 short key (e.g. "jo", "rm", "1co").
    candidates.push(getCanonicalId(book, 'RVR1960'));

    // (c) Spanish name (e.g. "Juan", "1 Corintios"). Strip accents,
    // collapse spaces, lowercase — then look up in the static map.
    const normalised = stripAccents(book).toLowerCase().replace(/\s+/g, '');
    if (SPANISH_NAME_TO_CANONICAL[normalised]) {
        candidates.push(SPANISH_NAME_TO_CANONICAL[normalised]);
    }

    for (const c of candidates) {
        if (!c) continue;
        const upper = c.toUpperCase();
        // Only return ids that actually appear in the web canonical
        // catalog (3-letter ids). Guards against noise from the
        // fallback uppercase path.
        if (/^[1-3]?[A-Z]{2,3}$/.test(upper)) return upper;
    }
    return null;
}

function inferRepository(book: string): RepoSelection | null {
    const greek = new GreekOriginalRepository();
    const hebrew = new HebrewOriginalRepository();
    const canonical = resolveCanonical(book);
    if (!canonical) {
        console.warn('[SblgntPassagePanel] could not resolve book to canonical id', { book });
        return null;
    }
    if (greek.supportsBook(canonical)) {
        return {
            instance: greek,
            normalizeBookId: () => canonical,
            language: 'greek',
        };
    }
    if (hebrew.supportsBook(canonical)) {
        return {
            instance: hebrew,
            normalizeBookId: () => canonical,
            language: 'hebrew',
        };
    }
    console.warn('[SblgntPassagePanel] canonical id not supported by greek/hebrew providers', { book, canonical });
    return null;
}
