/**
 * Getting a PDF in front of the engines, cheaply.
 *
 * Two ideas here matter:
 *
 * 1. Source from the REAL library. A bake-off on someone else's benchmark
 *    PDFs answers someone else's question. `--resource <id>` pulls the
 *    actual file a user uploaded, so the verdict is about this corpus.
 *
 * 2. Slice before sending. Running a 425-page commentary through a premium
 *    parser to learn whether it keeps breathings is a waste of money and
 *    an hour of waiting. Ten well-chosen pages answer the same question.
 *    Pick the pages with the densest apparatus and the answer arrives in
 *    minutes for cents.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PDFDocument } from 'pdf-lib';

const execFileAsync = promisify(execFile);

/** True page count of a PDF, straight from poppler. Our only hard reference. */
export async function pdfPageCount(pdfPath) {
    try {
        const { stdout } = await execFileAsync('pdfinfo', [pdfPath]);
        const m = stdout.match(/^Pages:\s+(\d+)/m);
        return m ? Number(m[1]) : null;
    } catch {
        return null;
    }
}

/**
 * Extract a 1-based, inclusive page range into a new PDF.
 *
 * The slice is renumbered from 1. Every engine receives the identical file,
 * so page N means the same thing for all of them and the drift metric stays
 * meaningful. The report says which original pages the slice came from, so a
 * finding can always be traced back to the book.
 */
export async function slicePdf(srcPath, outPath, from, to) {
    const src = await PDFDocument.load(await fs.readFile(srcPath), { ignoreEncryption: true });
    const total = src.getPageCount();

    const start = Math.max(1, from);
    const end = Math.min(total, to);
    if (start > end) throw new Error(`Rango inválido ${from}-${to} para un PDF de ${total} páginas`);

    const out = await PDFDocument.create();
    const indices = [];
    for (let p = start; p <= end; p++) indices.push(p - 1);
    const copied = await out.copyPages(src, indices);
    for (const page of copied) out.addPage(page);

    await fs.writeFile(outPath, await out.save());
    return { path: outPath, pages: indices.length, originalRange: [start, end], originalTotal: total };
}

/**
 * Download the original upload for a library resource.
 *
 * Reads `storageUrl` off the Firestore doc and pulls the object. Deliberately
 * NOT `structuredContentUrl`: that is an extractor's output, and feeding one
 * engine's output to another would measure the wrong thing entirely.
 */
export async function fetchResourcePdf(admin, resourceId, outDir) {
    const db = admin.firestore();
    const snap = await db.collection('library_resources').doc(resourceId).get();
    if (!snap.exists) throw new Error(`Recurso ${resourceId} no existe`);

    const data = snap.data();
    const url = data.storageUrl;
    if (!url) throw new Error(`Recurso ${resourceId} no tiene storageUrl (¿entrada de catálogo?)`);

    const { bucket, objectPath } = parseStorageLocation(url);
    const outPath = path.join(outDir, `${resourceId}.pdf`);
    await admin.storage().bucket(bucket).file(objectPath).download({ destination: outPath });

    return {
        path: outPath,
        title: data.title ?? resourceId,
        pageCount: data.pageCount ?? null,
        extractionVersion: data.extractionVersion ?? null,
    };
}

/**
 * Accepts the three URL shapes Firebase hands out for the same object:
 * `gs://`, the tokenised `/v0/b/<bucket>/o/<path>` download URL, and the
 * plain `storage.googleapis.com` form. Mirrors
 * `parseFirebaseStorageLocation` in the cloud functions.
 */
export function parseStorageLocation(url, defaultBucket = 'dosfilosapp.firebasestorage.app') {
    const gs = url.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (gs) return { bucket: gs[1], objectPath: decodeURIComponent(gs[2]) };

    const fb = url.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
    if (fb) return { bucket: fb[1], objectPath: decodeURIComponent(fb[2]) };

    const gcs = url.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+?)(\?|$)/);
    if (gcs) return { bucket: gcs[1], objectPath: decodeURIComponent(gcs[2]) };

    throw new Error(`No reconozco esta URL de Storage: ${url.slice(0, 120)}`);
}
