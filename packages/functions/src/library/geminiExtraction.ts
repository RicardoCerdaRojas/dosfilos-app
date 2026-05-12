import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pagesToMarkedText, pagesToMarkdown } from './llamaParseClient';

// ── Batched Gemini extraction tuning ────────────────────────────────────
//
// Single-pass Gemini caps at ~65K output tokens, which translates to
// ~50-150 pages depending on density (dense commentaries get squeezed,
// narrative books fit more). Above this threshold we split the PDF
// into smaller per-call chunks via pdf-lib, run extraction on each,
// then concatenate the per-page results. The overall output is identical
// in shape to a single-pass result so the downstream chunker doesn't
// need to know.
//
// `BATCH_THRESHOLD_PAGES` is conservative — well below the safe single-
// pass ceiling so we don't get unlucky with dense books. `CHUNK_SIZE`
// keeps each call well under the token cap. `OVERLAP_PAGES` covers
// the case where Gemini truncates the last page or two of a chunk
// (rare but observed); the next chunk re-processes those pages and
// the dedup keeps the second (fresher) version.
export const BATCH_THRESHOLD_PAGES = 80;
export const CHUNK_SIZE_PAGES = 60;
export const OVERLAP_PAGES = 3;

/**
 * Single PDF page as Gemini returned it. Same shape as `LlamaParsePage`
 * so the formatters downstream work without branching by engine.
 */
interface GeminiPage {
    page: number;
    text: string;
    md?: string;
}

/**
 * Public entry point for Gemini extraction. Routes between single-pass
 * and batched based on `expectedPageCount`. Callers (storage trigger
 * and admin callable) don't need to know which strategy was used; the
 * output shape is identical either way.
 */
export async function extractWithGemini(
    tempFilePath: string,
    resourceId: string,
    apiKey: string,
    expectedPageCount?: number,
): Promise<{ text: string; markdown: string; pageCount: number }> {
    const useBatched = !!expectedPageCount && expectedPageCount > BATCH_THRESHOLD_PAGES;
    if (useBatched) {
        console.log(
            `🤖 [Gemini] expected ${expectedPageCount} pages > ${BATCH_THRESHOLD_PAGES} — using batched extraction`,
        );
        return extractWithGeminiBatched(tempFilePath, resourceId, apiKey, expectedPageCount!);
    }

    const { pages } = await extractGeminiPagesSinglePass(tempFilePath, resourceId, apiKey, expectedPageCount);
    return {
        text: pagesToMarkedText(pages),
        markdown: pagesToMarkdown(pages),
        pageCount: pages.length,
    };
}

/**
 * Single-pass Gemini extraction. Sends the WHOLE PDF in one
 * `generateContent` call. Bound by Gemini's 65K-token output cap which
 * translates to ~50-150 pages depending on density. The router calls
 * this directly for short PDFs and once per chunk for long ones.
 *
 * Truncation safeguards:
 *   1. `finishReason !== 'STOP'` → hard fail (cascade falls back).
 *   2. Returned page count < 80% of `expectedPageCount` → likely silent
 *      truncation, also hard fail. Caller can disable by passing
 *      undefined when the expected count is unknown (chunked calls).
 *
 * Returns structured pages so the batched wrapper can remap page
 * numbers before formatting.
 */
