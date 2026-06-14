import type { ElementoEstudio, ElementoTipo } from './types';

/**
 * `serializarEstudio(elementos, orden) → markdown` (spec §4.1).
 *
 * Función PURA y DETERMINISTA: mismo input ⇒ mismo markdown. Es el puente que
 * mantiene intacto el pipeline existente — el markdown resultante es lo que
 * `buildPlanPrompt` consume como "Material de estudio del docente", igual que
 * hoy. Lo único que cambia upstream es que ese markdown ahora puede nacer de
 * los elementos cristalizados en vez del resumen libre de la conversación.
 *
 * No valida fidelidad (eso es `validarEstudioMadre`) ni el esquema del plan
 * (eso es `validatePlan`). Solo transcribe contenido a prosa legible.
 */

/** Encabezado humano por tipo de elemento (vocabulario de la skill). */
const ETIQUETA: Record<ElementoTipo, string> = {
    // Formativo (Asistente A)
    idea_central: 'Idea central',
    observacion: 'Observación',
    testigo: 'Testigo',
    testigo_historico: 'Testigo histórico',
    error_confrontado: 'Error confrontado',
    aplicacion: 'Aplicación',
    // Experto (Asistente B)
    marco: 'Marco',
    argumento: 'Argumento',
    contraargumento: 'Contraargumento',
    cita: 'Cita',
    ilustracion: 'Ilustración',
    conclusion: 'Conclusión',
};

/**
 * Devuelve los elementos en la secuencia de entrega.
 *
 * - Si `orden` (lista de ids) viene dado, respeta esa secuencia y descarta ids
 *   inexistentes; los elementos no nombrados se anexan al final por su `orden`.
 *   (Habilita el reordenamiento didáctico por transposición sin mutar el estudio.)
 * - Si no, ordena por el campo `orden` de cada elemento (estable ante empates
 *   por el índice original).
 */
function secuenciar(elementos: ElementoEstudio[], orden?: string[]): ElementoEstudio[] {
    if (orden && orden.length > 0) {
        const porId = new Map(elementos.map((e) => [e.id, e]));
        const usados = new Set<string>();
        const enOrden: ElementoEstudio[] = [];
        for (const id of orden) {
            const el = porId.get(id);
            if (el && !usados.has(id)) {
                enOrden.push(el);
                usados.add(id);
            }
        }
        const resto = elementos
            .filter((e) => !usados.has(e.id))
            .sort((a, b) => a.orden - b.orden);
        return [...enOrden, ...resto];
    }
    // Copia antes de ordenar: no mutar el array del llamador.
    return [...elementos].sort((a, b) => a.orden - b.orden);
}

export function serializarEstudio(elementos: ElementoEstudio[], orden?: string[]): string {
    const secuencia = secuenciar(elementos, orden);
    const bloques = secuencia
        .map((el) => {
            const contenido = el.contenido.trim();
            if (!contenido) return '';
            const etiqueta = ETIQUETA[el.tipo] ?? el.tipo;
            return `## ${etiqueta}\n\n${contenido}`;
        })
        .filter((b) => b.length > 0);
    return bloques.join('\n\n');
}
