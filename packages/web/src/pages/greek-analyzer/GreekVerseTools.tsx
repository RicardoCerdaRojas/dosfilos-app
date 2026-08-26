import { AArrowDown, AArrowUp, Copy, Printer, RefreshCw, Loader2, Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type GreekFontScale = 0 | 1 | 2;

interface Props {
    fontScale: GreekFontScale;
    onFontScale: (s: GreekFontScale) => void;
    showTranslit: boolean;
    onToggleTranslit: () => void;
    /** Texto griego del versículo, para copiar. */
    greekText: string;
    /** Transliteración corrida, para copiar. */
    translitText: string;
    /** Regenerar el análisis (sobreescribe el caché — mejora para todos). */
    onReanalyze?: () => void;
    reanalyzing?: boolean;
}

/**
 * Las herramientas de la banda del versículo — la estación de trabajo que la
 * banda hebrea ya tiene y a la del griego le faltaba: tamaño de letra, copiar
 * griego / transliteración, re-analizar e imprimir. Y una pedagógica propia:
 * OCULTAR la transliteración — la muleta se suelta a voluntad, que es como se
 * aprende a leer el alfabeto de verdad.
 */
export function GreekVerseTools({
    fontScale,
    onFontScale,
    showTranslit,
    onToggleTranslit,
    greekText,
    translitText,
    onReanalyze,
    reanalyzing,
}: Props) {
    const { t } = useTranslation('greekTutor');
    const [copiado, setCopiado] = useState<'greek' | 'translit' | null>(null);

    const copiar = (que: 'greek' | 'translit') => {
        void navigator.clipboard.writeText(que === 'greek' ? greekText : translitText).then(() => {
            setCopiado(que);
            setTimeout(() => setCopiado(null), 1500);
        });
    };

    const chip =
        'inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors';

    return (
        <div className="flex flex-wrap items-center gap-1.5 print:hidden">
            <button
                type="button"
                onClick={onToggleTranslit}
                className={cn(chip, showTranslit && 'text-foreground bg-muted/60')}
                title={t('analyzer.tools.translitToggle')}
            >
                {t('analyzer.tools.translit')}
            </button>

            <span className="inline-flex items-center rounded-md border border-border/60 bg-background">
                <button
                    type="button"
                    onClick={() => onFontScale(Math.max(0, fontScale - 1) as GreekFontScale)}
                    disabled={fontScale === 0}
                    className="px-1.5 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    aria-label={t('analyzer.tools.smaller')}
                >
                    <AArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => onFontScale(Math.min(2, fontScale + 1) as GreekFontScale)}
                    disabled={fontScale === 2}
                    className="px-1.5 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40 border-l border-border/60"
                    aria-label={t('analyzer.tools.larger')}
                >
                    <AArrowUp className="h-3.5 w-3.5" />
                </button>
            </span>

            <button type="button" onClick={() => copiar('greek')} className={chip}>
                {copiado === 'greek' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                {t('analyzer.tools.copyGreek')}
            </button>
            <button type="button" onClick={() => copiar('translit')} className={chip}>
                {copiado === 'translit' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                {t('analyzer.tools.copyTranslit')}
            </button>

            {onReanalyze && (
                <button
                    type="button"
                    onClick={onReanalyze}
                    disabled={reanalyzing}
                    className={chip}
                    title={t('analyzer.tools.reanalyzeHint')}
                >
                    {reanalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    {t('analyzer.tools.reanalyze')}
                </button>
            )}

            <button type="button" onClick={() => window.print()} className={chip}>
                <Printer className="h-3 w-3" />
                {t('analyzer.tools.print')}
            </button>
        </div>
    );
}
