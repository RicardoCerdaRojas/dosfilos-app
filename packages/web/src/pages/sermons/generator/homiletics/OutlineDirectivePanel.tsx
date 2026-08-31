import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Plus, Save, Trash2 } from 'lucide-react';
import { BibleLinkedText } from '@/components/bible/BibleLinkedText';
import { normalizePastorDirective, type HomileticalAnalysis, type PastorDirective } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface Props {
    homiletics: HomileticalAnalysis;
    /**
     * Recibe TODOS los puntos cambiados de una vez, no uno por llamada.
     *
     * Llamarlo en bucle perdía escrituras: cada llamada calculaba el nuevo
     * estado desde el `homiletics` del render actual, que aún no incluía la
     * anterior de la misma tanda, y sólo sobrevivía la última.
     */
    onApply: (entries: { index: number; directive: PastorDirective | undefined }[]) => void;
}

interface Draft {
    emphasis: string;
    notes: string[];
}

/**
 * Donde el pastor escribe SU dirección sobre cada punto.
 *
 * POR QUÉ EXISTE: el bosquejo era solo-lectura + "Refinar" por chat. La única
 * forma de inyectar intención era pedírsela al agente, que la reescribía con sus
 * palabras — y el prompt del borrador no tenía cómo distinguir esa frase de las
 * que él mismo había generado antes.
 *
 * ESTE CAMPO EL AGENTE NO LO ESCRIBE NUNCA. Ni al generar el bosquejo ni al
 * refinarlo. Por eso es voz del pastor por construcción, sin marcar procedencia
 * campo por campo. Es lo que permite que el prompt lo trate como vinculante.
 *
 * DOS FORMAS, PORQUE FALLAN DISTINTO: el énfasis MODULA (gobierna el ángulo de
 * la exposición completa) y las notas OBLIGAN (datos que deben aparecer). Una
 * nota tratada como sugerencia desaparece del borrador; un énfasis tratado como
 * dato termina de frase pegada al final.
 *
 * NO ALTERA EL ORDEN HERMENÉUTICO: dirige cómo se EXPONE el texto, no sustituye
 * lo que el texto dice.
 */
export function OutlineDirectivePanel({ homiletics, onApply }: Props) {
    const { t } = useTranslation('generator');
    const points = useMemo(() => homiletics.outline?.mainPoints ?? [], [homiletics.outline]);

    const seed = useMemo(
        (): Draft[] =>
            points.map((p) => ({
                emphasis: p.pastorDirective?.emphasis ?? '',
                notes: [...(p.pastorDirective?.exegeticalNotes ?? [])],
            })),
        [points],
    );

    const [drafts, setDrafts] = useState<Draft[]>(seed);
    // Re-siembra cuando el bosquejo cambia por fuera (refinar por chat, undo,
    // restaurar versión). Sin esto el panel seguiría mostrando el borrador
    // anterior y guardar pisaría el cambio que acaba de llegar.
    useEffect(() => setDrafts(seed), [seed]);

    const dirty = useMemo(
        () =>
            drafts.some((d, i) => {
                const a = normalizePastorDirective({ emphasis: d.emphasis, exegeticalNotes: d.notes });
                const b = normalizePastorDirective(points[i]?.pastorDirective);
                return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
            }),
        [drafts, points],
    );

    const patch = (i: number, fn: (d: Draft) => Draft) =>
        setDrafts((prev) => prev.map((d, k) => (k === i ? fn(d) : d)));

    const save = () => {
        // Sólo los puntos que cambiaron, pero TODOS en una sola llamada: filtrar
        // evita llenar el historial de entradas idénticas, y agrupar evita que
        // las escrituras se pisen entre sí.
        const entries = drafts
            .map((d, i) => ({ index: i, directive: normalizePastorDirective({ emphasis: d.emphasis, exegeticalNotes: d.notes }) }))
            .filter(({ index, directive }) => {
                const prev = normalizePastorDirective(points[index]?.pastorDirective);
                return JSON.stringify(directive ?? null) !== JSON.stringify(prev ?? null);
            });
        if (entries.length > 0) onApply(entries);
    };

    if (points.length === 0) {
        return <p className="text-sm text-muted-foreground">{t('homiletics.directive.noPoints')}</p>;
    }

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{t('homiletics.directive.intro')}</p>

            {points.map((point, i) => (
                <div key={i} className="rounded-md border border-border/60 p-3 space-y-3">
                    <div>
                        <h4 className="text-sm font-medium">{point.title}</h4>
                        {/* Descripción COMPLETA y referencias clicables: este
                            panel es el cuerpo de la tarjeta y reemplaza su
                            render, así que recortar el texto o apagar los
                            enlaces sería quitarle al pastor lo que ya leía
                            acá. `BibleLinkedText` es el componente que ya
                            existía para esto. */}
                        {point.description && (
                            <BibleLinkedText
                                text={point.description}
                                className="mt-1 block text-xs text-muted-foreground"
                            />
                        )}
                        {/* La descripción quedó describiendo el punto anterior.
                            Se avisa y se deja leer: borrarla perdería trabajo y
                            regenerarla sola gastaría tokens y pisaría lo que el
                            pastor ajustó a mano. Él decide, por chat. */}
                        {point.descriptionStale && (
                            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-warning">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                <span>{t('homiletics.directive.staleDescription')}</span>
                            </p>
                        )}
                        {point.scriptureReferences && point.scriptureReferences.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {point.scriptureReferences.map((ref, j) => (
                                    <BibleLinkedText
                                        key={j}
                                        text={ref}
                                        className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium"
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor={`emph-${i}`} className="text-xs font-medium text-foreground">
                            {t('homiletics.directive.emphasisLabel')}
                        </label>
                        <Textarea
                            id={`emph-${i}`}
                            value={drafts[i]?.emphasis ?? ''}
                            onChange={(e) => patch(i, (d) => ({ ...d, emphasis: e.target.value }))}
                            rows={2}
                            placeholder={t('homiletics.directive.emphasisPlaceholder')}
                            className="text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <span className="text-xs font-medium text-foreground">
                            {t('homiletics.directive.notesLabel')}
                        </span>
                        {(drafts[i]?.notes ?? []).map((note, j) => (
                            <div key={j} className="flex items-center gap-2">
                                <Input
                                    value={note}
                                    onChange={(e) =>
                                        patch(i, (d) => ({
                                            ...d,
                                            notes: d.notes.map((n, k) => (k === j ? e.target.value : n)),
                                        }))
                                    }
                                    placeholder={t('homiletics.directive.notePlaceholder')}
                                    className="text-sm"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    aria-label={t('homiletics.directive.removeNote')}
                                    onClick={() =>
                                        patch(i, (d) => ({ ...d, notes: d.notes.filter((_, k) => k !== j) }))
                                    }
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => patch(i, (d) => ({ ...d, notes: [...d.notes, ''] }))}
                        >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {t('homiletics.directive.addNote')}
                        </Button>
                    </div>
                </div>
            ))}

            <Button onClick={save} disabled={!dirty} size="sm" className="w-full">
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {t('homiletics.directive.save')}
            </Button>
        </div>
    );
}
