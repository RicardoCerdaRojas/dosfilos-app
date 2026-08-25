import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/i18n';
import {
    splitElementLines,
    classifyContribution,
    type SermonElement,
    type ElementProvenance,
    type ContributionKind,
    scriptureLookupRef,
    type WalkSection,
} from '@dosfilos/domain';
import { useProposeElements, type ProposedElement } from '@/hooks/useProposeElements';
import { useProposeAuthorityQuotes } from '@/hooks/useProposeAuthorityQuotes';
import { useFirebase } from '@/context/firebase-context';
import { toast } from 'sonner';
import { SectionContextBlocks } from './SectionContextBlocks';
import { ElementProposals } from './ElementProposals';
import { DecidedElementsList } from './DecidedElementsList';
import { LocalBibleService } from '@/services/LocalBibleService';

interface Props {
    section: WalkSection;
    passage: string;
    proposition?: string;
    points?: readonly string[];
    /** Proposición decidida para el punto, si la sección no es esa misma. */
    pointProposition?: string;
    elements: SermonElement[];
    onChange: (elements: SermonElement[]) => void;
}

let seq = 0;
const nextId = () => `el-${Date.now().toString(36)}-${seq++}`;

/**
 * ADR-037 — el taller de UNA sección: el pastor decide qué ideas van, y la
 * prosa se escribe después a partir de esas decisiones.
 *
 * DOS CAMINOS, Y EL ORDEN IMPORTA. "Yo aporto la idea" va PRIMERO y siempre
 * visible; "propóneme" es un botón que hay que pulsar. Invertirlo — abrir con
 * las propuestas — convierte el flujo en elegir de un menú, y elegir no es
 * originar: el número de autoría se desplomaría por diseño de la pantalla, no
 * por lo que el pastor sabe.
 */
