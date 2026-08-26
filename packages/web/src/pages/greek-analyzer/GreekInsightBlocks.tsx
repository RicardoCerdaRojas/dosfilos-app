import { ArrowLeftRight, Loader2, Sparkles, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { GREEK_INSIGHT_PROMPT_VERSION, type GreekVerseInsight } from '@dosfilos/domain';

interface Props {
    insight: GreekVerseInsight | null;
    generating: boolean;
    error: string | null;
    onGenerate: () => void;
}

/**
 * El aporte del modelo en la vista de versículo: las dos traducciones, las
 * CLAVES EXEGÉTICAS (el "¿y qué?" homilético de las 2-3 palabras que cargan
 * el peso teológico) y, sin análisis aún, la invitación a generarlo — pull
 * con caché global, nunca auto.
 */
export function GreekInsightBlocks({ insight, generating, error, onGenerate }: Props) {
    const { t } = useTranslation('greekTutor');

    if (!insight) {
        return (
            <div className="rounded-lg border border-dashed border-border p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{t('analyzer.insightPitch')}</p>
                <Button size="sm" onClick={onGenerate} disabled={generating}>
                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {generating ? t('analyzer.generating') : t('analyzer.generateInsight')}
                </Button>
                {error && <p className="w-full text-xs text-destructive">{t('analyzer.insightError')}</p>}
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4 space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('analyzer.literalTranslation')}
                        {/* La literal CALCA el orden griego: compararla con la
                            fluida ES ver el reordenamiento. Decirlo convierte
                            dos cajas en una lección. */}
                        <span className="ml-1 normal-case font-normal tracking-normal">
                            {t('analyzer.literalHint')}
                        </span>
                    </h4>
                    <p className="text-sm leading-relaxed">{insight.literalTranslation}</p>
                </div>
                <div className="rounded-lg border border-border p-4 space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('analyzer.fluidTranslation')}
                    </h4>
                    <p className="text-sm leading-relaxed">{insight.fluidTranslation}</p>
                </div>
            </div>

            {/* EL ORDEN DE LAS PALABRAS: la regla general es fija — el griego
                marca la función con CASOS y usa el orden para el énfasis; el
                español depende del orden y reordena. El ejemplo concreto lo
                pone el modelo con las palabras de ESTE versículo. */}
            {insight.wordOrderNote && (
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1.5">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        {t('analyzer.wordOrderTitle')}
                    </h4>
                    <p className="text-xs text-muted-foreground">{t('analyzer.wordOrderRule')}</p>
                    <p className="text-sm leading-relaxed">{insight.wordOrderNote}</p>
                </div>
            )}

            {/* CACHÉ DE VERSIÓN ANTERIOR: ofrecer ampliar SIEMPRE que la
                versión no sea la actual — adivinar por campos falló: el
                fundador tenía claves (v2) y ningún botón para traer el orden
                de palabras (v3). */}
            {insight.promptVersion !== GREEK_INSIGHT_PROMPT_VERSION && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-2">
                    <p className="text-xs text-muted-foreground">{t('analyzer.expandPitch')}</p>
                    <Button variant="ghost" size="sm" onClick={onGenerate} disabled={generating}>
                        {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {t('analyzer.expandBtn')}
                    </Button>
                </div>
            )}

            {/* EL "¿Y QUÉ?": las 2-3 palabras que cargan el peso teológico,
                con su consecuencia homilética — del dato a lo que se predica. */}
            {insight.keyInsights?.length ? (
                <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                        <Star className="h-3.5 w-3.5" />
                        {t('analyzer.keyInsightsTitle')}
                    </h4>
                    {insight.keyInsights.map((k) => (
                        <div key={k.text} className="text-sm leading-relaxed">
                            <span className="font-semibold" lang="grc">{k.text}</span>
                            {' — '}
                            {k.significance}
                        </div>
                    ))}
                </div>
            ) : null}
        </>
    );
}
