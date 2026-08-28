import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { buildAnnotationAnchor, resolveAnnotationAnchor } from '@dosfilos/domain';
import type { HighlightColor, ReadingBlock } from '@dosfilos/domain';

import { SermonSection } from '@/core/utils/sermonSections';
import { useAnnotations, useHighlightMutations } from '@/presentation/hooks/useAnnotations';
import { ResolvedHighlight } from '@/presentation/components/preach/PreachSectionBody';
import { HighlightScope } from '@/presentation/components/preach/HighlightPalette';

/** Frase concreta bajo el dedo: bloque + unidad dentro del bloque. */
interface PendingTarget {
    blockIndex: number;
    unitIndex: number;
}

/**
 * Orquesta el resaltado por tap largo del modo púlpito (plan §6, F1):
 * reancla las marcas guardadas contra el cuerpo crudo de la sección visible,
 * resuelve el rango según el alcance elegido y aplica alta/recolor/borrado.
 *
 * Vive fuera de la pantalla a propósito: la pantalla ya carga timer, modos de
 * luz, navegación por secciones y citas.
 */
export function usePreachHighlights(
    sermonId: string,
    section: SermonSection | undefined,
    blocks: ReadingBlock[],
    hapticsEnabled: boolean,
) {
    const [pending, setPending] = useState<PendingTarget | null>(null);
    const [scope, setScope] = useState<HighlightScope>('sentence');

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
                  return at ? { id: a.id, color: a.color, start: at.start, end: at.end } : null;
              })
              .filter((h): h is ResolvedHighlight => h !== null)
        : [];

    /** Rango a marcar según el alcance elegido: la frase o el párrafo entero. */
    const pendingRange = (() => {
        if (pending === null) return null;
        const units = blocks[pending.blockIndex]?.units ?? [];
        const unit = units[pending.unitIndex];
        if (!unit) return null;
        if (scope === 'sentence') return { start: unit.sourceStart, end: unit.sourceEnd };
        return { start: units[0].sourceStart, end: units[units.length - 1].sourceEnd };
    })();

    // Misma regla de cobertura que pinta el cuerpo: más de media unidad.
    const pendingHighlight = pendingRange
        ? highlights.find(
              (h) =>
                  Math.min(h.end, pendingRange.end) - Math.max(h.start, pendingRange.start) >
                  (pendingRange.end - pendingRange.start) / 2,
          ) ?? null
        : null;

    const openPalette = (blockIndex: number, unitIndex: number) => {
        // El pulso confirma que el texto quedó agarrado: en el púlpito nadie
        // se queda mirando si el panel ya abrió. En e-ink no hay pulso porque
        // ese modo apaga todo lo que no sea tinta.
        if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPending({ blockIndex, unitIndex });
    };

    const applyColor = (color: HighlightColor) => {
        if (!section || !pendingRange) return;
        if (pendingHighlight) {
            if (pendingHighlight.color !== color) {
                recolor.mutate({ id: pendingHighlight.id, color });
            }
        } else {
            create.mutate({
                anchor: buildAnnotationAnchor(
                    section.slug,
                    section.body,
                    pendingRange.start,
                    pendingRange.end,
                ),
                color,
            });
        }
        setPending(null);
    };

    const removeHighlight = () => {
        if (pendingHighlight) remove.mutate(pendingHighlight.id);
        setPending(null);
    };

    return {
        highlights,
        paletteOpen: pending !== null,
        scope,
        setScope,
        pendingColor: pendingHighlight?.color ?? null,
        openPalette,
        applyColor,
        removeHighlight,
        closePalette: () => setPending(null),
    };
}