export function SectionElementsPanel(props: Props) {
    const { t } = useTranslation('generator');
    const { section } = props;
    /** En `verbatim` lo que escribe ES el texto final del sermón, no una idea sobre él. */
    const esVerbatim = section.mode === 'verbatim';
    /**
     * Una sección de UNA sola decisión: no se parte por líneas y escribir otra
     * reemplaza. Lo que cuenta como unidad lo declara la sección.
     */
    const esUnaIdea = section.oneIdea === true;
    /** Ni `verbatim` ni una imagen se trocean por saltos de línea. */
    const unaSolaEntrada = esVerbatim || esUnaIdea;
    /**
     * Texto propio de la sección verbatim. Cada una declara el suyo: compartir
     * uno hacía que la proposición del punto pidiera "El título del sermón".
     */
    const vk = (sufijo: string) => `${section.verbatimKey ?? ''}.${sufijo}`;

    /**
     * El texto bíblico de la sección, a la vista mientras decide.
     *
     * La proposición del punto resume lo que la congregación tiene que ver EN
     * el versículo: escribirla de memoria es peor, y obligarlo a abrir otra
     * pestaña para consultarlo es fricción en el momento exacto en que está
     * pensando. Lectura local y síncrona, sin llamada de red.
     */
    /** Para el prompt de propuestas: proponer de memoria es lo que se evita. */
    const versiculo = LocalBibleService.getVerses(scriptureLookupRef(section.scriptureRef) ?? '');
    const { propose, loading, error } = useProposeElements();
    const { propose: proponerCitas, loading: buscandoCitas } = useProposeAuthorityQuotes();
    const { user } = useFirebase();
    /** La cita se SELECCIONA de su biblioteca; no se pide "una idea de cita". */
    const esCitaDeAutoridad = section.id.endsWith('.authorityQuote');
    const [mine, setMine] = useState('');
    const [proposals, setProposals] = useState<ProposedElement[]>([]);

    const decided = props.elements.filter((e) => e.provenance !== 'descartado');

    /**
     * Agrega VARIAS ideas de un tirón.
     *
     * El pastor escribe listas —una idea por línea— y esperar que pulse el
     * botón por cada una convierte en tedio lo que hace natural. El plural no
     * es una comodidad: es un solo `onChange`, y encadenar el singular desde
     * React perdería todas las escrituras menos la última.
     */
    const add = (texts: readonly string[], provenance: ElementProvenance, proposedText?: string) => {
        const nuevos: SermonElement[] = texts
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
            .map((text) => {
                // El sistema clasifica; el pastor NO tiene que hacerlo. Si se
                // equivoca, lo corrige con un clic y `kindAuto` conserva lo que
                // se había propuesto, para saber cuánto se equivoca.
                const kind = classifyContribution(text);
                return {
                    id: nextId(),
                    sectionId: section.id,
                    text,
                    provenance,
                    kind,
                    kindAuto: kind,
                    proposedText,
                    decidedAt: new Date(),
                };
            });
        if (nuevos.length === 0) return;
        props.onChange(unaSolaEntrada ? nuevos : [...props.elements, ...nuevos]);
    };

    const remove = (id: string) => props.onChange(props.elements.filter((e) => e.id !== id));

    /** El pastor corrige la clasificación. Su corrección manda siempre. */
    const flipKind = (id: string) =>
        props.onChange(
            props.elements.map((e) =>
                e.id === id
                    ? { ...e, kind: (e.kind === 'elemento' ? 'directiva' : 'elemento') as ContributionKind }
                    : e,
            ),
        );

    const handlePropose = async () => {
        if (esCitaDeAutoridad) {
            const r = await proponerCitas({
                // La cita debe respaldar lo que el punto AFIRMA, no el pasaje
                // en general: la proposición es la mejor consulta que hay.
                query: props.pointProposition || section.parentLabel || props.passage,
                userId: user?.uid,
                passage: props.passage,
                pointTitle: section.parentLabel,
                pointProposition: props.pointProposition,
            });
            if (r.kind === 'ok') setProposals(r.quotes);
            // Los tres casos sin resultado se distinguen: que su biblioteca no
            // tenga nada del tema no es lo mismo que tener y que no encaje, y
            // ninguno de los dos es un error.
            else toast.info(t(`drafting.elements.quotes.${r.kind}`));
            return;
        }

        const nuevos = await propose({
            passage: props.passage,
            sectionLabel: t(section.labelKey, section.labelParams),
            sectionJob: t(section.jobKey),
            // El botón propone DESDE el versículo y la proposición, no en el
            // aire: los elementos de la exposición son las partes que desglosan
            // esa frase.
            pointProposition: props.pointProposition,
            scriptureText: versiculo ?? undefined,
            proposition: props.proposition,
            points: props.points,
            // Lo ya decidido viaja al prompt: re-proponer su propio trabajo es
            // la forma más rápida de que abandone el flujo.
            // Sus indicaciones del bosquejo cuentan como ya decidido: proponerle
            // de vuelta lo que él mismo escribió vacía el flujo.
            alreadyDecided: [...(section.coveredBy ?? []), ...decided.map((e) => e.text)],
        });
        setProposals(nuevos);
    };

    const consume = (index: number) => setProposals((p) => p.filter((_, i) => i !== index));

    // SIN MARCO. La tarjeta con borde de acento hacía que el panel se leyera
    // como un objeto flotando junto al mapa, en vez de como la columna de
    // trabajo del taller. El encabezado ya dice dónde está.
    return (
        <div className="px-5 py-4 space-y-5">
            <div className="space-y-1">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {t(section.labelKey, section.labelParams)}
                </h3>
                <p className="text-sm text-muted-foreground">{t(section.jobKey)}</p>
            </div>

            <SectionContextBlocks section={section} pointProposition={props.pointProposition} />

            {/* SECCIÓN CUBIERTA: se muestra y se corta acá. Volver a preguntar lo
                que ya decidió le pediría decidir dos veces la misma cosa, con el
                riesgo de que la segunda contradiga a la primera. */}
            {section.status === 'cubierta' ? null : (
              <>
            {/* Camino 1 — su idea. Primero y siempre abierto. */}
            <div className="space-y-2">
                <label htmlFor="mi-idea" className="text-sm font-medium">
                    {esVerbatim ? t(vk('label')) : t('drafting.elements.myIdeaLabel')}
                </label>
                <Textarea
                    id="mi-idea"
                    value={mine}
                    onChange={(e) => setMine(e.target.value)}
                    placeholder={t(esVerbatim ? vk('placeholder') : 'drafting.elements.myIdeaPlaceholder')}
                    rows={esVerbatim ? 2 : 4}
                    className="resize-none"
                />
                {!unaSolaEntrada && (
                    <p className="text-xs text-muted-foreground">{t('drafting.elements.onePerLine')}</p>
                )}
                {esUnaIdea && (
                    <p className="text-xs text-muted-foreground">{t('drafting.elements.oneIdeaHint')}</p>
                )}
                <Button
                    size="sm"
                    onClick={() => {
                        // En `verbatim` hay UN texto final: escribir otro reemplaza
                        // el anterior en vez de acumular. Un sermón no tiene dos
                        // títulos, y dejar los dos obligaría a borrar a mano el
                        // que sobra.
                        add(unaSolaEntrada ? [mine] : splitElementLines(mine), 'pastor');
                        setMine('');
                    }}
                    disabled={(unaSolaEntrada ? [mine.trim()].filter(Boolean) : splitElementLines(mine)).length === 0}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {esVerbatim ? t(vk('add')) : t('drafting.elements.addMine')}
                </Button>
            </div>

            <ElementProposals
                proposeKey={
                    esCitaDeAutoridad
                        ? 'drafting.elements.quotes.propose'
                        : esVerbatim
                          ? vk('propose')
                          : 'drafting.elements.propose'
                }
                proposeMoreKey={
                    esCitaDeAutoridad
                        ? 'drafting.elements.quotes.proposeMore'
                        : esVerbatim
                          ? vk('proposeMore')
                          : 'drafting.elements.proposeMore'
                }
                loading={loading || buscandoCitas}
                error={error}
                proposals={proposals}
                onPropose={handlePropose}
                onUse={(p, i) => {
                    add([p.text], 'elegido');
                    consume(i);
                }}
                onEdit={(p, i, texto) => {
                    // El texto propuesto viaja con el elemento: sin el original,
                    // `editado` no es auditable y la procedencia deja de
                    // significar algo.
                    add([texto], 'editado', p.text);
                    consume(i);
                }}
                onDiscard={(p, i) => {
                    // Descartar SE REGISTRA aunque no entre al sermón: qué
                    // rechazó dice tanto como qué aceptó.
                    add([p.text], 'descartado');
                    consume(i);
                }}
            />
              </>
            )}

            <DecidedElementsList
                elements={props.elements}
                titleKey={esVerbatim ? vk('decided') : 'drafting.elements.decidedTitle'}
                singleEntry={unaSolaEntrada}
                onFlipKind={flipKind}
                onRemove={remove}
            />

        </div>
    );
}
