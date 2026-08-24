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
} from '@dosfilos/domain';
import { useProposeElements, type ProposedElement } from '@/hooks/useProposeElements';

interface Props {
    sectionId: string;
    sectionLabel: string;
    sectionJob: string;
    passage: string;
    proposition?: string;
    points?: readonly string[];
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
                    sectionId: props.sectionId,
                    text,
                    provenance,
                    kind,
                    kindAuto: kind,
                    proposedText,
                    decidedAt: new Date(),
                };
            });
        if (nuevos.length === 0) return;
        props.onChange([...props.elements, ...nuevos]);
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
            sectionLabel: props.sectionLabel,
            sectionJob: props.sectionJob,
            proposition: props.proposition,
            points: props.points,
            // Lo ya decidido viaja al prompt: re-proponer su propio trabajo es
            // la forma más rápida de que abandone el flujo.
            alreadyDecided: decided.map((e) => e.text),
        });
        setProposals(nuevos);
    };

    const consume = (index: number) => setProposals((p) => p.filter((_, i) => i !== index));

    return (
        <Card className="p-6 space-y-5 mb-6 border-primary/30">
            <div className="space-y-1">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {props.sectionLabel}
                </h3>
                <p className="text-sm text-muted-foreground">{props.sectionJob}</p>
            </div>

            {/* Camino 1 — su idea. Primero y siempre abierto. */}
            <div className="space-y-2">
                <label htmlFor="mi-idea" className="text-sm font-medium">
                    {t('drafting.elements.myIdeaLabel')}
                </label>
                <Textarea
                    id="mi-idea"
                    value={mine}
                    onChange={(e) => setMine(e.target.value)}
                    placeholder={t('drafting.elements.myIdeaPlaceholder')}
                    rows={4}
                    className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{t('drafting.elements.onePerLine')}</p>
                <Button
                    size="sm"
                    onClick={() => {
                        add(splitElementLines(mine), 'pastor');
                        setMine('');
                    }}
                    disabled={splitElementLines(mine).length === 0}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {t('drafting.elements.addMine')}
                </Button>
            </div>

            {/* Camino 2 — pedir propuestas. Pull-first: nunca corre solo. */}
            <div className="pt-4 border-t border-border/50 space-y-3">
                <Button variant="outline" size="sm" onClick={handlePropose} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-1.5" />}
                    {proposals.length > 0 ? t('drafting.elements.proposeMore') : t('drafting.elements.propose')}
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

            {decided.length > 0 && (
                <div className="pt-4 border-t border-border/50 space-y-2">
                    <h4 className="text-sm font-medium">{t('drafting.elements.decidedTitle')}</h4>
                    <ul className="space-y-1.5">
                        {decided.map((e) => (
                            <li key={e.id} className="flex items-start gap-2 text-sm">
                                <button
                                    type="button"
                                    onClick={() => flipKind(e.id)}
                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${e.kind === 'directiva' ? 'bg-muted text-muted-foreground' : BADGE[e.provenance]}`}
                                    title={t('drafting.elements.flipKind')}
                                >
                                    {e.kind === 'directiva'
                                        ? t('drafting.elements.kind.directiva')
                                        : t(`drafting.elements.provenance.${e.provenance}`)}
                                </button>
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
