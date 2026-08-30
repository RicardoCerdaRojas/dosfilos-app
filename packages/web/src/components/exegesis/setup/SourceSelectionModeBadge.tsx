import { useTranslation } from 'react-i18next';
import { Crosshair, Sparkles } from 'lucide-react';
import type { ExcerptSelectionMode } from '@dosfilos/domain';

/**
 * Dice cómo se eligieron los fragmentos de una fuente.
 *
 * No es decoración: son dos niveles de confianza distintos. `structural`
 * significa que se tomó la sección del comentario dedicada al pasaje, corrida
 * y completa. `semantic` significa que se trajeron los fragmentos más
 * parecidos a una consulta — sirve, pero puede traer material de otro pasaje
 * y dejar afuera parte del que importa.
 *
 * El usuario necesita poder distinguirlas al revisar el corpus, porque la
 * acción que corresponde es distinta: la aproximada conviene revisarla
 * fragmento por fragmento antes de generar.
 *
 * No renderiza nada cuando la fuente es anterior a la selección estructural
 * (`null`): afirmar un modo que no se registró sería inventar.
 */
export function SourceSelectionModeBadge({ mode }: { mode: ExcerptSelectionMode | null }) {
    const { t } = useTranslation('exegesis');

    if (!mode) return null;

    const isStructural = mode === 'structural';
    const Icon = isStructural ? Crosshair : Sparkles;
    const label = isStructural
        ? t('paperSetup.subSteps.corpus.list.selectionMode.structural')
        : t('paperSetup.subSteps.corpus.list.selectionMode.semantic');
    const hint = isStructural
        ? t('paperSetup.subSteps.corpus.list.selectionMode.structuralHint')
        : t('paperSetup.subSteps.corpus.list.selectionMode.semanticHint');

    const tone = isStructural
        ? 'bg-info-subtle text-info-subtle-foreground border-info/30'
        : 'bg-warning-subtle text-warning-subtle-foreground border-warning/30';

    return (
        <span
            className={`text-[10px] font-medium rounded-full border px-1.5 py-0 leading-tight inline-flex items-center gap-1 ${tone}`}
            title={hint}
        >
            <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
            {label}
        </span>
    );
}
