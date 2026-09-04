import type { ParsedCitation } from '@dosfilos/domain';

/**
 * Reconocimiento de citas inline.
 *
 * Tres formas, porque el sistema emite tres. La forma canónica es
 * `(Autor, "Título", p. N)` —la que el prompt pide y la que escribe
 * `DeterministicStyleFormatter`—, pero un paper real de Santiago
 * 1:1-5 salió con `Adamson (p. 53)` de punta a punta y el verificador
 * no reconoció ninguna: cero citas detectadas, cero dudas reportadas,
 * verde por vacío. Y había algo que atrapar — una cita corrida por una
 * página y un ejemplo griego que no estaba en el libro citado.
 *
 * Un verificador que sólo lee su propio formato no verifica: certifica
 * su formato.
 *
 * El precio de admitir las formas sin comillas es algún falso
 * positivo —«Santiago (p. 3)» parece una cita y no lo es—. Se paga a
 * conciencia: una fila «no se encontró la fuente» es visible y el
 * usuario la descarta en un segundo; el silencio de antes no era
 * visible para nadie.
 */

/** `(Autor, "Título", p. N)` — la forma canónica, con título entre comillas. */
const QUOTED_CITATION =
    /\(\s*([^,()]+?)\s*,\s*"([^"]+)"(?:\s*,\s*(?:pp?\.\s*)?([\d–\-—,\s]+))?\s*\)/g;

/** `(Autor, p. N)` y `(Autor, N)` — sin título. */
const UNQUOTED_CITATION =
    /\(\s*([^,()"]{2,60}?)\s*,\s*(?:pp?\.\s*)?(\d[\d–\-—,\s]*?)\s*\)/g;

/**
 * `Adamson (p. 53)` — el autor queda fuera del paréntesis. Se exige
 * inicial mayúscula en el nombre para no confundir un paréntesis
 * numérico cualquiera con una cita.
 *
 * Se toma UNA sola palabra, la pegada al paréntesis. Admitir dos
 * arrastraba la mayúscula de comienzo de oración —«Primero Adamson
 * (p. 53)» daba el autor «Primero Adamson»— y las claves de cita de
 * este producto son apellidos de una palabra.
 */
const AUTHOR_BEFORE_PAGE =
    /(\p{Lu}[\p{L}.'’-]+)\s*\(\s*(?:pp?\.\s*)?(\d[\d–\-—,\s]*?)\s*\)/gu;

interface RawMatch {
    raw: string;
    author: string;
    title: string;
    pages: string | null;
    offset: number;
    end: number;
}

function collect(
    markdown: string,
    regex: RegExp,
    read: (m: RegExpExecArray) => { author: string; title: string; pages: string | null },
): RawMatch[] {
    const out: RawMatch[] = [];
    // Los patrones son de módulo y llevan `g`: sin este reset una
    // llamada seguiría donde terminó la anterior.
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(markdown)) !== null) {
        const { author, title, pages } = read(match);
        out.push({
            raw: match[0]!,
            author: author.trim(),
            title: title.trim(),
            pages: pages ? pages.trim() : null,
            offset: match.index,
            end: match.index + match[0]!.length,
        });
    }
    return out;
}

/**
 * Parses every inline citation in `markdown` plus its surrounding
 * "claim text" — the closest preceding `"..."` block, or the
 * containing sentence as fallback. Pure function.
 *
 * Cuando dos formas se solapan sobre el mismo texto gana la más rica:
 * `(Adamson, "The Epistle of James", p. 53)` se lee entera, y no como
 * un `(Autor, N)` recortado adentro.
 */
export function parseCitations(markdown: string): ParsedCitation[] {
    const matches = [
        ...collect(markdown, QUOTED_CITATION, m => ({
            author: m[1] ?? '',
            title: m[2] ?? '',
            pages: m[3] ?? null,
        })),
        ...collect(markdown, UNQUOTED_CITATION, m => ({
            author: m[1] ?? '',
            title: '',
            pages: m[2] ?? null,
        })),
        ...collect(markdown, AUTHOR_BEFORE_PAGE, m => ({
            author: m[1] ?? '',
            title: '',
            pages: m[2] ?? null,
        })),
    ]
        // Más rica primero (con título), y a igualdad la más larga:
        // así la que sobrevive al solapamiento es la que más dice.
        .sort((a, b) => (b.title ? 1 : 0) - (a.title ? 1 : 0) || (b.end - b.offset) - (a.end - a.offset));

    const accepted: RawMatch[] = [];
    for (const candidate of matches) {
        const overlaps = accepted.some(a => candidate.offset < a.end && a.offset < candidate.end);
        if (!overlaps) accepted.push(candidate);
    }

    return accepted
        .sort((a, b) => a.offset - b.offset)
        .map(m => {
            const evidence = extractEvidence(markdown, m.offset);
            return {
                raw: m.raw,
                author: m.author,
                title: m.title,
                pages: m.pages,
                offset: m.offset,
                evidence: evidence.text,
                evidenceIsQuoted: evidence.fromQuote,
            };
        });
}

/**
 * Extracts the text the citation is asserting comes from the source.
 * Strategy:
 *   1. If a `"..."` quote ends within ~200 chars before the citation,
 *      use that quote (high-confidence verbatim claim).
 *   2. Otherwise, walk back to the nearest sentence boundary
 *      (`.`/`!`/`?`/`\n\n`) and use that sentence (paraphrase claim).
 *
 * The window cap (200 chars / 1 sentence) keeps the evidence focused —
 * a paragraph-sized claim against a paragraph-sized excerpt would
 * always land in fuzzy-low territory because the noise dominates.
 */
function extractEvidence(
    markdown: string,
    citationOffset: number,
): { text: string; fromQuote: boolean } {
    // Search the 250-char window preceding the citation for a closing
    // quote. Use the LAST one (closest to the cite) — earlier quotes
    // in the same paragraph belong to other claims.
    const lookBack = Math.max(0, citationOffset - 250);
    const window = markdown.slice(lookBack, citationOffset);
    const lastQuoteEnd = window.lastIndexOf('"');
    if (lastQuoteEnd > 0) {
        // Find the matching opening quote by walking backwards.
        const quoteOpenIdx = window.lastIndexOf('"', lastQuoteEnd - 1);
        if (quoteOpenIdx >= 0 && lastQuoteEnd - quoteOpenIdx >= 4) {
            const quoteText = window.slice(quoteOpenIdx + 1, lastQuoteEnd).trim();
            if (quoteText.length >= 8) {
                return { text: quoteText, fromQuote: true };
            }
        }
    }

    // Fallback: containing sentence. Walk back to the previous
    // sentence-ending punctuation or paragraph break.
    const sentenceStart = findSentenceStart(markdown, citationOffset);
    const sentence = markdown
        .slice(sentenceStart, citationOffset)
        .replace(/\s+/g, ' ')
        .trim();
    return { text: sentence, fromQuote: false };
}

function findSentenceStart(markdown: string, offset: number): number {
    // Stop at the closest of: `. `, `! `, `? `, `\n\n`, or start of file.
    for (let i = offset - 1; i >= 0; i--) {
        const c = markdown[i];
        const next = markdown[i + 1];
        if ((c === '.' || c === '!' || c === '?') && (next === ' ' || next === '\n')) {
            return i + 2;
        }
        if (c === '\n' && next === '\n') return i + 2;
    }
    return 0;
}
