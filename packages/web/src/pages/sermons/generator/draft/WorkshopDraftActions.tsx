import { useState } from 'react';
import { Loader2, PenLine, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import {
    assembleDraft,
    missingForDraft,
    scriptureLookupRef,
    type SermonElement,
    type WalkSection,
} from '@dosfilos/domain';
import type { SermonContent } from '@dosfilos/domain';
import { LocalBibleService } from '@/services/LocalBibleService';
import { useWriteSection } from '@/hooks/useWriteSection';

interface Props {
    walk: readonly WalkSection[];
    elements: Record<string, SermonElement[]>;
    prose: Record<string, string>;
    points: readonly { title?: string; application?: string; scriptureReferences?: string[] }[];
    proposition?: string;
    audienceRigor?: 'beginner' | 'seminary';
    onProseChange: (sectionId: string, prose: string) => void;
    onAssemble: (draft: SermonContent) => void;
}

/**
 * Las dos acciones que cierran el taller: escribir lo que falta y armar el
 * borrador con lo escrito.
 *
 * "ESCRIBIR TODO" NO ES UN ATAJO PARA SALTARSE LAS DECISIONES. Sólo redacta
 * secciones que YA tienen algo decidido; las vacías las deja vacías y las
 * informa. Si escribiera igual, sería la puerta de atrás que vuelve inútil el
 * flujo entero — el pastor pulsaría el botón grande y volvería a tener un sermón
 * que nadie decidió.
 */
export function WorkshopDraftActions(props: Props) {
    const { t } = useTranslation('generator');
    const { write } = useWriteSection();
    const [escribiendo, setEscribiendo] = useState<{ hechas: number; total: number } | null>(null);

    const entrada = {
        walk: props.walk,
        elements: props.elements,
        prose: props.prose,
        points: props.points,
    };
    const faltantes = missingForDraft(entrada);
    const primeraFaltante = faltantes[0];

    /** Con decisiones y sin prosa: son las que este botón puede redactar. */
    const redactables = props.walk.filter(
        (s) =>
            s.mode === 'elements' &&
            s.status !== 'cubierta' &&
            !props.prose[s.id]?.trim() &&
            (props.elements[s.id] ?? []).some((e) => e.provenance !== 'descartado'),
    );

    const escribirTodo = async () => {
        setEscribiendo({ hechas: 0, total: redactables.length });
        for (const [i, seccion] of redactables.entries()) {
            const proposicion = seccion.parentId
                ? (props.elements[`${seccion.parentId}.proposition`] ?? [])
                      .filter((e) => e.provenance !== 'descartado')
                      .map((e) => e.text)
                      .join(' ')
                      .trim() || undefined
                : undefined;
            const texto = await write({
                section: seccion,
                sectionLabel: t(seccion.labelKey, seccion.labelParams),
                sectionJob: t(seccion.jobKey),
                elements: props.elements[seccion.id] ?? [],
                passage: '',
                proposition: props.proposition,
                pointTitle: seccion.parentLabel,
                pointProposition: proposicion,
                scriptureText:
                    LocalBibleService.getVerses(scriptureLookupRef(seccion.scriptureRef) ?? '') ?? undefined,
                audienceRigor: props.audienceRigor,
            });
            if (texto) props.onProseChange(seccion.id, texto);
            setEscribiendo({ hechas: i + 1, total: redactables.length });
        }
        setEscribiendo(null);
    };

    return (
        <div className="shrink-0 border-t border-border/60 pt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={escribirTodo} disabled={!!escribiendo || redactables.length === 0}>
                    {escribiendo ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                        <PenLine className="h-4 w-4 mr-1.5" />
                    )}
                    {escribiendo
                        ? t('drafting.assemble.writingProgress', escribiendo)
                        : t('drafting.assemble.writeAll', { count: redactables.length })}
                </Button>

                <Button size="sm" onClick={() => props.onAssemble(assembleDraft(entrada))} disabled={!!escribiendo}>
                    <FileText className="h-4 w-4 mr-1.5" />
                    {t('drafting.assemble.build')}
                </Button>
            </div>

            {/* SE AVISA LO QUE FALTA, PERO NO SE BLOQUEA. El pastor puede querer
                armar el borrador a medio camino para verlo tomar forma; impedirlo
                lo obligaría a completar el sermón a ciegas. Lo que no puede pasar
                es que arme sin saber qué quedó vacío. */}
            {primeraFaltante && (
                <p className="text-xs text-muted-foreground">
                    {t('drafting.assemble.missing', {
                        count: faltantes.length,
                        first: t(primeraFaltante.labelKey, primeraFaltante.labelParams),
                    })}
                </p>
            )}
        </div>
    );
}
