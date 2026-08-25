import { useTranslation } from '@/i18n';
import { MarkdownRenderer } from '@/components/canvas-chat/MarkdownRenderer';
import { scriptureLookupRef, type WalkSection } from '@dosfilos/domain';
import { LocalBibleService } from '@/services/LocalBibleService';

interface Props {
    section: WalkSection;
    /** Proposición decidida del punto, si esta sección no es esa misma. */
    pointProposition?: string;
}

/**
 * Lo que la sección le MUESTRA al pastor antes de que decida nada.
 *
 * Tres bloques, y cada uno responde una pregunta distinta: qué dice el texto,
 * qué afirmó él para este punto, y qué trae ya escrito del estudio. Viven juntos
 * porque los tres son CONTEXTO —se leen, no se editan— y separados del panel
 * porque éste ya tenía dos responsabilidades de sobra.
 */
export function SectionContextBlocks({ section, pointProposition }: Props) {
    const { t } = useTranslation('generator');

    /**
     * El texto bíblico de la sección, a la vista mientras decide. Lectura local
     * y síncrona: no quiero un estado de carga donde está pensando.
     */
    const versiculo = LocalBibleService.getVerses(scriptureLookupRef(section.scriptureRef) ?? '');

    return (
        <>
        {versiculo && (
            <blockquote className="rounded-md border-l-2 border-primary/40 bg-muted/40 py-2 pl-3 pr-2 text-sm">
                <p className="text-foreground/90 leading-relaxed">{versiculo}</p>
                <cite className="mt-1 block text-xs not-italic text-muted-foreground">
                    {section.scriptureRef}
                </cite>
            </blockquote>
        )}

        {pointProposition && (
            <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                    {t('drafting.sections.pointPropositionContext')}
                </p>
                <p className="text-sm text-foreground/90">{pointProposition}</p>
            </div>
        )}

        {/* Lo que ya escribió: SE MUESTRA, NO SE PREGUNTA. Cuando la sección
            está cubierta es la respuesta; cuando está pendiente son sus
            indicaciones, y viajan al prompt como contexto. */}
        {section.coveredBy && section.coveredBy.length > 0 && (
            <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                    {t(
                        section.status === 'cubierta'
                            ? 'drafting.sections.coveredNote'
                            : (section.contextKey ?? 'drafting.sections.contextNote'),
                    )}
                </p>
                <ul className="space-y-1 text-sm text-foreground/90">
                    {/* MARKDOWN, NO TEXTO PLANO. Este material viene de sus
                        notas del bosquejo —viñetas con asterisco— y del
                        recordatorio de transición, que lleva negritas y una
                        lista numerada. Como texto plano se veía "**Puntos:** 1.
                        … 2. …" en una sola línea corrida: ilegible justo donde
                        tiene que revisar de un vistazo. */}
                    {section.coveredBy.map((texto, i) => (
                        <li key={i} className="flex gap-2">
                            <span className="text-primary shrink-0">▪</span>
                            <div className="min-w-0 flex-1">
                                <MarkdownRenderer content={texto} />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        )}

        </>
    );
}
