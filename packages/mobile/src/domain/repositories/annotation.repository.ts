import type { HighlightColor, SermonAnnotation, SermonAnnotationAnchor } from '@dosfilos/domain';

/**
 * Puerto de las marcas del predicador sobre su sermón (plan Púlpito M-05).
 * F1 solo escribe resaltados; la tinta y los glifos de F2 entran por aquí.
 */
export interface AnnotationRepository {
    /** Todas las anotaciones del sermón, de todas las secciones. */
    list(sermonId: string): Promise<SermonAnnotation[]>;
    /** Crea un resaltado y devuelve el registro ya con id. */
    createHighlight(
        sermonId: string,
        anchor: SermonAnnotationAnchor,
        color: HighlightColor,
    ): Promise<SermonAnnotation>;
    /** Cambia el color de un resaltado existente (LWW por `updatedAt`). */
    updateColor(sermonId: string, annotationId: string, color: HighlightColor): Promise<void>;
    remove(sermonId: string, annotationId: string): Promise<void>;
}
