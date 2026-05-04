import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { LlamaParsePage, pagesToMarkedText, pagesToMarkdown } from './llamaParseClient';
import { consumePagesAdmin } from './processingBalance';

interface ProcessRequest {
    resourceId: string;
    /** Re-extract even if the resource is already on the Gemini-standard path. */
    force?: boolean;
}

const EXTRACTION_VERSION = '4.0-gemini-standard';
const GEMINI_FILE_SIZE_LIMIT_BYTES = 50 * 1024 * 1024;
const FIRESTORE_TEXT_LIMIT_BYTES = 900_000;

/**
 * Callable Cloud Function: re-extracts a single library_resource using Gemini
 * 2.0 Flash with native PDF support. Standard (low-cost) extraction path —
 * 5–12× cheaper than LlamaParse for narrative books.
 *
 * Output contract is **identical** to `reprocessWithLlamaParse`:
 *   - `structured.md` in Cloud Storage at `users/{uid}/library/{rid}/structured.md`
 *     using `<!-- page: N -->` markers (consumed by `markdownChunker.ts`).
 *   - `textContent` Firestore field with `[PAGE N]` markers (truncated to 900 KB).
 *   - Firestore updates: `textExtractionStatus`, `pageCount`, `characterCount`,
 *     `extractionVersion`, `structuredContentUrl`, `extractedWithGemini: true`,
 *     `extractedWithLlamaParse: false`, `needsReindex: true`.
 *
 * The downstream pipeline (chunker, embeddings, RAG retrieval) does not need
 * to change.
 */
export const processWithGemini = onCall<ProcessRequest>(
    {
        region: 'us-central1',
        memory: '2GiB',
        timeoutSeconds: 900,
        secrets: ['GEMINI_API_KEY'],
    },
    async (request) => {
        console.log(`[ProcessGemini] Called by ${request.auth?.token?.email ?? 'unauthenticated'}`);

        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can reprocess documents');
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY not configured');
        }

        const { resourceId, force = false } = request.data;
        if (!resourceId) throw new HttpsError('invalid-argument', 'resourceId is required');

        const db = getFirestore();
        const storage = getStorage();
        const resourceRef = db.collection('library_resources').doc(resourceId);
        const snap = await resourceRef.get();
        if (!snap.exists) throw new HttpsError('not-found', `Resource ${resourceId} not found`);

        const data = snap.data()!;
        if (!force && data.extractionVersion === EXTRACTION_VERSION) {
            return { success: true, skipped: true, reason: 'already-gemini-standard' };
        }

        const { bucket: bucketName, path: storagePath } = parseFirebaseStorageLocation(
            data.storageUrl,
            'dosfilosapp.firebasestorage.app',
        );
        if (!storagePath) {
            throw new HttpsError(
                'failed-precondition',
                `Resource ${resourceId}: could not parse storageUrl "${data.storageUrl}"`,
            );
        }

        const bucket = storage.bucket(bucketName);
        const file = bucket.file(storagePath);

        const tempFilePath = path.join(os.tmpdir(), `${resourceId}.pdf`);
        await file.download({ destination: tempFilePath });
        const stats = fs.statSync(tempFilePath);
        const sizeMB = stats.size / 1024 / 1024;
        console.log(`[ProcessGemini] ${data.title ?? resourceId}: ${sizeMB.toFixed(2)} MB`);

        if (stats.size > GEMINI_FILE_SIZE_LIMIT_BYTES) {
            try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }
            throw new HttpsError(
                'failed-precondition',
                `File exceeds Gemini 50MB limit (${sizeMB.toFixed(1)} MB). Use the LlamaParse premium path for files this large.`,
            );
        }

        try {
            await resourceRef.update({
                textExtractionStatus: 'processing',
                updatedAt: new Date(),
            });

            const pages = await extractPagesWithGemini(tempFilePath, resourceId, apiKey);

            const extractedText = pagesToMarkedText(pages);
            const structuredMarkdown = pagesToMarkdown(pages);

            const textBytes = Buffer.byteLength(extractedText, 'utf8');
            let finalText = extractedText;
            let wasTruncated = false;
            if (textBytes > FIRESTORE_TEXT_LIMIT_BYTES) {
                finalText = extractedText.substring(0, FIRESTORE_TEXT_LIMIT_BYTES);
                wasTruncated = true;
            }

            const userId: string = data.userId;
            const mdPath = `users/${userId}/library/${resourceId}/structured.md`;
            const mdFile = bucket.file(mdPath);
            await mdFile.save(structuredMarkdown, {
                contentType: 'text/markdown; charset=utf-8',
                metadata: { resourceId, extractionVersion: EXTRACTION_VERSION },
            });
            const structuredContentUrl = `gs://${bucketName}/${mdPath}`;

            await resourceRef.update({
                textContent: finalText,
                textExtractionStatus: 'ready',
                extractedAt: new Date(),
                pageCount: pages.length,
                characterCount: extractedText.length,
                extractedWithLlamaParse: false,
                extractedWithGemini: true,
                extractionVersion: EXTRACTION_VERSION,
                structuredContentUrl,
                needsReindex: true,
                wasTruncated,
                updatedAt: new Date(),
            });

            // Debit the standard processing balance for the actual pages consumed.
            // Admin uploads run on rdocerda's account; we still log the spend so
            // dashboards reflect it. Errors here are non-fatal — extraction
            // already succeeded; we don't want to roll back a successful parse.
            try {
                await consumePagesAdmin(data.userId, 'standard', pages.length);
            } catch (balanceErr: any) {
                console.warn(
                    `[ProcessGemini] Balance update skipped for ${data.userId}: ${balanceErr.message}`,
                );
            }

            console.log(`[ProcessGemini] ✅ ${resourceId}: ${pages.length} pages`);

            return {
                success: true,
                resourceId,
                pageCount: pages.length,
                characterCount: extractedText.length,
                wasTruncated,
            };
        } catch (err: any) {
            const errorMessage = err?.message ?? 'Unknown error';
            console.error(`[ProcessGemini] ❌ ${resourceId}: ${errorMessage}`);
            await resourceRef.update({
                textExtractionStatus: 'failed',
                extractionError: errorMessage,
                updatedAt: new Date(),
            });
            throw new HttpsError('internal', `Gemini standard extraction failed: ${errorMessage}`);
        } finally {
            try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }
        }
    },
);

