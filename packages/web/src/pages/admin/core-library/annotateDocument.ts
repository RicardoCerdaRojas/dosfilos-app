import { uploadTextToGemini } from '@dosfilos/infrastructure';
/**
 * Inserts page-aware citation markers into raw document text so the indexed
 * Gemini chunks always carry author / title / page provenance. Each marker is
 * unique (segment counter) to prevent the embedding pipeline from de-duplicating
 * them as repeated boilerplate.
 *
 * Strategy: split by `--- PAGE n ---` separators (when present) to track page
 * numbers, then within each page-segment insert the marker every ~350 chars at
 * the nearest word boundary.
 */
export function annotateDocumentText(rawText: string, author: string, title: string): string {
    const INTERVAL = 350;
    let segmentCounter = 0;
    const marker = (page: number) => {
        segmentCounter++;
        return ` Fragmento ${segmentCounter} · ${author} · "${title}" · p. ${page}. `;
    };

    const pageRegex = /---\s*PAGE\s*(\d+)\s*---/g;
    const segments: Array<{ text: string; page: number }> = [];
    let lastIndex = 0;
    let currentPage = 1;
    let match: RegExpExecArray | null;

    while ((match = pageRegex.exec(rawText)) !== null) {
        segments.push({ text: rawText.substring(lastIndex, match.index), page: currentPage });
        currentPage = parseInt(match[1]);
        lastIndex = match.index + match[0].length;
    }
    segments.push({ text: rawText.substring(lastIndex), page: currentPage });

    let out = '';
    for (const { text, page } of segments) {
        if (!text.trim()) continue;
        let i = 0;
        while (i < text.length) {
            out += marker(page);
            let end = Math.min(i + INTERVAL, text.length);
            if (end < text.length) {
                const lastSpace = text.lastIndexOf(' ', end);
                if (lastSpace > i + INTERVAL / 2) end = lastSpace;
            }
            out += text.substring(i, end);
            i = end;
        }
    }

    return out;
}

/**
 * Resumable upload of an annotated text blob to the Gemini Files API.
 * Returns the Gemini file URI + name suitable for File Search Store ingestion.
 */
export async function uploadAnnotatedTextToGemini(
    text: string,
    displayName: string,
): Promise<{ uri: string; name: string }> {
    // La subida vive en el servidor (`uploadTextToGemini`). Antes se hacía acá
    // con la clave de Gemini en la query string, visible para cualquiera que
    // abriera DevTools. La negociación resumable en dos pasos no cambió: se
    // mudó de lado.
    return uploadTextToGemini(text, displayName);
}
