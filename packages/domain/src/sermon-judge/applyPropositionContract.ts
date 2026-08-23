import type { HomileticalAnalysis } from '../entities/SermonGenerator';

/**
 * Aplica proposición y puntos EN UNA SOLA ESCRITURA.
 *
 * Son un contrato: los puntos heredan el sustantivo y el llamado a la acción de
 * la proposición. Guardarlos por separado es lo que permitía que quedaran
 * desalineados sin que nada avisara.
 *
 * Función pura y en dominio a propósito: acá es donde viviría una corrupción
 * silenciosa —descripciones pegadas al punto equivocado— y eso tiene que ser
 * testeable sin montar la UI.
 */

export interface PointPatch {
    title: string;
    /**
     * Posición ORIGINAL del punto, o `null` si es nuevo.
     *
     * Es lo que preserva la descripción y las referencias cuando el pastor
     * reordena o borra un punto del medio. Sin esta identidad, mapear por
     * posición pegaría el contenido del punto 3 al título del punto 2 — un
     * error que no se ve en pantalla y aparece en el púlpito.
     */
    srcIndex: number | null;
}

export function applyPropositionContract(
    homiletics: HomileticalAnalysis,
    patch: { proposition: string; points: readonly PointPatch[] },
): HomileticalAnalysis {
    const prev = homiletics.outline?.mainPoints ?? [];
    const mainPoints = patch.points.map((p) => {
        const src = p.srcIndex !== null ? prev[p.srcIndex] : undefined;
        // Un punto nuevo nace VACÍO: el sistema abre el espacio para que el
        // pastor lo escriba, no le inventa el contenido.
        return src
            ? { ...src, title: p.title }
            : { title: p.title, description: '', scriptureReferences: [] };
    });
    return {
        ...homiletics,
        homileticalProposition: patch.proposition,
        outline: { ...(homiletics.outline ?? {}), mainPoints },
    };
}
