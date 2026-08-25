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
    onAssemble: (draft: SermonContent) => void | Promise<void>;
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

    /**
     * Con decisiones y sin prosa: son las que este botón puede redactar.
     *
     * Las `cubierta` ENTRAN: la decisión ya está tomada, pero lo que él escribió
     * en el bosquejo son notas y llevarlas al sermón tal cual sería publicar su
     * borrador de trabajo.
     */
    const redactables = props.walk.filter(
        (s) =>
            s.mode === 'elements' &&
            !props.prose[s.id]?.trim() &&
            ((props.elements[s.id] ?? []).some((e) => e.provenance !== 'descartado') ||
                (s.coveredBy ?? []).length > 0),
    );

    /**
     * Redacta lo pendiente y arma. UN SOLO PASO, porque es el caso normal.
     *
     * Estaban separados para permitir armar a medio camino, y eso sigue
     * disponible en el botón secundario. Pero el fundador esperaba que armar
     * escribiera primero —"¿primero se escriben las que faltan y luego se
     * construye?"— y tenía razón: obligarlo a descubrir la secuencia hace que
     * el camino habitual dependa de adivinarla, y quien no la adivine arma un
     * esqueleto sin saber por qué.
     */
    const hayPendientes = redactables.length > 0;

    const escribirYArmar = async () => {
        const prosaNueva = await escribirTodo();
        props.onAssemble(assembleDraft({ ...entrada, prose: { ...props.prose, ...prosaNueva } }));
    };

    const escribirTodo = async (): Promise<Record<string, string>> => {
        setEscribiendo({ hechas: 0, total: redactables.length });
        // Se acumula acá y se devuelve: el estado de React no se habrá
        // actualizado todavía cuando el ensamblado corra a continuación, y
        // armar con el mapa viejo produciría el esqueleto que se acaba de
        // evitar escribiendo.
        const escritas: Record<string, string> = {};
        for (const [i, seccion] of redactables.entries()) {
            const proposicion = seccion.parentId
                ? (props.elements[`${seccion.parentId}.proposition`] ?? [])
                      .filter((e) => e.provenance !== 'descartado')
                      .map((e) => e.text)
                      .join(' ')
                      .trim() || undefined
                : undefined;
            const desdeElBosquejo = (seccion.coveredBy ?? []).map((text, i) => ({
                id: `${seccion.id}.covered.${i}`,
                sectionId: seccion.id,
                text,
                kind: 'elemento' as const,
                provenance: 'pastor' as const,
                decidedAt: new Date(),
            }));
            const propios = (props.elements[seccion.id] ?? []).filter((e) => e.provenance !== 'descartado');

            const texto = await write({
                section: seccion,
                sectionLabel: t(seccion.labelKey, seccion.labelParams),
                sectionJob: t(seccion.jobKey),
                elements: propios.length > 0 ? propios : desdeElBosquejo,
                passage: '',
                proposition: props.proposition,
                pointTitle: seccion.parentLabel,
                pointProposition: proposicion,
                scriptureText:
                    LocalBibleService.getVerses(scriptureLookupRef(seccion.scriptureRef) ?? '') ?? undefined,
                audienceRigor: props.audienceRigor,
            });
            if (texto) {
                escritas[seccion.id] = texto;
                props.onProseChange(seccion.id, texto);
            }
            setEscribiendo({ hechas: i + 1, total: redactables.length });
        }
        setEscribiendo(null);
        return escritas;
    };

    return (
        <div className="shrink-0 border-t border-border/60 pt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {/* La acción principal hace el camino completo. La parcial queda
                    disponible al lado, sin que haya que adivinar el orden. */}
                <Button size="sm" onClick={() => void (hayPendientes ? escribirYArmar() : props.onAssemble(assembleDraft(entrada)))} disabled={!!escribiendo}>
                    {escribiendo ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                        <FileText className="h-4 w-4 mr-1.5" />
                    )}
                    {escribiendo
                        ? t('drafting.assemble.writingProgress', escribiendo)
                        : hayPendientes
                          ? t('drafting.assemble.writeAndBuild', { count: redactables.length })
                          : t('drafting.assemble.build')}
                </Button>

                {hayPendientes && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void props.onAssemble(assembleDraft(entrada))}
                        disabled={!!escribiendo}
                    >
                        <PenLine className="h-4 w-4 mr-1.5" />
                        {t('drafting.assemble.buildPartial')}
                    </Button>
                )}
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
