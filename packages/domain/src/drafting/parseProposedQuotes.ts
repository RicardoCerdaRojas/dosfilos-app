import type { QuotableSource } from './buildAuthorityQuotePrompt';
import type { ProposedElement } from './parseProposedElements';

/** Una cita propuesta, con su atribución ya resuelta desde nuestros datos. */
export interface ProposedQuote extends ProposedElement {
    /** Texto listo para el púlpito: la cita más su atribución. */
    text: string;
    source: QuotableSource;
    /**
     * El fragmento COMPLETO del que salió, para que el pastor vea la cita en su
     * contexto ANTES de decidir — que es cuando puede juzgar si dice lo que
     * parece decir. Verificar después de publicar no sirve de nada.
     */
    excerpt: string;
}

/** Normaliza para comparar: espacios, comillas tipográficas y mayúsculas. */
function normalizar(t: string): string {
    return t
        .toLowerCase()
        .replace(/[“”«»"']/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Marca de recorte que el prompt autoriza. */
const RECORTE = /\[\s*\.\.\.\s*\]|\[…\]|…/g;

/**
 * VERIFICA que la cita esté REALMENTE en el fragmento que dice citar.
 *
 * Es la garantía que convierte "le pedimos que copie" en "comprobamos que
 * copió". El prompt puede prohibir alterar el texto; sólo esto lo detecta.
 * Se permiten los recortes con […] que el prompt autoriza: cada trozo debe
 * aparecer en el fragmento, aunque no sean contiguos.
 */
function estaEnLaFuente(cita: string, fuente: string): boolean {
    const base = normalizar(fuente);
    return cita
        .split(RECORTE)
        .map((trozo) => normalizar(trozo))
        .filter((trozo) => trozo.length > 0)
        .every((trozo) => base.includes(trozo));
}

/**
 * Lee las citas propuestas y les pone la atribución DESDE NUESTROS DATOS.
 *
 * EL MODELO NO ESCRIBE LA ATRIBUCIÓN. Antes se le pedía dentro del texto y la
 * omitió: llegaron citas sin autor ni obra, que en un sermón son peores que
 * ninguna cita. La atribución viene con el fragmento que recuperamos de la
 * biblioteca — es un dato nuestro, y pedírselo a él era darle ocasión de
 * perderlo o de equivocarlo.
 *
 * SE DESCARTA lo que no se puede verificar: un índice que no existe, o una
 * cita cuyo texto no está en el fragmento que dice citar. Mostrar una cita
 * alterada con atribución real es exactamente el daño que este flujo evita.
 */
export function parseProposedQuotes(raw: string, sources: readonly QuotableSource[]): ProposedQuote[] {
    const inicio = raw.indexOf('{');
    const fin = raw.lastIndexOf('}');
    if (inicio === -1 || fin <= inicio) return [];

    let parsed: { elements?: unknown };
    try {
        parsed = JSON.parse(raw.slice(inicio, fin + 1)) as { elements?: unknown };
    } catch {
        return [];
    }
    if (!Array.isArray(parsed.elements)) return [];

    const citas: ProposedQuote[] = [];
    for (const crudo of parsed.elements) {
        const e = crudo as { sourceIndex?: unknown; text?: unknown; why?: unknown };
        const texto = typeof e.text === 'string' ? e.text.trim() : '';
        // El prompt numera desde 1; el arreglo desde 0.
        const indice = Number(e.sourceIndex) - 1;
        const fuente = sources[indice];
        if (!texto || !fuente) continue;
        if (!estaEnLaFuente(texto, fuente.excerpt)) continue;

        const atribucion = [fuente.author, fuente.title, fuente.page && `p. ${fuente.page}`]
            .filter(Boolean)
            .join(', ');

        citas.push({
            text: atribucion ? `"${texto}" — ${atribucion}` : `"${texto}"`,
            why: typeof e.why === 'string' ? e.why.trim() : '',
            source: fuente,
            excerpt: fuente.excerpt,
        });
    }
    return citas;
}
