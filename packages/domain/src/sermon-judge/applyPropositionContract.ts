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
    /** La aplicación de ESTE punto. Una por punto. */
    application?: string;
    /**
     * El pasaje que ESTE punto expone, escrito por el pastor.
     *
     * Vacío significa "que lo siga deduciendo del título", no "sin pasaje": por
     * eso la clave se omite en vez de guardarse como cadena vacía. Guardar ''
     * congelaría la deducción en nada y el sermón quedaría sin el texto que
     * expone — un dato en blanco que nadie escribió y nadie mantiene.
     */
    passageRef?: string;
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
        const application = (p.application ?? '').trim();
        // La clave se OMITE si está vacía en vez de viajar como '' — el campo es
        // opcional y un string vacío en Firestore se lee como "hay aplicación,
        // pero es nada", que es distinto de "todavía no hay".
        const app = application ? { application } : {};
        // Misma regla para el pasaje: vacío = seguir deduciéndolo del título.
        const ref = (p.passageRef ?? '').trim();
        const passage = ref ? { passageRef: ref } : {};
        // Si el pastor BORRÓ lo que había escrito, la clave debe desaparecer —
        // no basta con omitirla del patch, porque `...src` la traería de vuelta
        // y su borrado no tendría efecto.
        const base = src ? { ...src } : { title: p.title, description: '', scriptureReferences: [] };
        if (!ref) delete (base as { passageRef?: string }).passageRef;
        return { ...base, title: p.title, ...app, ...passage };
    });
    return {
        ...homiletics,
        homileticalProposition: patch.proposition,
        outline: { ...(homiletics.outline ?? {}), mainPoints },
    };
}
