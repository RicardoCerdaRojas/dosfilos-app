import { segmentGreekWord, type GreekKeyInsight, type GreekMorphLayer, type GreekVerseInsight, type GreekVerseTokens, type GreekWordToken } from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { GreekWordHoverContent } from './GreekWordHoverContent';
import { GreekVerseTools, type GreekColorMode, type GreekFontScale } from './GreekVerseTools';

interface Props {
    colorMode: GreekColorMode;
    onColorMode: (m: GreekColorMode) => void;
    title: string;
    data: GreekVerseTokens;
    insight: GreekVerseInsight | null;
    claveDe: (texto: string) => GreekKeyInsight | undefined;
    relacionesDe: (i: number) => { type: string; note: string; otherText: string }[];
    casoDelTermino: (i: number) => string | undefined;
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

/** Capa 1: color de la palabra ENTERA por su categoría. */
const POS_COLOR: Record<GreekWordToken['pos'], string> = {
    V: 'text-primary',
    N: 'text-info',
    A: 'text-warning',
    RA: 'text-muted-foreground',
    RP: 'text-success',
    RR: 'text-success',
    RD: 'text-success',
    RI: 'text-success',
    // FALTABAN LAS PALABRAS DE ENLACE, y son las que articulan el argumento:
    // καί, ἵνα y ἐν quedaban del color base, indistinguibles de "sin
    // clasificar" — el fundador las marcó en su captura. Una capa de
    // categorías que deja fuera una categoría no es una capa: es un descuido
    // con leyenda.
    C: 'text-destructive',
    P: 'text-accent-foreground',
    D: 'text-foreground/70',
    X: 'text-destructive/70',
    I: 'text-destructive/70',
};

/** Capa 2: color del MORFEMA según su función. La raíz queda en el color base. */
const LAYER_COLOR: Record<GreekMorphLayer, string> = {
    stem: '',
    caseEnding: 'text-info',
    tenseMarker: 'text-warning',
    moodMarker: 'text-success',
    augment: 'text-primary',
};

const LEYENDA: Record<Exclude<GreekColorMode, 'off'>, { key: string; className: string }[]> = {
    pos: [
        { key: 'legendVerb', className: 'bg-primary' },
        { key: 'legendNoun', className: 'bg-info' },
        { key: 'legendAdj', className: 'bg-warning' },
        { key: 'legendPron', className: 'bg-success' },
        { key: 'legendArticle', className: 'bg-muted-foreground' },
        { key: 'legendConj', className: 'bg-destructive' },
        { key: 'legendPrep', className: 'bg-accent-foreground' },
        { key: 'legendAdv', className: 'bg-foreground/70' },
    ],
    morph: [
        { key: 'legendCase', className: 'bg-info' },
        { key: 'legendTense', className: 'bg-warning' },
        { key: 'legendMood', className: 'bg-success' },
        { key: 'legendAugment', className: 'bg-primary' },
    ],
};

/**
 * La banda del versículo: título + herramientas + las palabras griegas con su
 * transliteración (a voluntad) y el popover completo por palabra. Extraída de
 * la página para que ésta se quede en orquestar.
 */
export function GreekVerseBoard({
    colorMode,
    onColorMode,
    title,
    data,
    insight,
    claveDe,
    relacionesDe,
    casoDelTermino,
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
    const { t } = useTranslation('greekTutor');

    /** La palabra según la capa activa. Sin capa: texto plano. */
    const pintar = (tok: GreekWordToken) => {
        if (colorMode === 'pos') {
            return <span className={POS_COLOR[tok.pos]}>{tok.text}</span>;
        }
        if (colorMode === 'morph') {
            // Honestidad heredada del segmentador: la palabra sin marca
            // confirmada queda entera en el color base.
            return segmentGreekWord(tok).map((seg, j) => (
                <span key={j} className={LAYER_COLOR[seg.layer]}>
                    {seg.text}
                </span>
            ));
        }
        return tok.text;
    };

    return (
        <div className="rounded-lg border border-border bg-primary/[0.03] p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">{title}</span>
                <GreekVerseTools
                    colorMode={colorMode}
                    onColorMode={onColorMode}
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
                                <span className={cn('leading-tight', FUENTE[fontScale])}>{pintar(tok)}</span>
                                {showTranslit && (
                                    <span className="text-[11px] text-muted-foreground italic" lang="en">
                                        {tok.transliteration}
                                    </span>
                                )}
                            </button>
                        </TooltipTrigger>
                        {/* Mismo patrón que el hebreo: tooltip con contenido
                            rico, fondo de tarjeta. */}
                        <TooltipContent
                            // `p-0` y `text-sm`: el tooltip base trae
                            // `px-3 py-1.5 text-xs` para etiquetas cortas y
                            // pelea con el encabezado fijo del contenido, que
                            // pone su propio espaciado por sección.
                            className="bg-card text-card-foreground border border-border shadow-xl rounded-lg p-0 text-sm max-w-none [&>svg]:bg-card [&>svg]:fill-card"
                            sideOffset={6}
                            // Con 40rem de ancho el popover llega a los bordes:
                            // Radix lo reubica solo, pero hay que decirle cuánto
                            // margen respetar.
                            collisionPadding={16}
                        >
                            <GreekWordHoverContent
                                token={tok}
                                insight={insight?.words[i]}
                                keyInsight={claveDe(tok.text)}
                                relations={relacionesDe(i)}
                                objectCase={casoDelTermino(i)}
                                bookCount={lemmaCounts[tok.lemma]}
                                bookName={bookName}
                            />
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>

            {/* SISTEMA DE COLORES — la leyenda del hebreo, para la capa activa. */}
            {colorMode !== 'off' && (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-3 print:hidden">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('analyzer.legend.title')}
                    </span>
                    {LEYENDA[colorMode].map(({ key, className }) => (
                        <span key={key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={cn('h-2 w-2 rounded-full', className)} />
                            {t(`analyzer.legend.${key}`)}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
