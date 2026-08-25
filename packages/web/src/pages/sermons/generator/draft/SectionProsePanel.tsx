import { useEffect, useRef } from 'react';
import { Loader2, PenLine } from 'lucide-react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { Button } from '@/components/ui/button';
import { RichSermonEditor } from '@/components/ui/RichSermonEditor';
import { useTranslation } from '@/i18n';
import type { SermonElement, WalkSection } from '@dosfilos/domain';
import { useWriteSection } from '@/hooks/useWriteSection';
import { LocalBibleService } from '@/services/LocalBibleService';

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
    const { write, writingId, error } = useWriteSection();
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

    const decididos = props.elements.filter((e) => e.provenance !== 'descartado');
    const escribiendo = writingId === section.id;

    const escribir = async () => {
        const texto = await write({
            section,
            sectionLabel: t(section.labelKey, section.labelParams),
            sectionJob: t(section.jobKey),
            elements: props.elements,
            passage: props.passage,
            proposition: props.proposition,
            pointTitle: section.parentLabel,
            pointProposition: props.pointProposition,
            // El texto REAL, no el que el modelo recuerde. Una cita bíblica mal
            // recordada en el púlpito es de la misma familia que una cita de
            // autor inventada.
            scriptureText: section.scriptureRef
                ? (LocalBibleService.getVerses(section.scriptureRef) ?? undefined)
                : undefined,
            audienceRigor: props.audienceRigor,
        });
        if (texto) props.onProseChange(texto);
    };

    return (
        <section className="h-full flex flex-col gap-3 pl-1" aria-label={t('drafting.prose.label')}>
            <div className="flex items-center gap-2 shrink-0">
                <h3 className="text-sm font-semibold flex-1 min-w-0 truncate">{t('drafting.prose.label')}</h3>
                <Button variant="outline" size="sm" onClick={escribir} disabled={escribiendo || decididos.length === 0}>
                    {escribiendo ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                        <PenLine className="h-4 w-4 mr-1.5" />
                    )}
                    {t(props.prose ? 'drafting.prose.rewrite' : 'drafting.prose.write')}
                </Button>
            </div>

            {error && <p className="text-xs text-muted-foreground shrink-0">{t('drafting.prose.failed')}</p>}

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
