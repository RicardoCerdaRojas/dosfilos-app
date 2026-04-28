import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LlamaParseClient, pagesToMarkedText, pagesToMarkdown } from './llamaParseClient';
import { consumePagesAdmin } from './processingBalance';
import { recordLlamaParseUsage, selectLlamaParseAccount } from './llamaParseAccountSelector';

interface ReprocessRequest {
    resourceId: string;
    force?: boolean;  // Re-extract even if already on LlamaParse
}

/**
 * Callable Cloud Function: re-extracts a single library_resource using LlamaParse.
 * - Admin-only
 * - Safe to call repeatedly (idempotent if force=false and already LlamaParse)
 * - Updates the resource with fresh textContent, structuredContentUrl, extractionVersion
 * - Marks needsReindex=true so RAG chunks can be regenerated
 */
export const reprocessWithLlamaParse = onCall<ReprocessRequest>(
    {
        region: 'us-central1',
        memory: '2GiB',
        timeoutSeconds: 900,  // 15 minutes — enough for 700+ page documents in fast mode
        // All possible LlamaParse account secrets must be declared so the
        // multi-account selector can resolve any of them at runtime. Add new
        // ones here when you provision additional accounts.
        secrets: [
            'LLAMAPARSE_API_KEY',          // account #1 (existing, legacy env name)
            'LLAMAPARSE_API_KEY_FREE_1',   // account #2
        ],
    },
    async (request) => {
        console.log(`[Reprocess] Called by ${request.auth?.token?.email ?? 'unauthenticated'}`);

        if (!request.auth || request.auth.token?.email !== 'rdocerda@gmail.com') {
            throw new HttpsError('permission-denied', 'Only admin can reprocess documents');
        }

        // Pick a LlamaParse account from the multi-account pool (Hito 6).
        // Throws when nothing is configured — clearer error than a blank API key.
        let selected;
        try {
            selected = await selectLlamaParseAccount();
        } catch (err: any) {
            console.error('[Reprocess] LlamaParse account selection failed:', err.message);
            throw new HttpsError('failed-precondition', err.message);
        }
        console.log(
            `[Reprocess] Using account ${selected.accountId} (${selected.accountName}); ${selected.availableCredits} credits available`,
        );

        const { resourceId, force = false } = request.data;
        if (!resourceId) throw new HttpsError('invalid-argument', 'resourceId is required');
        console.log(`[Reprocess] Starting for resourceId=${resourceId}, force=${force}`);

        const db = getFirestore();
        const storage = getStorage();
        const resourceRef = db.collection('library_resources').doc(resourceId);
        const snap = await resourceRef.get();
        if (!snap.exists) throw new HttpsError('not-found', `Resource ${resourceId} not found`);

        const data = snap.data()!;
        if (!force && data.extractionVersion === '3.0-llamaparse') {
            console.log(`[Reprocess] ${resourceId} already on LlamaParse. Skipping (use force=true to override).`);
            return { success: true, skipped: true, reason: 'already-llamaparse' };
        }

        // Parse storageUrl — may be "gs://bucket/path" OR Firebase HTTPS download URL
        // HTTPS format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{url-encoded-path}?alt=media&token=...
        const { bucket: bucketName, path: storagePath } = parseFirebaseStorageLocation(
            data.storageUrl,
            'dosfilosapp.firebasestorage.app'
        );
        if (!storagePath) throw new HttpsError('failed-precondition', `Resource ${resourceId}: could not parse storageUrl "${data.storageUrl}"`);
        console.log(`[Reprocess] Parsed storage location: bucket=${bucketName}, path=${storagePath}`);

        const bucket = storage.bucket(bucketName);
        const file = bucket.file(storagePath);

        // Download PDF to temp
        const tempFilePath = path.join(os.tmpdir(), `${resourceId}.pdf`);
        await file.download({ destination: tempFilePath });
        const stats = fs.statSync(tempFilePath);
        console.log(`[Reprocess] ${data.title ?? resourceId}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

        try {
            await resourceRef.update({
                textExtractionStatus: 'processing',
                updatedAt: new Date(),
            });

            const buffer = fs.readFileSync(tempFilePath);
            const client = new LlamaParseClient(selected.apiKey);
            const result = await client.parseDocument(buffer, `${resourceId}.pdf`, {
                mode: 'fast',
                language: 'es',
                parsingInstruction: 'Preserva con precisión los caracteres griegos (α-ω) y hebreos (א-ת). Mantén la estructura de capítulos, secciones, tablas y notas al pie.',
                maxPollSeconds: 840,  // 14 minutes — leave buffer under function timeout
                pollIntervalMs: 3000,
            });

            const extractedText = pagesToMarkedText(result.pages);
            const structuredMarkdown = pagesToMarkdown(result.pages);

            // Firestore 1MB limit — truncate textContent if needed
            const MAX_BYTES = 900_000;
            const textBytes = Buffer.byteLength(extractedText, 'utf8');
            let finalText = extractedText;
            let wasTruncated = false;
            if (textBytes > MAX_BYTES) {
                finalText = extractedText.substring(0, MAX_BYTES);
                wasTruncated = true;
            }

            // Store structured Markdown in Storage
            const userId: string = data.userId;
            const mdPath = `users/${userId}/library/${resourceId}/structured.md`;
            const mdFile = bucket.file(mdPath);
            await mdFile.save(structuredMarkdown, {
                contentType: 'text/markdown; charset=utf-8',
                metadata: { resourceId, extractionVersion: '3.0-llamaparse' },
            });
            const structuredContentUrl = `gs://${bucketName}/${mdPath}`;

            await resourceRef.update({
                textContent: finalText,
                textExtractionStatus: 'ready',
                extractedAt: new Date(),
                pageCount: result.pages.length,
                characterCount: extractedText.length,
                extractedWithLlamaParse: true,
                extractedWithGemini: false,
                extractionVersion: '3.0-llamaparse',
                structuredContentUrl,
                needsReindex: true,
                wasTruncated,
                updatedAt: new Date(),
            });

            // Debit the premium processing balance for the actual pages consumed.
            // Non-fatal on error — extraction already succeeded.
            try {
                await consumePagesAdmin(data.userId, 'premium', result.pages.length);
            } catch (balanceErr: any) {
                console.warn(
                    `[Reprocess] Balance update skipped for ${data.userId}: ${balanceErr.message}`,
                );
            }

            // Track usage on the selected LlamaParse account so the rotation
            // logic knows when to switch. Non-fatal — billing is the source of
            // truth, this counter is for our own dashboards.
            try {
                await recordLlamaParseUsage(selected.accountId, result.pages.length);
            } catch (accountErr: any) {
                console.warn(
                    `[Reprocess] Account usage update skipped for ${selected.accountId}: ${accountErr.message}`,
                );
            }

            console.log(`[Reprocess] ✅ ${resourceId}: ${result.pages.length} pages, ${result.jobMetadata.job_credits_usage ?? '?'} credits`);

            return {
                success: true,
                resourceId,
                pageCount: result.pages.length,
                characterCount: extractedText.length,
                creditsUsed: result.jobMetadata.job_credits_usage ?? 0,
                wasTruncated,
            };
        } catch (err: any) {
            const errorMessage = err?.message ?? 'Unknown error';
            const errorStack = err?.stack ?? '';
            console.error(`[Reprocess] ❌ ${resourceId}: ${errorMessage}`);
            console.error('[Reprocess] Stack:', errorStack);
            await resourceRef.update({
                textExtractionStatus: 'failed',
                extractionError: errorMessage,
                updatedAt: new Date(),
            });
            // Propagate the real error message so the admin UI shows useful info
            throw new HttpsError('internal', `Reprocess failed: ${errorMessage}`, {
                originalMessage: errorMessage,
            });
        } finally {
            try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }
        }
    }
);

