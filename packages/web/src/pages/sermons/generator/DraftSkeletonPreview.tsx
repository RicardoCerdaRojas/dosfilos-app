import { useTranslation } from 'react-i18next';
import { Quote, Sparkles } from 'lucide-react';
import type { HomileticalAnalysis } from '@dosfilos/domain';

interface Props {
    homiletics: HomileticalAnalysis | null;
}

/**
 * La FORMA del sermón antes de que exista, armada con los datos del pastor.
 *
 * POR QUÉ NO ES DECORACIÓN: este panel era una lista de viñetas que además
 * describía el paso anterior. Un esqueleto genérico habría arreglado la mentira
 * pero no habría aportado nada que el pastor no supiera ya.
 *
 * Éste se arma con SU bosquejo: sus títulos de puntos, y las marcas de dónde
 * quedaron su aplicación aprobada y sus directivas. Así el panel hace dos cosas
 * a la vez — anticipa la estructura y le CONFIRMA que lo que escribió en los
 * pasos anteriores llegó hasta acá. Eso último importa especialmente en este
 * producto: ya hubo campos que se llenaban, se veían, y ningún prompt leía.
 *
 * Los bloques van punteados a propósito: es una promesa de estructura, no
 * contenido. Un borde sólido lo haría parecer generado.
 */
export function DraftSkeletonPreview({ homiletics }: Props) {
    const { t } = useTranslation('generator');
    const points = homiletics?.outline?.mainPoints ?? [];

    const Bloque = ({ label, parts }: { label: string; parts: string[] }) => (
        <div className="rounded-md border border-dashed border-border px-3 py-2 text-left">
            <div className="text-xs font-medium text-foreground">{label}</div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                {parts.map((p, i) => (
                    <span key={i} className="text-[11px] text-muted-foreground">
                        {p}
                    </span>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-2">
            <Bloque
                label={t('drafting.skeleton.introduction')}
                parts={t('drafting.skeleton.introductionParts', { returnObjects: true }) as string[]}
            />

            {points.length === 0 ? (
                <Bloque
                    label={t('drafting.skeleton.pointsPending')}
                    parts={t('drafting.skeleton.pointParts', { returnObjects: true }) as string[]}
                />
            ) : (
                points.map((point, i) => {
                    const tieneEnfasis = Boolean(point.pastorDirective?.emphasis?.trim());
                    const tieneNotas = (point.pastorDirective?.exegeticalNotes ?? []).some((n) => n.trim());
                    const tieneAplicacion = Boolean(point.application?.trim());
                    return (
                        <div key={i} className="rounded-md border border-dashed border-border px-3 py-2 text-left">
                            <div className="text-xs font-medium text-foreground line-clamp-1">{point.title}</div>
                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                {(t('drafting.skeleton.pointParts', { returnObjects: true }) as string[]).map((p, j) => (
                                    <span key={j} className="text-[11px] text-muted-foreground">
                                        {p}
                                    </span>
                                ))}
                            </div>
                            {/* Lo que el pastor escribió, marcado en SU punto:
                                la confirmación de que su trabajo llegó hasta el
                                borrador es la mitad del valor de este panel. */}
                            {(tieneEnfasis || tieneNotas || tieneAplicacion) && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    {tieneAplicacion && (
                                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                            <Quote className="h-2.5 w-2.5" />
                                            {t('drafting.skeleton.yourApplication')}
                                        </span>
                                    )}
                                    {(tieneEnfasis || tieneNotas) && (
                                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                            <Sparkles className="h-2.5 w-2.5" />
                                            {t('drafting.skeleton.yourDirective')}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            <Bloque
                label={t('drafting.skeleton.conclusion')}
                parts={t('drafting.skeleton.conclusionParts', { returnObjects: true }) as string[]}
            />
            <Bloque
                label={t('drafting.skeleton.callToAction')}
                parts={t('drafting.skeleton.callToActionParts', { returnObjects: true }) as string[]}
            />
        </div>
    );
}