async function extractGeminiPagesSinglePass(
    tempFilePath: string,
    resourceId: string,
    apiKey: string,
    expectedPageCount?: number,
): Promise<{ pages: GeminiPage[] }> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    console.log(`⬆️ [Gemini] Uploading to Gemini Files API...`);
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: 'application/pdf',
        displayName: `${resourceId}.pdf`,
    });

    // Wait for file to be processed (Gemini converts the PDF before
    // the model can read it — non-trivial for big files).
    let geminiFile = await fileManager.getFile(uploadResult.file.name);
    const fileReadyDeadline = Date.now() + 5 * 60 * 1000;
    while (geminiFile.state === FileState.PROCESSING) {
        if (Date.now() > fileReadyDeadline) {
            throw new Error('Gemini file processing exceeded 5 minutes');
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        geminiFile = await fileManager.getFile(uploadResult.file.name);
    }
    if (geminiFile.state === FileState.FAILED) {
        throw new Error('Gemini file processing failed');
    }
    console.log(`✅ [Gemini] File ready: ${geminiFile.displayName}`);

    // Was 'gemini-2.0-flash' until Google deprecated it for new users
    // (404 Not Found, May 2026). Bumped to the live successor.
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 65536,
        },
    });

    const prompt = `Extrae el texto completo de este PDF página por página.

Reglas:
1. Una entrada por página física. Conserva los números de página reales del PDF.
2. Preserva la estructura: encabezados con # / ## (markdown), párrafos separados, listas con -.
3. Preserva con precisión caracteres griegos (α-ω) y hebreos (א-ת).
4. No traduzcas términos teológicos ni citas bíblicas.
5. Mantén tablas en formato markdown cuando aparezcan.
6. NO incluyas el número de página en el contenido (lo capturamos en el campo aparte).

Devuelve JSON con esta estructura exacta:
{
  "pages": [
    { "page": 1, "text": "texto plano", "md": "texto en markdown" }
  ]
}

Si una página está vacía, devuelve string vacío en text/md pero conserva la entrada para no romper la numeración.`;

    const result = await model.generateContent([
        prompt,
        {
            fileData: {
                mimeType: geminiFile.mimeType!,
                fileUri: geminiFile.uri,
            },
        },
    ]);

    // Truncation guard #1 — Gemini sets `finishReason = 'MAX_TOKENS'`
    // when it stopped because the output budget ran out. The JSON
    // returned in that case may be syntactically valid but
    // semantically incomplete (e.g. a 378-page commentary returning
    // only the first 40 pages). Treat this as a hard failure so the
    // cascade falls to pdf-parse, which produces auto-indexable
    // output covering the FULL document.
    const finishReason = result.response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        throw new Error(`Gemini stopped early (finishReason=${finishReason}); response truncated`);
    }

    const responseText = result.response.text();

    let parsed: { pages?: Array<{ page: number; text?: string; md?: string }> };
    try {
        parsed = JSON.parse(responseText);
    } catch (parseError) {
        // With responseMimeType=application/json this path is rare —
        // when it fires, log a slice for debugging but throw to fall
        // back. The pdf-parse fallback now produces auto-indexable
        // output so the user still ends up with searchable content.
        console.error('❌ [Gemini] JSON parse failed even with strict mime type:', responseText.substring(0, 500));
        throw new Error('Failed to parse Gemini response as JSON');
    }

    if (!parsed.pages || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
        throw new Error('Gemini returned no pages');
    }

    // Best-effort cleanup of the Gemini file to avoid quota waste.
    try { await fileManager.deleteFile(geminiFile.name); } catch { /* ignore */ }

    const pages = parsed.pages.map((p, idx) => ({
        page: typeof p.page === 'number' ? p.page : idx + 1,
        text: p.text ?? '',
        md: p.md,
    }));

    // Truncation guard #2 — even when finishReason is STOP, Gemini
    // sometimes silently returns fewer pages than the source PDF
    // contains (especially for very long documents where the model
    // hits an internal soft cap). When the caller passes an
    // `expectedPageCount` from a cheap pdf-parse pre-read, we
    // compare. A returned count below 80% of expected almost
    // certainly means partial extraction → fall back to pdf-parse
    // for the full document.
    //
    // For chunked calls the wrapper passes undefined here (each chunk
    // doesn't independently know its expected size — the wrapper's
    // own completeness check handles that at the end).
    if (expectedPageCount && expectedPageCount > 0) {
        const completeness = pages.length / expectedPageCount;
        if (completeness < 0.8) {
            throw new Error(
                `Gemini returned ${pages.length} of ~${expectedPageCount} pages (${Math.round(completeness * 100)}%); likely truncated`,
            );
        }
    }

    return { pages };
}

/**
 * Batched Gemini extraction. For PDFs above `BATCH_THRESHOLD_PAGES`,
 * splits the source into per-call chunks of `CHUNK_SIZE_PAGES` (with
 * `OVERLAP_PAGES` overlap between consecutive chunks), runs single-pass
 * extraction on each, remaps the per-chunk page numbers to absolute
 * positions in the original PDF, and merges the results.
 *
 * Why split with `pdf-lib` (real PDF surgery) instead of asking Gemini
 * "process pages X-Y": the prompt-based approach is documented as
 * unreliable — Gemini still loads the whole doc and may respond about
 * pages it shouldn't. Splitting guarantees per-call work matches per-call
 * input.
 *
 * Failure modes:
 *   - One chunk fails → throw with chunk context. The cascade then falls
 *     back to pdf-parse for the WHOLE document. We don't try to mix tiers
 *     in a single doc — partial Standard + partial Básico would confuse
 *     the citation pipeline downstream.
 *
 * Time budget: ~25s per chunk (upload + processing wait + JSON parse).
 * A 600-page book in 60-page chunks = 10 chunks ≈ 250s, comfortably
 * within the 540s storage-trigger cap.
 */