/**
 * Uploads the PDF to the Gemini Files API, asks the model to return one entry
 * per page, and returns the structured pages array. Mirrors the contract of
 * `LlamaParseClient.parseDocument` so the downstream code stays identical.
 */
async function extractPagesWithGemini(
    tempFilePath: string,
    resourceId: string,
    apiKey: string,
): Promise<LlamaParsePage[]> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: 'application/pdf',
        displayName: `${resourceId}.pdf`,
    });

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

    const model = genAI.getGenerativeModel({
        // Was 'gemini-2.0-flash' until Google deprecated it for new
        // users (404 Not Found, May 2026). Bumped to the live successor.
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
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

    const responseText = result.response.text();

    let parsed: { pages?: Array<{ page: number; text?: string; md?: string }> };
    try {
        parsed = JSON.parse(responseText);
    } catch (parseError) {
        console.error('[ProcessGemini] Failed to parse Gemini JSON:', responseText.substring(0, 400));
        throw new Error('Gemini response was not valid JSON');
    }

    if (!parsed.pages || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
        throw new Error('Gemini returned no pages');
    }

    // Best-effort cleanup of the Gemini file to avoid quota waste.
    try { await fileManager.deleteFile(geminiFile.name); } catch { /* ignore */ }

    return parsed.pages.map((p, idx) => ({
        page: typeof p.page === 'number' ? p.page : idx + 1,
        text: p.text ?? '',
        md: p.md,
    }));
}

/**
 * Same parser used by `reprocessWithLlamaParse`. Duplicated here intentionally
 * to keep the two callables independent (we may evolve their resilience
 * separately as we move from premium-only to hybrid).
 */
function parseFirebaseStorageLocation(
    url: string,
    defaultBucket: string,
): { bucket: string; path: string } {
    if (!url) return { bucket: defaultBucket, path: '' };

    const gsMatch = url.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (gsMatch) {
        return { bucket: gsMatch[1], path: decodeURIComponent(gsMatch[2]) };
    }

    const fbMatch = url.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
    if (fbMatch) {
        return { bucket: fbMatch[1], path: decodeURIComponent(fbMatch[2]) };
    }

    const gcsMatch = url.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+?)(\?|$)/);
    if (gcsMatch) {
        return { bucket: gcsMatch[1], path: decodeURIComponent(gcsMatch[2]) };
    }

    return { bucket: defaultBucket, path: '' };
}
