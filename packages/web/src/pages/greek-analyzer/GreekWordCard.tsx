import type { GreekWordInsight, GreekWordToken } from '@dosfilos/domain';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface Props {
    token: GreekWordToken;
    /** El aporte del modelo (fase 2): rango, función, traducción. Opcional. */
    insight?: GreekWordInsight;
    highlighted?: boolean;
    onClick?: () => void;
}

/** Color de la insignia por categoría — misma paleta semántica del hebreo. */
const POS_BADGE: Record<string, string> = {
    V: 'bg-primary/10 text-primary',
    N: 'bg-info/10 text-info',
    A: 'bg-warning/10 text-warning',
    RA: 'bg-muted text-muted-foreground',
    RP: 'bg-muted text-muted-foreground',
    RR: 'bg-muted text-muted-foreground',
    RD: 'bg-muted text-muted-foreground',
    RI: 'bg-muted text-muted-foreground',
};

/**
 * Una palabra griega con su morfología de MorphGNT — el espejo de la
 * `WordCard` del hebreo, con la gramática del griego (caso/tiempo/voz/modo
 * en vez de binyan/forma/estado).
 *
 * TODO EL CONTENIDO ES DETERMINISTA: viene del dataset, no de un modelo. Las
 * celdas ausentes no se muestran — un rótulo sobre un guion no informa nada.
 */
export function GreekWordCard({ token, insight, highlighted, onClick }: Props) {
    const { t } = useTranslation('greekTutor');
    const { tag } = token;

    const celdas: { labelKey: string; value: string }[] = [];
    const celda = (labelKey: string, dim: string, code?: string) => {
        if (code) celdas.push({ labelKey, value: t(`analyzer.${dim}.${code}`) });
    };
    celda('analyzer.fields.tense', 'tense', tag.tense);
    celda('analyzer.fields.voice', 'voice', tag.voice);
    celda('analyzer.fields.mood', 'mood', tag.mood);
    if (tag.person) celdas.push({ labelKey: 'analyzer.fields.person', value: tag.person });
    celda('analyzer.fields.case', 'case', tag.case);
    celda('analyzer.fields.number', 'number', tag.number);
    celda('analyzer.fields.gender', 'gender', tag.gender);
    celda('analyzer.fields.degree', 'degree', tag.degree);

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'text-left rounded-lg border border-border bg-card p-4 space-y-3 transition-colors',
                onClick && 'hover:border-primary/40',
                highlighted && 'border-primary ring-1 ring-primary/30',
            )}
        >
            <div className="flex items-center gap-2">
                <span
                    className={cn(
                        'rounded px-1.5 py-0.5 text-[11px] leading-none font-medium',
                        POS_BADGE[token.pos] ?? 'bg-muted text-muted-foreground',
                    )}
                >
                    {t(`analyzer.pos.${token.pos}`)}
                </span>
            </div>

            <div className="flex items-baseline justify-between gap-3">
                <div>
                    <div className="text-2xl leading-tight" lang="grc">
                        {token.text}
                    </div>
                    <div className="text-xs text-muted-foreground italic">{token.transliteration}</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t('analyzer.fields.lemma')}
                    </div>
                    <div className="text-sm font-medium" lang="grc">
                        {token.lemma}
                    </div>
                </div>
            </div>

            {insight && (
                <div className="text-sm font-medium text-primary">{insight.translation}</div>
            )}

            {celdas.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                    {celdas.map((c) => (
                        <div key={c.labelKey} className="rounded border border-border/60 px-2 py-1.5">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {t(c.labelKey)}
                            </div>
                            <div className="text-sm">{c.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {insight && (
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                    <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {t('analyzer.fields.semanticRange')}
                        </div>
                        <div className="text-sm">{insight.semanticRange}</div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {t('analyzer.fields.syntacticFunction')}
                        </div>
                        <div className="text-sm">{insight.syntacticFunction}</div>
                    </div>
                </div>
            )}
        </button>
    );
}
