import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { buildAnnotationAnchor, resolveAnnotationAnchor } from '@dosfilos/domain';
import type { HighlightColor, MarkStyle } from '@dosfilos/domain';

import { SermonSection } from '@/core/utils/sermonSections';
import { useAnnotations, useHighlightMutations } from '@/presentation/hooks/useAnnotations';
import { ResolvedHighlight } from '@/presentation/components/preach/PreachSectionBody';
import { SelectionRange } from '@/presentation/components/preach/SelectableParagraph';

/**
 * Marcas del predicador sobre el sermón (plan §6, M-05).
 *
 * La unidad de selección es el RANGO de caracteres en el cuerpo crudo de la
 * sección, no un índice de bloque. Antes se pasaban `(bloque, unidad)` y eso
 * se rompió apenas apareció la paginación: el cuerpo empezó a emitir índices
 * locales a la página mientras el hook los resolvía contra toda la sección.
 * Un rango de offsets no tiene ese problema — es la misma coordenada que usa
 * el ancla que se guarda.
 */
export function usePreachHighlights(
    sermonId: string,
    section: SermonSection | undefined,
    hapticsEnabled: boolean,
) {
    /** Lo que el dedo está seleccionando ahora mismo. */
    const [selection, setSelection] = useState<SelectionRange | null>(null);
    /** Selección confirmada, con la Y donde soltó, para colocar el popover. */
    const [pending, setPending] = useState<{ range: SelectionRange; y: number } | null>(null);

    const { data: annotations } = useAnnotations(sermonId);
    const { create, recolor, remove } = useHighlightMutations(sermonId);

    // Las marcas se reanclan contra el cuerpo CRUDO de la sección: el sermón
    // pudo editarse en la web después de que se hicieron, y una que ya no
    // encuentra su texto se oculta sin borrarse (la marca es del pastor).
    const highlights: ResolvedHighlight[] = section
        ? (annotations ?? [])
              .filter((a) => a.sectionSlug === section.slug)
              .map((a) => {
                  const at = resolveAnnotationAnchor(a, section.body);
                  return at
                      ? {
                            id: a.id,
                            color: a.color,
                            style: a.style ?? 'highlight',
                            start: at.start,
                            end: at.end,
                        }
                      : null;
              })
              .filter((h): h is ResolvedHighlight => h !== null)
        : [];

    /** Marca que cubre a la vez el punto dado. Para pintar palabra por palabra. */
    const markAt = (sourceStart: number): ResolvedHighlight | null =>
        highlights.find((h) => sourceStart >= h.start && sourceStart < h.end) ?? null;

    const pendingMark = pending
        ? (highlights.find(
              (h) =>
                  Math.min(h.end, pending.range.end) - Math.max(h.start, pending.range.start) > 0,
          ) ?? null)
        : null;

    const beginSelection = (range: SelectionRange | null) => {
        // El pulso confirma que el texto quedó agarrado: en el púlpito nadie
        // se queda mirando si la selección prendió. En e-ink no hay motor.
        if (range && !selection && hapticsEnabled) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setSelection(range);
    };

    const endSelection = (range: SelectionRange, y: number) => {
        setSelection(range);
        setPending({ range, y });
    };

    const applyMark = (color: HighlightColor, style: MarkStyle) => {
        if (!section || !pending) return;
        if (pendingMark) {
            if (pendingMark.color !== color || pendingMark.style !== style) {
                recolor.mutate({ id: pendingMark.id, color, style });
            }
        } else {
            create.mutate({
                anchor: buildAnnotationAnchor(
                    section.slug,
                    section.body,
                    pending.range.start,
                    pending.range.end,
                ),
                color,
                style,
            });
        }
        close();
    };

    const removeMark = () => {
        if (pendingMark) remove.mutate(pendingMark.id);
        close();
    };

    const close = () => {
        setPending(null);
        setSelection(null);
    };

    return {
        highlights,
        markAt,
        selection,
        beginSelection,
        endSelection,
        popoverOpen: pending !== null,
        popoverY: pending?.y ?? 0,
        pendingColor: pendingMark?.color ?? null,
        pendingStyle: pendingMark?.style ?? null,
        applyMark,
        removeMark,
        close,
    };
}