async function extractWithGeminiBatched(
    tempFilePath: string,
    resourceId: string,
    apiKey: string,
    totalPageCount: number,
): Promise<{ text: string; markdown: string; pageCount: number }> {
    const sourceBytes = fs.readFileSync(tempFilePath);
    const sourceDoc = await PDFDocument.load(sourceBytes);
    const actualPages = sourceDoc.getPageCount();

    // Compute per-chunk page ranges (1-indexed, inclusive on both ends).
    // Overlap protects against last-page truncation on a chunk; dedup
    // below keeps the second chunk's version of overlap pages because
    // those pages sit at the START of their window (where Gemini is most
    // reliable) rather than the END (where it's most likely to truncate).
    const chunks: Array<{ start: number; end: number }> = [];
    let cursor = 1;
    while (cursor <= actualPages) {
        const start = cursor;
        const end = Math.min(cursor + CHUNK_SIZE_PAGES - 1, actualPages);
        chunks.push({ start, end });
        if (end >= actualPages) break;
        cursor = end - OVERLAP_PAGES + 1;
    }

    console.log(
        `🪓 [Gemini Batched] Splitting ${actualPages} pages into ${chunks.length} chunks (size=${CHUNK_SIZE_PAGES}, overlap=${OVERLAP_PAGES})`,
    );

    const allPages: GeminiPage[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const { start, end } = chunks[i]!;
        const chunkLabel = `${i + 1}/${chunks.length}`;
        console.log(`📦 [Gemini Batched] Chunk ${chunkLabel}: pages ${start}-${end}`);

        // Surgical PDF subset for this chunk. pdf-lib uses 0-indexed
        // page references internally; convert from our 1-indexed range.
        const chunkDoc = await PDFDocument.create();
        const indices = Array.from({ length: end - start + 1 }, (_, idx) => start - 1 + idx);
        const copied = await chunkDoc.copyPages(sourceDoc, indices);
        copied.forEach(p => chunkDoc.addPage(p));
        const chunkBytes = await chunkDoc.save();

        // Write to a unique temp file so concurrent extractions don't
        // race on the same path. Cleaned up after the call regardless
        // of outcome — Gemini Files API copies the bytes server-side.
        const chunkTempPath = path.join(
            os.tmpdir(),
            `${resourceId}-chunk-${i + 1}-${Date.now()}.pdf`,
        );
        fs.writeFileSync(chunkTempPath, chunkBytes);

        try {
            const { pages: chunkPages } = await extractGeminiPagesSinglePass(
                chunkTempPath,
                `${resourceId}-chunk-${i + 1}`,
                apiKey,
                // No expectedPageCount per chunk — the per-chunk
                // completeness check would false-positive when Gemini
                // legitimately returns N pages because that's the chunk
                // size. Whole-doc completeness is checked below instead.
                undefined,
            );

            // Remap each chunk page's local number (1..chunkSize, as
            // Gemini saw the chunk PDF) to its absolute position in the
            // ORIGINAL document. Without this remap, every chunk would
            // claim pages 1..N and the dedup would collapse them all.
            for (const p of chunkPages) {
                allPages.push({
                    page: start + (p.page - 1),
                    text: p.text,
                    md: p.md,
                });
            }
            console.log(`✅ [Gemini Batched] Chunk ${chunkLabel} returned ${chunkPages.length} pages`);
        } finally {
            try { fs.unlinkSync(chunkTempPath); } catch { /* ignore */ }
        }
    }

    // Dedup overlap pages: when chunks overlap, the same page appears
    // twice. Keep the LATER occurrence — for any overlap page, the
    // second chunk's copy was processed at the BEGINNING of that
    // chunk's window (Gemini is most reliable there), while the first
    // chunk's copy was at the END (most likely to be truncated).
    const byPage = new Map<number, GeminiPage>();
    for (const p of allPages) byPage.set(p.page, p);
    const merged = Array.from(byPage.values()).sort((a, b) => a.page - b.page);

    // Whole-doc completeness check. Same 80% floor used by single-pass.
    const completeness = merged.length / actualPages;
    if (completeness < 0.8) {
        throw new Error(
            `Gemini batched extraction returned ${merged.length} of ${actualPages} pages (${Math.round(completeness * 100)}%); likely partial`,
        );
    }

    console.log(
        `🧩 [Gemini Batched] Merged ${merged.length} pages from ${chunks.length} chunks (totalPageCount hint=${totalPageCount})`,
    );

    return {
        text: pagesToMarkedText(merged),
        markdown: pagesToMarkdown(merged),
        pageCount: merged.length,
    };
}
