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
    apiKey: string,
): Promise<{ uri: string; name: string }> {
    const blob = new Blob([text], { type: 'text/plain' });
    const init = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': String(blob.size),
                'X-Goog-Upload-Header-Content-Type': 'text/plain',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file: { displayName } }),
        },
    );
    if (!init.ok) throw new Error(`Gemini init upload failed: ${init.statusText}`);
    const uploadUrl = init.headers.get('x-goog-upload-url');
    if (!uploadUrl) throw new Error('No upload URL from Gemini');

    const upload = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'upload, finalize',
            'X-Goog-Upload-Offset': '0',
            'Content-Length': String(blob.size),
        },
        body: blob,
    });
    if (!upload.ok) throw new Error(`Gemini upload failed: ${upload.statusText}`);
    const r = (await upload.json()) as { file: { uri: string; name: string } };
    return { uri: r.file.uri, name: r.file.name };
}
