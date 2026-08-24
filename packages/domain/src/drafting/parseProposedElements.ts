export interface ProposedElement {
    text: string;
    /** Por qué sirve a ESTE sermón, en una línea. */
    why: string;
}

/**
 * Lee la respuesta de `buildElementsPrompt`.
 *
 * VIVE JUNTO AL PROMPT A PROPÓSITO: son las dos mitades de un mismo contrato.
 * Si el formato de salida cambia en el prompt y el parser está en otro paquete,
 * nada falla al compilar y la divergencia aparece en producción como una lista
 * vacía. Acá, cambiar uno sin el otro rompe los tests que están al lado.
 *
 * Tolera envoltorios porque el modelo los pone: ya hubo un caso en producción
 * donde filtró andamiaje de herramienta como texto plano. Un fallo de formato
 * no puede vaciarle la pantalla al pastor.
 */
export function parseProposedElements(raw: string): ProposedElement[] {
    const inicio = raw.indexOf('{');
    const fin = raw.lastIndexOf('}');
    if (inicio === -1 || fin <= inicio) return [];
    try {
        const parsed = JSON.parse(raw.slice(inicio, fin + 1)) as { elements?: unknown };
        if (!Array.isArray(parsed.elements)) return [];
        return parsed.elements
            .map((e) => e as Partial<ProposedElement>)
            .filter((e): e is ProposedElement => typeof e?.text === 'string' && e.text.trim().length > 0)
            .map((e) => ({
                text: e.text.trim(),
                why: typeof e.why === 'string' ? e.why.trim() : '',
            }));
    } catch {
        return [];
    }
}
