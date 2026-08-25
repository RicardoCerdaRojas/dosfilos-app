import { sermonPointBlocks, type SermonPointShape } from '@dosfilos/domain';
import { useTranslation } from '@/i18n';
import { MarkdownRenderer } from '@/components/canvas-chat/MarkdownRenderer';
import { ScriptureReferenceWithText } from '@/components/bible/ScriptureReferenceWithText';

interface Props {
    point: SermonPointShape & { point?: string };
    /** Cómo enlazar una referencia cuyo texto no se pudo resolver. */
    renderFallbackReference: (reference: string) => React.ReactNode;
}

/**
 * El cuerpo de un punto del sermón, en el lienzo de edición.
 *
 * CONSUME LA MISMA DESCRIPCIÓN QUE EL SERMÓN PUBLICADO (`sermonPointBlocks`).
 * Antes el lienzo dibujaba campo por campo con rótulos propios y el
 * serializador armaba su versión aparte: divergieron, y el pastor terminaba
 * revisando una cosa y publicando otra.
 *
 * REEMPLAZA LOS RÓTULOS DE FORMULARIO. El renderizador genérico mostraba
 * "Punto:", "Contenido:", "Referencias Cruzadas:" — nombres de campo dentro de
 * un sermón, hardcodeados en español en un componente compartido con exégesis.
 * Acá el cuerpo va sin rótulo, porque es lo que se predica.
 */
export function SermonPointBlocksView({ point, renderFallbackReference }: Props) {
    const { t } = useTranslation('generator');
    const bloques = sermonPointBlocks(point);

    return (
        <div className="space-y-4">
            {point.point && <h4 className="font-semibold text-foreground">{point.point}</h4>}

            {bloques.map((bloque, i) => (
                <div key={`${bloque.kind}-${i}`} className="space-y-1.5">
                    {bloque.headingKey && (
                        <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {t(bloque.headingKey)}
                        </h5>
                    )}

                    {bloque.kind === 'crossReferences' ? (
                        <div className="space-y-3">
                            {(bloque.items ?? []).map((ref, j) => (
                                <ScriptureReferenceWithText
                                    key={j}
                                    reference={ref}
                                    renderFallback={renderFallbackReference}
                                />
                            ))}
                        </div>
                    ) : bloque.items ? (
                        <ol className="list-decimal pl-5 space-y-1 text-sm">
                            {bloque.items.map((item, j) => (
                                <li key={j}>{item}</li>
                            ))}
                        </ol>
                    ) : (
                        <MarkdownRenderer content={bloque.text ?? ''} reading />
                    )}
                </div>
            ))}
        </div>
    );
}
