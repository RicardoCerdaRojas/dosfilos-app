import { Trash2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import {
    describeSectionAuthorship,
    type ElementProvenance,
    type SermonElement,
} from '@dosfilos/domain';

interface Props {
    elements: readonly SermonElement[];
    /** Etiqueta del encabezado y modo: `verbatim` no lleva interruptor. */
    titleKey: string;
    singleEntry: boolean;
    onFlipKind: (id: string) => void;
    onRemove: (id: string) => void;
}

const BADGE: Record<ElementProvenance, string> = {
    pastor: 'bg-primary/15 text-primary',
    elegido: 'bg-muted text-muted-foreground',
    editado: 'bg-primary/10 text-primary/80',
    descartado: 'bg-transparent text-muted-foreground/60',
};

/**
 * Lo que el pastor YA decidió en esta sección.
 *
 * Separado del panel porque gobierna otra cosa: el panel maneja la ENTRADA de
 * decisiones; esto muestra las tomadas y deja corregirlas. Juntos el archivo
 * pasaba el límite de 300 líneas del proyecto.
 *
 * La lectura de autoría es CUALITATIVA a propósito: un porcentaje visible se
 * convierte en la meta, y la meta pasa a ser el número en vez del sermón.
 */
export function DecidedElementsList(props: Props) {
    const { t } = useTranslation('generator');
    const decided = props.elements.filter((e) => e.provenance !== 'descartado');
    const shape = describeSectionAuthorship(props.elements);

    if (decided.length === 0) return null;

    return (
            <div className="pt-4 border-t border-border/50 space-y-2">
                <h4 className="text-sm font-medium">
                    {t(props.titleKey)}
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
                            {props.singleEntry ? (
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
                                    onClick={() => e.kind !== 'elemento' && props.onFlipKind(e.id)}
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
                                    onClick={() => e.kind !== 'directiva' && props.onFlipKind(e.id)}
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
                                onClick={() => props.onRemove(e.id)}
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
    );
}
