import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LlamaParseClient, pagesToMarkedText, pagesToMarkdown } from './llamaParseClient';
import { recordLlamaParseUsage, selectAllLlamaParseAccounts, type SelectedLlamaParseAccount } from './llamaParseAccountSelector';
import { consumePagesAdmin, type ProcessingMode } from './processingBalance';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');


// Gemini file size limit is 50MB (per-call upload to the Files API).
// Files larger than this skip Gemini and fall to pdf-parse.
const MAX_GEMINI_FILE_SIZE = 50 * 1024 * 1024;
// LlamaParse supports up to 100MB (and we've verified free-tier covers typical theology books)
const MAX_LLAMAPARSE_FILE_SIZE = 100 * 1024 * 1024;

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
const BATCH_THRESHOLD_PAGES = 80;
const CHUNK_SIZE_PAGES = 60;
const OVERLAP_PAGES = 3;

// Get API key from environment
const getApiKey = (): string => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable not set');
    }
    return apiKey;
};

/**
 * LlamaParse extraction — primary path.
 * Returns structured pages with reliable page numbers, plus the
 * actual credits consumed (NOT page count) so the per-account
 * counter mirrors what LlamaParse actually billed. Cached jobs and
 * some operations cost 0 credits even when pages are returned.
 */
async function extractWithLlamaParse(
    tempFilePath: string,
    resourceId: string,
    apiKey: string
): Promise<{ text: string; markdown: string; pageCount: number; creditsUsed: number }> {
    const buffer = fs.readFileSync(tempFilePath);
    const client = new LlamaParseClient(apiKey);

    const result = await client.parseDocument(buffer, `${resourceId}.pdf`, {
        mode: 'fast',
        language: 'es',  // Most of the corpus is Spanish; Greek/Hebrew inline survives
        parsingInstruction: 'Preserva con precisión los caracteres griegos (α-ω) y hebreos (א-ת). Mantén la estructura de capítulos, secciones, tablas y notas al pie. No traduzcas términos teológicos ni citas bíblicas.',
    });

    // Trust LlamaParse's own credit count when reported; fall back to
    // page count only when the metadata field is missing (defensive
    // against API changes). Using the API-reported value prevents the
    // counter drift that surfaced in production: our counter incremented
    // by `pages.length` even when LlamaParse charged 0 (cached jobs),
    // making accounts look exhausted while the dashboard had capacity.
    const reportedCredits = result.jobMetadata.job_credits_usage;
    const creditsUsed = typeof reportedCredits === 'number'
        ? reportedCredits
        : result.pages.length;

    console.log(`[LlamaParse] Parsed ${result.pages.length} pages. Credits used: ${reportedCredits ?? '? (fallback to pageCount)'}`);

    const text = pagesToMarkedText(result.pages);
    const markdown = pagesToMarkdown(result.pages);
    return { text, markdown, pageCount: result.pages.length, creditsUsed };
}

/**
 * Truncate a UTF-8 string to at most `maxBytes` BYTES, never cutting
 * in the middle of a multi-byte character. Iterates code points and
 * accumulates byte length until the next character would exceed the
 * cap, then stops.
 *
 * Why we can't just do `string.substring(0, maxBytes)`: substring
 * counts characters, not bytes. For UTF-8:
 *   - ASCII (a-z): 1 byte/char
 *   - Latin extended (á, ñ): 2 bytes/char
 *   - Greek/Hebrew (α, ת): 2 bytes/char
 *   - CJK / emoji: 3-4 bytes/char
 * A 900,000-char Greek text is ~1.8 MB — way over Firestore's 1 MiB
 * doc limit. This helper guarantees the output fits in `maxBytes`.
 */
function truncateUtf8(text: string, maxBytes: number): string {
    if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;
    let bytes = 0;
    let result = '';
    for (const char of text) {  // for-of iterates code points, not UTF-16 units
        const charBytes = Buffer.byteLength(char, 'utf8');
        if (bytes + charBytes > maxBytes) break;
        bytes += charBytes;
        result += char;
    }
    return result;
}

/**
 * Clean up text extracted by pdf-parse
 * Fixes common issues like words stuck together
 */
function cleanPdfText(text: string): string {
    return text
        // Add space between lowercase and uppercase (camelCase words)
        .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
        // Fix common OCR issues
        .replace(/\s+/g, ' ')  // Multiple spaces to single
        .replace(/\n{3,}/g, '\n\n')  // Multiple newlines to double
        .trim();
}

