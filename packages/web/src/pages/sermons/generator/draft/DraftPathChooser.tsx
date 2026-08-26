import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/canvas-chat/MarkdownRenderer';
import { useTranslation } from '@/i18n';

interface Props {
    /**
     * Contexto pastoral (opcional): la ilustración y las notas del pastor que
     * ALIMENTAN LOS DOS CAMINOS. Vive acá, antes de elegir, porque después ya
     * no habría dónde: es material de entrada, no una sección del sermón.
     */
    personalization?: React.ReactNode;
    proposition: string;
    pointTitles: readonly string[];
    /**
     * Entrar al taller. AUSENTE cuando el taller no está disponible (flag
     * apagado): entonces no hay dos caminos y no se ofrece una puerta que no
     * existe — queda el único camino, a ancho completo.
     */
    onEnterWorkshop?: () => void;
    /** Escribir el sermón completo de una vez. */
    onGenerate: () => void;
    generating: boolean;
}

/**
 * La pantalla que ELIGE CAMINO, y no hace nada más.
 *
 * Antes esta pantalla incrustaba el taller completo debajo del selector: el
 * mismo taller que ya vive en su pestaña, pero aplastado en media pantalla,
 * sin la banda del paso y sin sus acciones. El fundador lo cortó — "no lo veo
 * posible por espacio" — y el problema no era el espacio: el taller estaba
 * MONTADO EN DOS LUGARES con affordances distintas, el patrón que ya nos costó
 * el encabezado que desaparecía y la botonera que se perdía al cambiar de
 * pestaña.
 *
 * Ahora es una compuerta: se elige, y se entra a la pantalla de trabajo real.
 * Las dos tarjetas describen su camino CON LAS MISMAS PALABRAS —qué hace el
 * pastor, qué hace el asistente— porque la decisión es de quién decide las
 * ideas, no de qué botón es más grande.
 */
export function DraftPathChooser({
    personalization,
    proposition,
    pointTitles,
    onEnterWorkshop,
    onGenerate,
    generating,
}: Props) {
    const { t } = useTranslation('generator');

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-8">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold">{t('drafting.title')}</h2>
                    <p className="text-muted-foreground">{t('drafting.subtitle')}</p>
                </div>

                {/* EL MATERIAL DEL QUE PARTEN LOS DOS. Va como referencia y no
                    como tarjeta protagonista: acá no se decide nada sobre él,
                    sólo se confirma que llegó hasta este paso. */}
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('drafting.homileticalProposition')}
                    </h3>
                    <div className="text-sm font-medium italic">
                        <MarkdownRenderer content={proposition} />
                    </div>
                    {pointTitles.length > 0 && (
                        <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-0.5">
                            {pointTitles.map((titulo, i) => (
                                <li key={i}>{titulo}</li>
                            ))}
                        </ol>
                    )}
                </div>

                <div className="space-y-3">
                    {onEnterWorkshop && (
                        <div>
                            <h3 className="font-semibold">{t('drafting.paths.heading')}</h3>
                            <p className="text-sm text-muted-foreground">{t('drafting.paths.subheading')}</p>
                        </div>
                    )}

                    <div className={onEnterWorkshop ? 'grid gap-3 md:grid-cols-2' : ''}>
                        {onEnterWorkshop && (
                            <div className="flex flex-col gap-3 rounded-lg border-2 border-primary/50 bg-primary/[0.03] p-4">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm">{t('drafting.paths.workshopTitle')}</h4>
                                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] leading-none text-primary">
                                        {t('drafting.paths.workshopBadge')}
                                    </span>
                                </div>
                                <p className="flex-1 text-sm text-muted-foreground">
                                    {t('drafting.paths.workshopDesc')}
                                </p>
                                <Button onClick={onEnterWorkshop} size="sm" className="self-start">
                                    {t('drafting.paths.workshopCta')}
                                </Button>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
                            <h4 className="font-medium text-sm">{t('drafting.paths.generateTitle')}</h4>
                            <p className="flex-1 text-sm text-muted-foreground">
                                {t('drafting.paths.generateDesc')}
                            </p>
                            <Button
                                onClick={onGenerate}
                                disabled={generating}
                                variant="outline"
                                size="sm"
                                className="self-start"
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                {t('drafting.generateBtn')}
                            </Button>
                        </div>
                    </div>
                </div>

                {personalization && <div className="pt-2">{personalization}</div>}
            </div>
        </div>
    );
}
