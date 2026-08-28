import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildAnnotationAnchor, resolveAnnotationAnchor } from '@dosfilos/domain';
import type { InkNote, InkStroke } from '@dosfilos/domain';

import { SermonSection } from '@/core/utils/sermonSections';
import { AnnotationRepositoryImpl } from '@/data/repositories/annotation.repository.impl';
import type { AnchorRect } from '@/presentation/components/preach/InkLayer';

const repository = new AnnotationRepositoryImpl();

/**
 * Notas de tinta ancladas al texto.
 *
 * El hook sostiene el mapa de dónde está cada palabra en pantalla —lo reporta
 * el cuerpo mientras se dibuja— y con eso resuelve dos cosas: dónde pintar
 * una nota guardada, y a qué palabra anclar un trazo nuevo.
 */
export function useInkNotes(sermonId: string, section: SermonSection | undefined) {
    const queryClient = useQueryClient();
    const [penActive, setPenActive] = useState(false);

    /** offset del texto → rectángulo en pantalla. Lo llena el cuerpo. */
    const wordRects = useRef<Map<number, AnchorRect>>(new Map());
    /** Nota abierta por ancla, para que trazos seguidos no creen documentos sueltos. */
    const noteByOffset = useRef<Map<number, string>>(new Map());

    const { data: notes } = useQuery({
        queryKey: ['ink', sermonId],
        queryFn: () => repository.listInk(sermonId),
        enabled: !!sermonId,
        staleTime: Infinity,
    });

    const sectionNotes = section
        ? (notes ?? []).filter((n) => n.sectionSlug === section.slug)
        : [];

    const rememberWord = (offset: number, rect: AnchorRect) => {
        wordRects.current.set(offset, rect);
    };

    /** Palabra más cercana a un punto de pantalla, para anclar un trazo nuevo. */
    const anchorAt = (screenX: number, screenY: number) => {
        if (!section) return null;
        let bestOffset: number | null = null;
        let bestRect: AnchorRect | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const [offset, rect] of wordRects.current.entries()) {
            // Se mide contra el renglón, no contra el punto exacto: se escribe
            // AL LADO de lo que se anota, no encima.
            const dy = Math.abs(screenY - (rect.y + rect.height / 2));
            const dx = Math.max(0, rect.x - screenX);
            const distance = dy * 3 + dx;
            if (distance < bestDistance) {
                bestDistance = distance;
                bestOffset = offset;
                bestRect = rect;
            }
        }
        return bestOffset !== null && bestRect ? { offset: bestOffset, rect: bestRect } : null;
    };

    const anchorRectFor = (note: InkNote): AnchorRect | null => {
        if (!section) return null;
        // El ancla se re-resuelve contra el texto ACTUAL: si el sermón se editó
        // en la web, la nota sigue encontrando su pasaje.
        const at = resolveAnnotationAnchor(note, section.body);
        if (!at) return null;
        return wordRects.current.get(at.start) ?? null;
    };

    const append = useMutation({
        mutationFn: async ({ offset, stroke }: { offset: number; stroke: InkStroke }) => {
            if (!section) return;
            const existing = noteByOffset.current.get(offset);
            const anchor = buildAnnotationAnchor(
                section.slug,
                section.body,
                offset,
                Math.min(offset + 24, section.body.length),
            );
            const id = await repository.appendInkStroke(sermonId, anchor, stroke, existing);
            noteByOffset.current.set(offset, id);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ink', sermonId] }),
    });

    return {
        notes: sectionNotes,
        penActive,
        setPenActive,
        rememberWord,
        anchorAt,
        anchorRectFor,
        addStroke: (offset: number, stroke: InkStroke) => append.mutate({ offset, stroke }),
    };
}
