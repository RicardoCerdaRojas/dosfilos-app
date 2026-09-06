import { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { PaperStudyReference, PastoralSeedStepKey } from '@dosfilos/domain';

interface Props {
    reference: PaperStudyReference;
    stepKey: PastoralSeedStepKey;
}

/**
 * Muestra, al lado del paso actual, lo que el paper exegético del pastor
 * ya estableció sobre este pasaje.
 *
 * Tres decisiones que definen el componente:
 *
 *   1. **Es consulta, no relleno.** No hay botón de "usar esto". Ningún
 *      texto de acá se copia a los campos de la semilla. El pastor lo
 *      lee y escribe lo suyo — que es de lo que vive la métrica de
 *      autoría verbatim y, antes que eso, el sentido del estudio.
 *
 *   2. **Empieza plegado.** Si el material se abriera solo, el paso
 *      arrancaría con la respuesta a la vista y la pregunta abajo. El
 *      pastor decide cuándo consultarlo, igual que decidiría abrir un
 *      comentario.
 *
 *   3. **No se renderiza cuando no hay nada.** Un panel vacío que dice
 *      "tu paper no aportó nada a este paso" es ruido; los pasos
 *      `function`, `timelessPrinciple` e `insight` nunca reciben
 *      material a propósito, y ahí el silencio es la respuesta correcta.
 */
export function PaperStudyReferencePanel({ reference, stepKey }: Props) {
    const { t } = useTranslation('generator');
    const [open, setOpen] = useState(false);

    const items = reference.byStep[stepKey] ?? [];
    if (items.length === 0) return null;

    return (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors"
            >
                <FileText className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <span className="flex-1 text-sm font-medium text-amber-900 dark:text-amber-200">
                    {t('paperReference.title', {
                        paperTitle: reference.paperTitle,
                        count: items.length,
                    })}
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="px-3 pb-3 space-y-3">
                    <p className="text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-300/70">
                        {t('paperReference.disclaimer')}
                    </p>
                    <ul className="space-y-2.5">
                        {items.map((item, i) => (
                            <li
                                key={`${item.verseLabel}-${item.label}-${i}`}
                                className="rounded-md bg-background/70 border border-amber-200/70 dark:border-amber-900/40 px-3 py-2"
                            >
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-foreground">
                                        {item.label}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                        {item.verseLabel}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                                    {item.detail}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