/**
 * Extract text using pdf-parse (last-resort fallback).
 *
 * Returns `text` with `[PAGE N]` markers AND `markdown` with the
 * `<!-- page: N -->` contract that the indexer expects — so even
 * pdf-parse output is fully auto-indexable. Page boundaries come from:
 *   1. Form-feed characters (`\f`) inserted by pdf-parse between pages
 *      when the source PDF has clean page structure.
 *   2. Equal-segment fallback (text length / numpages) when form-feeds
 *      are missing — citations from these chunks have approximate page
 *      numbers, but a searchable resource with off-by-1 citations beats
 *      "Por procesar" forever.
 */
async function extractWithPdfParse(buffer: Buffer): Promise<{
    text: string;
    markdown: string;
    pageCount: number;
}> {
    const pdfData = await pdfParse(buffer);
    const numpages = Math.max(1, pdfData.numpages);
    const rawText = pdfData.text ?? '';

    // Split into per-page strings — prefer form-feed boundaries (pdf-parse
    // inserts `\f` between pages on most PDFs). When the count doesn't
    // match `numpages` we fall back to equal-segment splitting so the
    // page numbers remain approximately right.
    let pageTexts: string[] = rawText.split('\f');
    if (pageTexts.length !== numpages) {
        const segmentLen = Math.ceil(rawText.length / numpages);
        pageTexts = [];
        for (let i = 0; i < numpages; i++) {
            pageTexts.push(rawText.substring(i * segmentLen, (i + 1) * segmentLen));
        }
    }

    // Clean each page independently (preserves the per-page structure so
    // line-end / multi-space normalization doesn't bleed across pages).
    const cleanedPages = pageTexts.map(t => cleanPdfText(t));
    const text = cleanedPages.map((p, i) => `[PAGE ${i + 1}]\n${p}`).join('\n\n');
    const markdown = cleanedPages
        .map((p, i) => `<!-- page: ${i + 1} -->\n${p}`)
        .join('\n\n---\n\n');

    return { text, markdown, pageCount: numpages };
}

/**
 * Extract text using Gemini Files API.
 *
 * Returns the same `{ text, markdown, pageCount }` contract as
 * `extractWithLlamaParse` so the cascade can drop either result into
 * `structuredContentUrl` and the auto-indexer picks it up. The
 * resulting extractionVersion is `4.0-gemini-standard`, which IS in
 * the indexer's SUPPORTED_VERSIONS — so a successful Gemini run
 * auto-indexes immediately.
 *
 * Robustness improvements over the legacy implementation:
 *   - `responseMimeType: 'application/json'` forces strict JSON output
 *     (no markdown code-fence wrapping) so we don't hit the
 *     "Failed to parse Gemini response as JSON" path that bit the
 *     WBC upload (Gemini wrapped a 378-page response in ```json fences,
 *     and the manual fence-stripping was fragile).
 *   - `maxOutputTokens: 65536` (the model's documented max) so the
 *     JSON doesn't truncate mid-page on long commentaries.
 *   - Tighter prompt with `pages: [{ page, text, md }]` schema —
 *     smaller per-element overhead, more pages fit per response.
 *   - Clear truncation-detection: if Gemini returns 0 pages or
 *     finishes mid-array, we throw so the cascade falls to pdf-parse
 *     (which now produces auto-indexable output anyway).
 */
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
 * numbers before formatting. The single-pass router calls
 * `pagesToMarkedText` / `pagesToMarkdown` after this returns.
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

/**
 * Public entry point for Gemini extraction. Routes between single-pass
 * and batched based on `expectedPageCount`. The cascade in the storage
 * trigger calls this directly — it doesn't need to know which strategy
 * was used; the output shape is identical either way.
 */
