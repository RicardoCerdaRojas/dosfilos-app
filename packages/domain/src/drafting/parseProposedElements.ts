export interface ProposedElement {
    text: string;
    /** Por qué sirve a ESTE sermón, en una línea. */
    why: string;
    /**
     * El concepto que este elemento cubre NO tiene apoyo directo en el texto.
     *
     * Es un aviso al pastor, no parte de la idea: se muestra como marca al lado
     * y NUNCA entra en `text`. Si entrara, el prefijo viajaría con el elemento
     * decidido y terminaría filtrándose a la prosa del sermón.
     */
    unsupported?: boolean;
}

/**
 * El modelo a veces escribe la advertencia DENTRO del texto en vez de usar el
 * campo. Pasó en el primer uso real: "SIN APOYO TEXTUAL DIRECTO: Aunque el
 * texto no lo dice…". Se recorta y se convierte en la marca — perder el aviso
 * sería peor que el prefijo, y dejarlo en el texto lo llevaría al púlpito.
 */
const PREFIJO_SIN_APOYO = /^\s*SIN APOYO TEXTUAL(?:\s+DIRECTO)?\s*:\s*/i;

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
            .map((e) => {
                const crudo = e.text.trim();
                const conPrefijo = PREFIJO_SIN_APOYO.test(crudo);
                return {
                    text: crudo.replace(PREFIJO_SIN_APOYO, '').trim(),
                    why: typeof e.why === 'string' ? e.why.trim() : '',
                    unsupported: e.unsupported === true || conPrefijo,
                };
            })
            .filter((e) => e.text.length > 0);
    } catch {
        return [];
    }
}
