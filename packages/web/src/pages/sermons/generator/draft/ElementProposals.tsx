import { useState } from 'react';
import { Loader2, Check, Pencil, X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/i18n';
import type { ProposedElement } from '@/hooks/useProposeElements';

interface Props {
    /** Etiqueta del botón según el modo de la sección. */
    proposeKey: string;
    proposeMoreKey: string;
    loading: boolean;
    error: string | null;
    proposals: ProposedElement[];
    onPropose: () => void;
    /** Usar la propuesta tal cual. */
    onUse: (p: ProposedElement, index: number) => void;
    /** Usarla con el texto que el pastor reescribió. */
    onEdit: (p: ProposedElement, index: number, texto: string) => void;
    onDiscard: (p: ProposedElement, index: number) => void;
}

/**
 * Las propuestas del modelo y las tres decisiones que caben sobre cada una.
 *
 * SEPARADO DEL PANEL porque son responsabilidades distintas: el panel gobierna
 * lo que el pastor DECIDIÓ; esto gobierna lo que todavía es una oferta. Juntos
 * el archivo pasaba de 400 líneas y el límite del proyecto es 300.
 *
 * El estado de edición vive acá: es de esta interacción y muere con ella.
 */
export function ElementProposals(props: Props) {
    const { t } = useTranslation('generator');
    const [editing, setEditing] = useState<{ index: number; text: string } | null>(null);

    // Pull-first: nunca corre solo, el pastor lo pide.
    return (
        <div className="pt-4 border-t border-border/50 space-y-3">
            <Button variant="outline" size="sm" onClick={props.onPropose} disabled={props.loading}>
                {props.loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-1.5" />}
                {t(props.proposals.length > 0 ? props.proposeMoreKey : props.proposeKey)}
            </Button>

            {props.error && <p className="text-sm text-muted-foreground">{t('drafting.elements.proposeFailed')}</p>}

            {props.proposals.map((p, i) => (
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
                                    props.onEdit(p, i, editing.text);
                                    setEditing(null);
                                }}
                            >
                                <Check className="h-4 w-4 mr-1.5" />
                                {t('drafting.elements.saveEdit')}
                            </Button>
                        ) : (
                            <>
                                <Button size="sm" variant="ghost" onClick={() => props.onUse(p, i)}>
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
                                props.onDiscard(p, i);
                                setEditing(null);
                            }}
                        >
                            <X className="h-4 w-4 mr-1.5" />
                            {t('drafting.elements.discard')}
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