/**
 * Parse a Firebase Storage location string into { bucket, path }.
 * Supports:
 *   1. gs://bucket-name/path/to/file
 *   2. https://firebasestorage.googleapis.com/v0/b/bucket-name/o/url%2Fencoded%2Fpath?alt=media&token=...
 *   3. https://storage.googleapis.com/bucket-name/path/to/file (legacy)
 */
function parseFirebaseStorageLocation(
    url: string,
    defaultBucket: string
): { bucket: string; path: string } {
    if (!url) return { bucket: defaultBucket, path: '' };

    // Case 1: gs:// scheme
    const gsMatch = url.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (gsMatch) {
        return { bucket: gsMatch[1], path: decodeURIComponent(gsMatch[2]) };
    }

    // Case 2: Firebase download URL
    // Pattern: /v0/b/{bucket}/o/{encoded-path}?...
    const fbMatch = url.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
    if (fbMatch) {
        return { bucket: fbMatch[1], path: decodeURIComponent(fbMatch[2]) };
    }

    // Case 3: storage.googleapis.com legacy URL
    const gcsMatch = url.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+?)(\?|$)/);
    if (gcsMatch) {
        return { bucket: gcsMatch[1], path: decodeURIComponent(gcsMatch[2]) };
    }

    return { bucket: defaultBucket, path: '' };
}
