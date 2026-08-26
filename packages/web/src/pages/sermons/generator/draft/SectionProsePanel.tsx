import { useEffect, useRef } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { RichSermonEditor } from '@/components/ui/RichSermonEditor';
import { useTranslation } from '@/i18n';
import type { SermonElement, WalkSection } from '@dosfilos/domain';
import { useWriteSection } from '@/hooks/useWriteSection';

interface Props {
    section: WalkSection;
    elements: readonly SermonElement[];
    prose?: string;
    onProseChange: (prose: string) => void;
    passage: string;
    proposition?: string;
    /** Proposición decidida para el punto al que pertenece la sección, si existe. */
    pointProposition?: string;
    audienceRigor?: 'beginner' | 'seminary';
}

/**
 * La prosa de la sección, en su propio riel.
 *
 * ESTABA DEBAJO DE LAS DECISIONES Y NO SE PODÍA LEER. Un campo de ocho líneas
 * al final de una columna larga obliga a desplazarse para ver lo que se acaba de
 * escribir, y comparar la prosa con las decisiones que la produjeron —que es
 * justo lo que hay que hacer— exigía subir y bajar.
 *
 * Al costado, las dos cosas se ven a la vez: a la izquierda lo que decidió, a la
 * derecha lo que salió. Esa comparación es el control de calidad del flujo
 * entero.
 *
 * EDITOR DE TEXTO RICO, no un textarea. Un sermón lleva énfasis, listas y
 * citas: pedirle al pastor que escriba markdown a mano, o que renuncie al
 * formato, son las dos malas salidas. `RichSermonEditor` ya existía para el
 * documento de Faculty — reusarlo evita una segunda forma de editar el mismo
 * tipo de contenido, que es como se termina con dos editores que divergen.
 */
export function SectionProsePanel(props: Props) {
    const { t } = useTranslation('generator');
    const { error } = useWriteSection();
    const { section } = props;

    /**
     * MDXEditor LEE `markdown` SÓLO AL MONTAR. Cambiar la prop después no
     * actualiza nada: al volver a escribir la sección, el pastor seguía viendo
     * la prosa vieja hasta recargar la página. Hay que empujar el texto nuevo
     * por la API del editor.
     */
    const editorRef = useRef<MDXEditorMethods>(null);
    /**
     * Último texto que salió DEL editor. Sirve para distinguir un cambio
     * propio (él tecleando) de uno externo (la regeneración): empujar el valor
     * mientras escribe le movería el cursor al principio en cada tecla.
     */
    const ultimoPropio = useRef<string | undefined>(props.prose);

    useEffect(() => {
        const entrante = props.prose ?? '';
        if (entrante === (ultimoPropio.current ?? '')) return;
        ultimoPropio.current = entrante;
        editorRef.current?.setMarkdown(entrante);
    }, [props.prose]);

    const alEditar = (texto: string) => {
        ultimoPropio.current = texto;
        props.onProseChange(texto);
    };

    /**
     * Las ideas que alimentan la redacción.
     *
     * UNA SECCIÓN `cubierta` TAMBIÉN SE REDACTA. `cubierta` significa "la
     * decisión ya está tomada", no "no queda nada que hacer": lo que el pastor
     * escribió en el bosquejo son NOTAS —viñetas con asteriscos a la vista— y
     * llevarlas al sermón tal cual sería publicar su borrador de trabajo.
     *
     * Sus notas entran como elementos suyos porque LO SON: procedencia `pastor`,
     * decididas por él en el paso homilético.
     *
     * SÓLO cuando ese material ES contenido. El recordatorio de la transición
     * es contexto: redactar desde él produciría prosa que repite la
     * proposición, el duplicado que se acaba de corregir.
     */
    const desdeElBosquejo: SermonElement[] = (section.coveredIsContent ? (section.coveredBy ?? []) : []).map((text, i) => ({
        id: `${section.id}.covered.${i}`,
        sectionId: section.id,
        text,
        kind: 'elemento' as const,
        provenance: 'pastor' as const,
        decidedAt: new Date(),
    }));

    const propios = props.elements.filter((e) => e.provenance !== 'descartado');
    const decididos = propios.length > 0 ? propios : desdeElBosquejo;


    return (
        <section className="h-full flex flex-col gap-3 p-4" aria-label={t('drafting.prose.label')}>
            {/* SÓLO EL RESULTADO. El botón de redactar vive con las demás
                acciones de la sección, en el panel de decisiones: acá quedaba
                separado de "propónme ideas" cuando ambos son lo mismo — pedirle
                ayuda al modelo sobre esta sección. */}
            {/* MISMO ESTILO que el encabezado de la columna de decisiones:
                las dos columnas son pares del mismo taller y sus títulos deben
                leerse como el mismo nivel — lo pidió el fundador comparándolas. */}
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground shrink-0">
                {t('drafting.prose.label')}
            </h3>

            {error && <p className="text-xs text-muted-foreground shrink-0">{t('drafting.prose.failed')}</p>}

            {/* LA SECCIÓN NO EMPIEZA DONDE EMPIEZA ESTE TEXTO.
                La proposición del punto la aporta el ensamblador con las
                palabras EXACTAS del pastor —si la escribiera el modelo podría
                desviarse—, así que la prosa de acá arranca en el desarrollo.
                Sin decirlo, leer esta sección sola parece que faltara la tesis:
                el fundador lo reportó como error, y tenía razón en que la
                pantalla no se lo explicaba. */}
            {section.unpacksProposition && props.pointProposition && (
                <p className="shrink-0 text-xs text-muted-foreground">
                    {t('drafting.prose.propositionOpens')}
                </p>
            )}

            {/* MENSAJES DISTINTOS PARA DOS ESTADOS DISTINTOS: todavía no decidió
                nada, o decidió y aún no pidió la redacción. Un solo mensaje
                genérico dejaría al pastor sin saber cuál de las dos le falta. */}
            {props.prose ? (
                <div className="flex-1 min-h-0 overflow-y-auto rounded-md border border-border/60">
                    {/* `key` por sección: al cambiar de sección el editor se
                        vuelve a montar con su propio contenido, en vez de
                        arrastrar el estado interno de la anterior. */}
                    <RichSermonEditor
                        key={section.id}
                        ref={editorRef}
                        markdown={props.prose}
                        onChange={alEditar}
                    />
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                    {t(decididos.length === 0 ? 'drafting.prose.emptyNoDecisions' : 'drafting.prose.emptyReady')}
                </p>
            )}
        </section>
    );
}