async function extractWithGemini(
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
 * Cloud Function: Extract text from PDFs using Gemini or pdf-parse fallback
 * 
 * Triggers when a PDF is uploaded to: users/{userId}/library/{resourceId}/{filename}.pdf
 * - Files < 50MB: Uses Gemini for structured extraction with real page numbers
 * - Files >= 50MB: Falls back to pdf-parse with text cleanup
 */
export const extractPdfWithGemini = onObjectFinalized(
    {
        bucket: 'dosfilosapp.firebasestorage.app',
        region: 'us-central1',
        memory: '2GiB',
        // Storage triggers (`onObjectFinalized`) are capped at 540s by
        // the Firebase platform — the deploy CLI rejects anything
        // higher with "timeouts exceed the maximum allowed for their
        // trigger type". Carson/Moo-class books (50 MB / 790 págs) sit
        // right at this edge; if the cascade hits the cap mid-write the
        // resource can end up zombie.
        //
        // For docs that genuinely need >540s, use the manual
        // `reprocessWithLlamaParse` callable (HTTP trigger, 900s budget)
        // — surfaced via the "Reintentar Premium" button when an
        // upload degrades.
        timeoutSeconds: 540,
        secrets: [
            'GEMINI_API_KEY',
            // Two free-tier LlamaParse accounts at launch:
            //   - `LLAMAPARSE_API_KEY`         → account #1 (preserved from the
            //     legacy single-account env so the existing prod key keeps
            //     working untouched)
            //   - `LLAMAPARSE_API_KEY_FREE_1`  → account #2 (added for
            //     rotation capacity)
            // Both are referenced from docs in the `llamaparseAccounts`
            // Firestore collection via the `apiKeySecretEnv` field. To scale
            // beyond 2 accounts, add the new secret name here and in
            // `reprocessWithLlamaParse.ts`, then create the matching account
            // doc in Firestore.
            'LLAMAPARSE_API_KEY',
            'LLAMAPARSE_API_KEY_FREE_1',
        ],
    },
    async (event) => {
        const db = getFirestore();
        const storage = getStorage();
        const filePath = event.data.name;
        const contentType = event.data.contentType;

        console.log(`📄 [Extract] Processing file: ${filePath}`);

        // Only process PDFs in library folder
        if (!filePath || !contentType?.includes('pdf')) {
            console.log('Skipping: Not a PDF file');
            return;
        }

        // Check if it's in the library path
        const libraryPathMatch = filePath.match(/^users\/([^/]+)\/library\/([^/]+)\//);
        if (!libraryPathMatch) {
            console.log('Skipping: Not in library path');
            return;
        }

        const userId = libraryPathMatch[1];
        const resourceId = libraryPathMatch[2];

        console.log(`📚 [Extract] Processing for user: ${userId}, resource: ${resourceId}`);

        try {
            // Wait for document to exist (may be created shortly after upload)
            let resourceDoc;
            const resourceRef = db.collection('library_resources').doc(resourceId);
            const maxRetries = 5;
            const retryDelayMs = 3000;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                resourceDoc = await resourceRef.get();
                if (resourceDoc.exists) {
                    console.log(`✅ [Extract] Document found on attempt ${attempt}`);
                    break;
                }
                console.log(`⏳ [Extract] Document not found (attempt ${attempt}/${maxRetries}), waiting ${retryDelayMs}ms...`);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                }
            }

            if (!resourceDoc || !resourceDoc.exists) {
                console.log(`⚠️ [Extract] Resource document ${resourceId} not found after ${maxRetries} attempts`);
                return;
            }

            // Update status to processing.
            // `processingStartedAt` is the wall-clock anchor the UI uses
            // to render "Procesando hace 4m 23s" without depending on
            // when the user opened the page. Server-stamped via
            // serverTimestamp() so client clock skew can't make the
            // elapsed time go negative or jitter.
            await resourceRef.update({
                textExtractionStatus: 'processing',
                processingStartedAt: FieldValue.serverTimestamp(),
                updatedAt: new Date(),
            });
            console.log(`🔄 [Extract] Set status to 'processing' for resource ${resourceId}`);

            // Download PDF to temp file
            const bucket = storage.bucket(event.data.bucket);
            const file = bucket.file(filePath);
            const tempFilePath = path.join(os.tmpdir(), `${resourceId}.pdf`);

            await file.download({ destination: tempFilePath });
            const stats = fs.statSync(tempFilePath);
            const fileSizeMB = stats.size / 1024 / 1024;
            console.log(`📥 [Extract] Downloaded file: ${fileSizeMB.toFixed(2)} MB`);

            // Pre-read the PDF page count cheaply with pdf-parse so the
            // Gemini path can detect silent truncation (returning fewer
            // pages than the source has). This 1-2s up-front read is
            // worth it: without the ground truth, Gemini's "I returned
            // 40 pages" looks like a complete extraction even when the
            // source has 378 pages. Failing fast lets the cascade
            // degrade to pdf-parse, which delivers ALL the content.
            let expectedPageCount: number | undefined;
            try {
                const buf = fs.readFileSync(tempFilePath);
                const meta = await pdfParse(buf);
                expectedPageCount = meta.numpages;
                console.log(`📐 [Extract] PDF has ${expectedPageCount} page(s) per pdf-parse`);
            } catch (metaErr: any) {
                console.warn(`⚠️ [Extract] pdf-parse pre-read failed (continuing without page count): ${metaErr?.message ?? metaErr}`);
            }

            // Definite-assignment: the cascade below always assigns these
            // — either via a successful LlamaParse account, the Gemini
            // fallback, or the pdf-parse last resort. TS can't narrow
            // through the for-loop so we mark them definite to avoid
            // forced sentinel values.
            let extractedText!: string;
            let pageCount!: number;
            let extractionVersion!: string;
            let structuredMarkdown: string | null = null;

            // Honor the user's choice when they explicitly picked a tier
            // at upload time. Field is optional — when absent, fall back
            // to the legacy "premium-first cascade" so existing uploads
            // and any non-form code paths keep behaving as before.
            //
            //   'standard' → skip LlamaParse entirely. Goes straight to
            //                Gemini → pdf-parse. Debits standard pages.
            //   'premium'  → cascade as today. Debits premium when
            //                LlamaParse runs successfully; standard when
            //                it falls back.
            const requestedMode = resourceDoc.data()?.requestedExtractionMode as 'standard' | 'premium' | undefined;
            const userOptedOutOfPremium = requestedMode === 'standard';

            // Resolve every eligible LlamaParse account upfront so the
            // cascade can iterate them on per-account failure (rate limit,
            // queue timeout, account-side error) before degrading to
            // Gemini. Empty list when user opted into Standard, file
            // exceeds LlamaParse's 100 MB cap, or no account is configured.
            let llamaAccounts: SelectedLlamaParseAccount[] = [];
            if (!userOptedOutOfPremium && stats.size <= MAX_LLAMAPARSE_FILE_SIZE) {
                try {
                    llamaAccounts = await selectAllLlamaParseAccounts();
                } catch (selectErr: any) {
                    console.warn(`⚠️ [Extract] LlamaParse account lookup failed: ${selectErr.message}`);
                }
            } else if (userOptedOutOfPremium) {
                console.log(`📄 [Extract] User opted for STANDARD; skipping LlamaParse for resource ${resourceId}`);
            }
            const canUseLlamaParse = llamaAccounts.length > 0;
            // Track which account ultimately succeeded so we can record
            // its usage after the cascade finishes. Also collected for
            // structured-failure debugging.
            let llamaSucceededOn: SelectedLlamaParseAccount | null = null;
            // Actual credits LlamaParse charged for the successful job
            // (NOT page count — see comment in extractWithLlamaParse).
            let llamaCreditsUsed = 0;
            const llamaErrors: Array<{ account: string; error: string }> = [];

            // Extraction priority:
            //   1. LlamaParse (primary) — best structure/page preservation.
            //      Tries every eligible account before degrading.
            //   2. Gemini 2.5 Flash (fallback) — reliable text extraction.
            //   3. pdf-parse (last resort) — local, free, basic.
            if (canUseLlamaParse) {
                for (const account of llamaAccounts) {
                    console.log(`🦙 [Extract] Trying LlamaParse account ${account.accountId} (${account.availableCredits} credits available)`);
                    try {
                        const result = await extractWithLlamaParse(tempFilePath, resourceId, account.apiKey);
                        extractedText = result.text;
                        pageCount = result.pageCount;
                        structuredMarkdown = result.markdown;
                        extractionVersion = '3.0-llamaparse';
                        llamaSucceededOn = account;
                        llamaCreditsUsed = result.creditsUsed;
                        break; // Success — stop trying other accounts.
                    } catch (llamaError: any) {
                        const msg = llamaError?.message ?? String(llamaError);
                        console.warn(`⚠️ [Extract] LlamaParse account ${account.accountId} failed: ${msg}`);
                        llamaErrors.push({ account: account.accountId, error: msg });
                        // Loop continues — try next account.
                    }
                }

                if (llamaSucceededOn) {
                    // Record actual credits consumed (from LlamaParse's
                    // jobMetadata) — not page count. Cached jobs report
                    // 0 credits even when pages > 0; using page count
                    // there inflates our counter and eventually makes
                    // accounts look exhausted while the dashboard shows
                    // capacity remaining (the bug that broke Carson/Moo
                    // routing on 2026-05-03).
                    try {
                        if (llamaCreditsUsed > 0) {
                            await recordLlamaParseUsage(llamaSucceededOn.accountId, llamaCreditsUsed);
                        } else {
                            console.log(`💰 [Extract] LlamaParse charged 0 credits (cached/free); skipping counter update`);
                        }
                    } catch (usageErr: any) {
                        console.warn(`[Extract] Account usage update skipped: ${usageErr.message}`);
                    }
                } else {
                    // Every LlamaParse account failed. Degrade to Gemini
                    // (or pdf-parse if Gemini can't handle the size).
                    console.warn(
                        `⚠️ [Extract] All ${llamaAccounts.length} LlamaParse account(s) failed; falling back to Gemini. Errors: ${JSON.stringify(llamaErrors)}`,
                    );
                    if (stats.size <= MAX_GEMINI_FILE_SIZE) {
                        // Batched extraction (router inside extractWithGemini)
                        // handles long page counts by splitting into chunks,
                        // so we no longer need the 12MB heuristic that used
                        // to bail out for text-heavy commentaries.
                        try {
                            const result = await extractWithGemini(tempFilePath, resourceId, getApiKey(), expectedPageCount);
                            extractedText = result.text;
                            pageCount = result.pageCount;
                            structuredMarkdown = result.markdown;
                            extractionVersion = '4.0-gemini-standard';
                        } catch (geminiError) {
                            console.warn(`⚠️ [Extract] Gemini also failed, using pdf-parse:`, geminiError);
                            const buffer = fs.readFileSync(tempFilePath);
                            const result = await extractWithPdfParse(buffer);
                            extractedText = result.text;
                            pageCount = result.pageCount;
                            structuredMarkdown = result.markdown;
                            extractionVersion = '5.0-pdfparse-structured';
                        }
                    } else {
                        // >50MB exceeds Gemini Files API per-file cap.
                        // Could be revisited later by chunking the source
                        // PDF before upload — but that's a follow-up.
                        console.log(
                            `📄 [Extract] Skipping Gemini fallback (${(stats.size / 1024 / 1024).toFixed(1)} MB > 50MB Gemini cap); going straight to pdf-parse`,
                        );
                        const buffer = fs.readFileSync(tempFilePath);
                        const result = await extractWithPdfParse(buffer);
                        extractedText = result.text;
                        pageCount = result.pageCount;
                        structuredMarkdown = result.markdown;
                        extractionVersion = '5.0-pdfparse-structured';
                    }
                }
            } else if (stats.size <= MAX_GEMINI_FILE_SIZE) {
                // No LlamaParse path AND file fits Gemini's 50MB cap.
                // Batched extraction now handles long page counts by
                // splitting, so the old 12MB heuristic is gone.
                console.log(`🤖 [Extract] Using Gemini (${userOptedOutOfPremium ? 'user opted standard' : 'no LlamaParse key'})`);
                try {
                    const result = await extractWithGemini(tempFilePath, resourceId, getApiKey(), expectedPageCount);
                    extractedText = result.text;
                    pageCount = result.pageCount;
                    structuredMarkdown = result.markdown;
                    extractionVersion = '4.0-gemini-standard';
                } catch (geminiError) {
                    console.warn(`⚠️ [Extract] Gemini failed, falling back to pdf-parse:`, geminiError);
                    const buffer = fs.readFileSync(tempFilePath);
                    const result = await extractWithPdfParse(buffer);
                    extractedText = result.text;
                    pageCount = result.pageCount;
                    structuredMarkdown = result.markdown;
                    extractionVersion = '5.0-pdfparse-structured';
                }
            } else {
                console.log(`📄 [Extract] Using pdf-parse (file > 100MB or no LlamaParse)`);
                const buffer = fs.readFileSync(tempFilePath);
                const result = await extractWithPdfParse(buffer);
                extractedText = result.text;
                pageCount = result.pageCount;
                structuredMarkdown = result.markdown;
                extractionVersion = '5.0-pdfparse-structured';
            }

            const usedGemini = extractionVersion === '4.0-gemini-standard' || extractionVersion === '2.0-gemini';
            const usedLlamaParse = extractionVersion === '3.0-llamaparse';

            console.log(`📝 [Extract] Extracted ${extractedText.length} characters / ${Buffer.byteLength(extractedText, 'utf8')} bytes from ${pageCount} pages`);

            // Firestore caps each document at 1,048,576 bytes (1 MiB).
            // Truncate textContent BY BYTES (not characters) to stay
            // safely under the cap. The previous code used
            // `substring(0, MAX_BYTES)` which slices by char count —
            // safe for ASCII but catastrophic for Greek/Hebrew (1 char
            // ≈ 2 bytes UTF-8) where 900K chars becomes ~1.8 MB and
            // Firestore rejects the whole write with INVALID_ARGUMENT.
            // For NTG28 (1020p of dense Greek) this killed the entire
            // extraction.
            //
            // Headroom: the cap is 1,048,576 bytes for the WHOLE doc.
            // Title/author/metadata/etc add ~5-20 KB, so MAX 800K bytes
            // for textContent leaves ~250 KB of safety margin. The
            // full content is also persisted to `structuredContentUrl`
            // in Cloud Storage (no size limit) — textContent in
            // Firestore is just for legacy reads + quick previews.
            const MAX_TEXT_BYTES = 800_000;
            const textBytes = Buffer.byteLength(extractedText, 'utf8');
            let finalText = extractedText;
            let wasTruncated = false;

            if (textBytes > MAX_TEXT_BYTES) {
                console.log(`⚠️ [Extract] Text too large (${textBytes} bytes), truncating to ${MAX_TEXT_BYTES} bytes...`);
                finalText = truncateUtf8(extractedText, MAX_TEXT_BYTES);
                wasTruncated = true;
                console.log(`✂️  [Extract] Truncated to ${Buffer.byteLength(finalText, 'utf8')} bytes`);
            }

            // If structured Markdown is available (LlamaParse), store it in Storage
            // so it doesn't hit Firestore's 1MB limit and is available for Phase 2 chunking.
            let structuredContentUrl: string | null = null;
            if (structuredMarkdown) {
                try {
                    const mdPath = `users/${userId}/library/${resourceId}/structured.md`;
                    const mdFile = bucket.file(mdPath);
                    await mdFile.save(structuredMarkdown, {
                        contentType: 'text/markdown; charset=utf-8',
                        metadata: { resourceId, extractionVersion },
                    });
                    structuredContentUrl = `gs://${event.data.bucket}/${mdPath}`;
                    console.log(`📦 [Extract] Stored structured Markdown at ${structuredContentUrl}`);
                } catch (mdErr) {
                    console.warn(`⚠️ [Extract] Failed to store structured Markdown:`, mdErr);
                }
            }

            // Compute a user-facing warning when the actual extraction
            // tier is below what the user explicitly requested. This is
            // what the UI surfaces in the engine-badge tooltip so the
            // user understands why their Premium upload ended up on
            // Standard or Basic — and can decide whether to reprocess.
            //
            // Examples written to Firestore:
            //   - "Premium falló en 2 cuenta(s); usamos Estándar (Gemini)."
            //   - "Premium falló y archivo >12MB; usamos Básico (pdf-parse)."
            //   - "Estándar falló; usamos Básico (pdf-parse)."
            //
            // Always cleared (set to null) on success-at-requested-tier
            // so a successful reprocess removes any stale warning.
            let extractionWarning: string | null = null;
            if (requestedMode === 'premium' && extractionVersion !== '3.0-llamaparse') {
                const accountSummary = llamaErrors.length > 0
                    ? `Premium falló en ${llamaErrors.length} cuenta(s)`
                    : 'Premium no estuvo disponible';
                if (extractionVersion === '4.0-gemini-standard' || extractionVersion === '2.0-gemini') {
                    extractionWarning = `${accountSummary}; usamos Estándar (Gemini).`;
                } else if (extractionVersion === '5.0-pdfparse-structured') {
                    extractionWarning = `${accountSummary} y Gemini tampoco pudo procesar; usamos Básico (pdf-parse) sin cobro. Reprocesa con Premium para mejor calidad.`;
                }
            } else if (requestedMode === 'standard' && extractionVersion === '5.0-pdfparse-structured') {
                extractionWarning = 'Gemini falló; usamos Básico (pdf-parse) sin cobro. Considera reprocesar.';
            }
            // Note: requestedMode === undefined (legacy uploads) gets no
            // warning — we don't know what they asked for.

            // Update Firestore document with extracted text and ready status
            const updateData: Record<string, any> = {
                textContent: finalText,
                textExtractionStatus: 'ready',
                extractedAt: new Date(),
                pageCount,
                characterCount: extractedText.length,
                extractedWithGemini: usedGemini,
                extractedWithLlamaParse: usedLlamaParse,
                extractionVersion,
                extractionWarning, // null clears any prior warning on a clean reprocess
                needsReindex: true,
                wasTruncated,
                updatedAt: new Date()
            };
            if (structuredContentUrl) updateData.structuredContentUrl = structuredContentUrl;

            await resourceRef.update(updateData);
            console.log(`✅ [Extract] Updated resource ${resourceId} (${extractionVersion}, status: ready)`);

            // Debit the user's processing balance based on which engine
            // actually ran. The user only pays for the tier they got:
            //
            //   3.0-llamaparse              → premium  (paid Premium, got Premium)
            //   4.0-gemini-standard         → standard (paid Standard or Premium-degraded, got Standard)
            //   2.0-gemini (legacy)         → standard
            //   5.0-pdfparse-structured     → FREE     (last-resort fallback, no API cost
            //   fallback-pdfparse (legacy)  → FREE     to us, lower-quality output the user
            //                                          didn't ask for)
            //
            // Why pdf-parse is free: it runs locally with no third-party
            // API cost, and it's only reached when both LlamaParse AND
            // Gemini failed. Charging for our own degradation would
            // erode trust in the pipeline — the user paid for Standard
            // or Premium quality, getting Basic isn't what they bought.
            //
            // Non-fatal: if the debit fails we log and proceed —
            // billing is the source of truth, this is a UX-quota
            // synchronization concern.
            const isFreeFallback = extractionVersion === 'fallback-pdfparse'
                || extractionVersion === '5.0-pdfparse-structured';
            if (isFreeFallback) {
                console.log(`💳 [Extract] Skipping debit for ${userId.substring(0, 8)}... — pdf-parse fallback is free`);
            } else {
                try {
                    const debitMode: ProcessingMode = extractionVersion === '3.0-llamaparse'
                        ? 'premium'
                        : 'standard';
                    await consumePagesAdmin(userId, debitMode, pageCount);
                    console.log(`💳 [Extract] Debited ${pageCount} ${debitMode} pages from user ${userId.substring(0, 8)}...`);
                } catch (debitErr) {
                    console.warn(`⚠️ [Extract] Balance debit failed (non-fatal):`, debitErr);
                }
            }

            // Increment the user's monthly pagesProcessed counter. Server-side so the
            // client can't understate usage. Best-effort — logs but doesn't fail the
            // extraction if the counter update errors.
            try {
                const now = new Date();
                const periodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
                const counterRef = db.doc(`users/${userId}/usage_counters/${periodKey}`);
                await counterRef.set({
                    userId,
                    periodKey,
                    pagesProcessed: FieldValue.increment(pageCount),
                    docsUploadedThisMonth: FieldValue.increment(1),
                    lastEventAt: now,
                }, { merge: true });
                const counterSnap = await counterRef.get();
                if (!counterSnap.data()?.firstEventAt) {
                    await counterRef.set({ firstEventAt: now }, { merge: true });
                }
                console.log(`📊 [Extract] Incremented usage: +${pageCount} pages, +1 doc for user ${userId.substring(0, 8)}...`);
            } catch (counterErr) {
                console.warn(`⚠️ [Extract] Failed to update usage counter:`, counterErr);
            }

            // Cleanup temp file
            fs.unlinkSync(tempFilePath);
            console.log(`🧹 [Extract] Cleanup complete`);

        } catch (error) {
            console.error(`❌ [Extract] Error extracting text:`, error);

            try {
                const resourceRef = db.collection('library_resources').doc(resourceId);
                await resourceRef.update({
                    textExtractionStatus: 'failed',
                    extractionError: error instanceof Error ? error.message : 'Unknown error',
                    extractionAttemptedAt: new Date(),
                    updatedAt: new Date()
                });
                console.log(`❌ [Extract] Set status to 'failed' for resource ${resourceId}`);
            } catch (updateError) {
                console.error('Failed to update error status:', updateError);
            }

            throw error;
        }
    }
);
