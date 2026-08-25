import { useState } from 'react';
import { Loader2, Plus, Check, Pencil, X, Lightbulb, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/i18n';
import {
    describeSectionAuthorship,
    splitElementLines,
    classifyContribution,
    type SermonElement,
    type ElementProvenance,
    type ContributionKind,
    scriptureLookupRef,
    type WalkSection,
} from '@dosfilos/domain';
import { useProposeElements, type ProposedElement } from '@/hooks/useProposeElements';
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

const BADGE: Record<ElementProvenance, string> = {
    pastor: 'bg-primary/15 text-primary',
    elegido: 'bg-muted text-muted-foreground',
    editado: 'bg-primary/10 text-primary/80',
    descartado: 'bg-transparent text-muted-foreground/60',
};

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
    const versiculo = LocalBibleService.getVerses(scriptureLookupRef(section.scriptureRef) ?? '');
    const { propose, loading, error } = useProposeElements();
    const [mine, setMine] = useState('');
    const [proposals, setProposals] = useState<ProposedElement[]>([]);
    const [editing, setEditing] = useState<{ index: number; text: string } | null>(null);

    const decided = props.elements.filter((e) => e.provenance !== 'descartado');
    const shape = describeSectionAuthorship(props.elements);

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

    return (
        <Card className="p-6 space-y-5 mb-6 border-primary/30">
            <div className="space-y-1">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {t(section.labelKey, section.labelParams)}
                </h3>
                <p className="text-sm text-muted-foreground">{t(section.jobKey)}</p>
            </div>

            {versiculo && (
                <blockquote className="rounded-md border-l-2 border-primary/40 bg-muted/40 py-2 pl-3 pr-2 text-sm">
                    <p className="text-foreground/90 leading-relaxed">{versiculo}</p>
                    <cite className="mt-1 block text-xs not-italic text-muted-foreground">
                        {section.scriptureRef}
                    </cite>
                </blockquote>
            )}

            {props.pointProposition && (
                <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                        {t('drafting.sections.pointPropositionContext')}
                    </p>
                    <p className="text-sm text-foreground/90">{props.pointProposition}</p>
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
                        {section.coveredBy.map((texto, i) => (
                            <li key={i} className="flex gap-2">
                                <span className="text-primary shrink-0">▪</span>
                                <span>{texto}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

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

            {/* Camino 2 — pedir propuestas. Pull-first: nunca corre solo. */}
            <div className="pt-4 border-t border-border/50 space-y-3">
                <Button variant="outline" size="sm" onClick={handlePropose} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-1.5" />}
                    {esVerbatim
                        ? t(proposals.length > 0 ? vk('proposeMore') : vk('propose'))
                        : t(proposals.length > 0 ? 'drafting.elements.proposeMore' : 'drafting.elements.propose')}
                </Button>

                {error && <p className="text-sm text-muted-foreground">{t('drafting.elements.proposeFailed')}</p>}

                {proposals.map((p, i) => (
                    <div key={`${p.text}-${i}`} className="rounded-md border border-border/60 p-3 space-y-2">
                        {editing?.index === i ? (
                            <Textarea
                                value={editing.text}
                                onChange={(e) => setEditing({ index: i, text: e.target.value })}
                                rows={3}
                                className="resize-none text-sm"
                            />
                        ) : (
                            <>
                                {p.unsupported && (
                                    <span className="inline-block rounded bg-warning/15 px-1.5 py-0.5 text-[11px] text-warning-foreground">
                                        {t('drafting.elements.unsupported')}
                                    </span>
                                )}
                                <p className="text-sm">{p.text}</p>
                                {p.why && <p className="text-xs text-muted-foreground italic">{p.why}</p>}
                            </>
                        )}
                        <div className="flex gap-1.5">
                            {editing?.index === i ? (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        // El texto propuesto viaja con el elemento: sin el
                                        // original, `editado` no es auditable y la procedencia
                                        // deja de significar algo.
                                        add([editing.text], 'editado', p.text);
                                        setEditing(null);
                                        consume(i);
                                    }}
                                >
                                    <Check className="h-4 w-4 mr-1.5" />
                                    {t('drafting.elements.saveEdit')}
                                </Button>
                            ) : (
                                <>
                                    <Button size="sm" variant="ghost" onClick={() => { add([p.text], 'elegido'); consume(i); }}>
                                        <Check className="h-4 w-4 mr-1.5" />
                                        {t('drafting.elements.use')}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditing({ index: i, text: p.text })}>
                                        <Pencil className="h-4 w-4 mr-1.5" />
                                        {t('drafting.elements.edit')}
                                    </Button>
                                </>
                            )}
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={() => {
                                    // Descartar SE REGISTRA aunque no entre al sermón: qué
                                    // rechazó dice tanto como qué aceptó.
                                    add([p.text], 'descartado');
                                    setEditing(null);
                                    consume(i);
                                }}
                            >
                                <X className="h-4 w-4 mr-1.5" />
                                {t('drafting.elements.discard')}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

              </>
            )}

            {decided.length > 0 && (
                <div className="pt-4 border-t border-border/50 space-y-2">
                    <h4 className="text-sm font-medium">
                        {esVerbatim ? t(vk('decided')) : t('drafting.elements.decidedTitle')}
                    </h4>
                    <ul className="space-y-1.5">
                        {decided.map((e) => (
                            <li key={e.id} className="flex items-start gap-2 text-sm">
                                {/* UN INTERRUPTOR DE DOS ESTADOS, NO UNA ETIQUETA.
                                    Antes esto era una sola insignia que cambiaba
                                    al hacerle clic. Funcionaba, pero PARECÍA una
                                    etiqueta: nada decía que se podía tocar, así
                                    que una mala clasificación se quedaba puesta
                                    y desmedía la autoría en silencio.

                                    Mostrar los dos estados a la vez —el activo
                                    resaltado, el otro apagado— hace visible que
                                    hay una elección, sin una línea de texto
                                    explicativo. La cara de "idea" lleva la
                                    PROCEDENCIA (Tuya · Elegida · Editada), así
                                    que el interruptor no pierde información. */}
                                {unaSolaEntrada ? (
                                    <span className={`shrink-0 rounded px-1.5 py-1 text-[11px] leading-none ${BADGE[e.provenance]}`}>
                                        {t(`drafting.elements.provenance.${e.provenance}`)}
                                    </span>
                                ) : (
                                <span
                                    role="group"
                                    aria-label={t('drafting.elements.flipKind')}
                                    className="shrink-0 inline-flex rounded border border-border/70 overflow-hidden text-[11px] leading-none"
                                >
                                    <button
                                        type="button"
                                        aria-pressed={e.kind === 'elemento'}
                                        onClick={() => e.kind !== 'elemento' && flipKind(e.id)}
                                        className={`px-1.5 py-1 transition-colors ${
                                            e.kind === 'elemento'
                                                ? BADGE[e.provenance]
                                                : 'text-muted-foreground/60 hover:bg-muted/60'
                                        }`}
                                    >
                                        {t(`drafting.elements.provenance.${e.provenance}`)}
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={e.kind === 'directiva'}
                                        onClick={() => e.kind !== 'directiva' && flipKind(e.id)}
                                        className={`px-1.5 py-1 transition-colors border-l border-border/70 ${
                                            e.kind === 'directiva'
                                                ? 'bg-muted text-foreground'
                                                : 'text-muted-foreground/60 hover:bg-muted/60'
                                        }`}
                                    >
                                        {t('drafting.elements.kind.directiva')}
                                    </button>
                                </span>
                                )}
                                <span className="text-foreground/90 flex-1">{e.text}</span>
                                <button
                                    type="button"
                                    onClick={() => remove(e.id)}
                                    className="shrink-0 text-muted-foreground/60 hover:text-foreground"
                                    aria-label={t('drafting.elements.remove')}
                                    title={t('drafting.elements.remove')}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-muted-foreground pt-1">
                        {t(`drafting.elements.shape.${shape}`)}
                    </p>
                </div>
            )}

        </Card>
    );
}
