import type { GreekKeyInsight, GreekVerseInsight, GreekVerseTokens } from '@dosfilos/domain';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { GreekWordHoverContent } from './GreekWordHoverContent';
import { GreekVerseTools, type GreekFontScale } from './GreekVerseTools';

interface Props {
    title: string;
    data: GreekVerseTokens;
    insight: GreekVerseInsight | null;
    claveDe: (texto: string) => GreekKeyInsight | undefined;
    lemmaCounts: Record<string, number>;
    bookName: string;
    fontScale: GreekFontScale;
    onFontScale: (s: GreekFontScale) => void;
    showTranslit: boolean;
    onToggleTranslit: () => void;
    onReanalyze?: () => void;
    reanalyzing?: boolean;
    seleccion: number | null;
    onSeleccion: (i: number | null) => void;
}

const FUENTE: Record<GreekFontScale, string> = { 0: 'text-2xl', 1: 'text-3xl', 2: 'text-4xl' };

/**
 * La banda del versículo: título + herramientas + las palabras griegas con su
 * transliteración (a voluntad) y el popover completo por palabra. Extraída de
 * la página para que ésta se quede en orquestar.
 */
export function GreekVerseBoard({
    title,
    data,
    insight,
    claveDe,
    lemmaCounts,
    bookName,
    fontScale,
    onFontScale,
    showTranslit,
    onToggleTranslit,
    onReanalyze,
    reanalyzing,
    seleccion,
    onSeleccion,
}: Props) {
    return (
        <div className="rounded-lg border border-border bg-primary/[0.03] p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">{title}</span>
                <GreekVerseTools
                    fontScale={fontScale}
                    onFontScale={onFontScale}
                    showTranslit={showTranslit}
                    onToggleTranslit={onToggleTranslit}
                    greekText={data.text}
                    translitText={data.tokens.map((tk) => tk.transliteration).join(' ')}
                    onReanalyze={onReanalyze}
                    reanalyzing={reanalyzing}
                />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-5" lang="grc">
                {data.tokens.map((tok, i) => (
                    <Tooltip key={i} delayDuration={200}>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => onSeleccion(seleccion === i ? null : i)}
                                className={cn(
                                    'group flex flex-col items-center rounded px-1.5 py-1 transition-colors hover:bg-primary/10',
                                    seleccion === i && 'bg-primary/10 ring-1 ring-primary/40',
                                )}
                            >
                                <span className={cn('leading-tight', FUENTE[fontScale])}>{tok.text}</span>
                                {showTranslit && (
                                    <span className="text-[11px] text-muted-foreground italic" lang="en">
                                        {tok.transliteration}
                                    </span>
                                )}
                            </button>
                        </TooltipTrigger>
                        {/* Mismo patrón que el hebreo: tooltip con contenido
                            rico, fondo de tarjeta. */}
                        <TooltipContent className="bg-card text-card-foreground border border-border shadow-lg">
                            <GreekWordHoverContent
                                token={tok}
                                insight={insight?.words[i]}
                                keyInsight={claveDe(tok.text)}
                                bookCount={lemmaCounts[tok.lemma]}
                                bookName={bookName}
                            />
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </div>
    );
}
