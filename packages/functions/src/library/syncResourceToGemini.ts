import { onCall } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';


// Gemini file size limit: 50MB
const MAX_GEMINI_FILE_SIZE = 50 * 1024 * 1024;

/** Supported image MIME types that can go straight to Gemini OCR */
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

interface SyncResourceRequest {
    resourceId: string;
}

// ---------------------------------------------------------------------------
// Extraction helpers (inline — mirror logic from extractPdfWithGemini.ts)
// ---------------------------------------------------------------------------

function cleanPdfText(text: string): string {
    return text
        .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Locally extract text with page markers using pdf-parse (fast, free).
 * Returns null if the PDF has no extractable text (scanned/image PDF).
 */
async function extractTextLocallyWithPages(buffer: Buffer): Promise<{ text: string; pageCount: number } | null> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');

    const pages: string[] = [];
    let totalPages = 0;

    // pdf-parse option: call pagerender for each page to capture per-page text
    const options = {
        pagerender: (pageData: { pageIndex: number; getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) => {
            return pageData.getTextContent().then((content) => {
                const pageText = content.items.map((item) => item.str).join(' ');
                const cleaned = cleanPdfText(pageText);
                pages.push(`[PÁGINA ${pageData.pageIndex + 1}]\n${cleaned}`);
                return cleaned;
            });
        }
    };

    const pdfData = await pdfParse(buffer, options);
    totalPages = pdfData.numpages;

    // If pages array is empty or all pages have < 50 chars, treat as image PDF
    const totalText = pages.join('').replace(/\[PÁGINA \d+\]\n/g, '').trim();
    if (totalText.length < 100) {
        console.log(`⚠️ [Sync] PDF appears to have no extractable text (${totalText.length} chars). Will use Gemini OCR.`);
        return null;
    }

    return {
        text: pages.join('\n\n'),
        pageCount: totalPages
    };
}

/**
 * Extract text via Gemini Vision (OCR) — works for scanned PDFs and images.
 * Returns enriched text with [PÁGINA N] markers.
 */
async function extractTextWithGeminiOCR(
    tempFilePath: string,
    mimeType: string,
    displayName: string,
    apiKey: string
): Promise<{ text: string; pageCount: number }> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    console.log(`🤖 [Sync] Uploading to Gemini Files API for OCR...`);
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: mimeType as 'application/pdf',
        displayName,
    });

    // Wait for processing
    let geminiFile = await fileManager.getFile(uploadResult.file.name);
    while (geminiFile.state === 'PROCESSING') {
        console.log(`⏳ [Sync] Gemini OCR: file still processing...`);
        await new Promise(resolve => setTimeout(resolve, 4000));
        geminiFile = await fileManager.getFile(uploadResult.file.name);
    }

    if (geminiFile.state === 'FAILED') {
        throw new Error('Gemini OCR processing failed');
    }

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as any
    });

    const prompt = `Eres un experto en digitalización de documentos académicos y teológicos.

TAREA: Extrae TODO el texto de este documento de forma estructurada.

REGLAS:
1. Preserva la estructura de párrafos y secciones
2. Mantén títulos y subtítulos en líneas separadas  
3. Preserva citas bíblicas exactamente como aparecen
4. Mantén términos teológicos y griegos correctamente escritos
5. Limpia errores de OCR obvios

FORMATO DE SALIDA (JSON estricto):
{
  "totalPages": <número>,
  "pages": [
    { "pageNumber": 1, "text": "Texto limpio de la página 1..." }
  ],
  "detectedTitle": "Título detectado o null",
  "detectedAuthor": "Autor detectado o null"
}

IMPORTANTE: Responde SOLO con JSON válido, sin markdown ni explicaciones adicionales.`;

    const result = await model.generateContent([
        prompt,
        { fileData: { mimeType: geminiFile.mimeType!, fileUri: geminiFile.uri } },
    ]);

    // Cleanup the temp Gemini file
    await fileManager.deleteFile(geminiFile.name).catch(() => { /* ignore cleanup errors */ });

    const responseText = result.response.text();
    let cleanJson = responseText.trim();

    // Strip markdown code fences if present
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    else if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
    cleanJson = cleanJson.trim();

    if (!cleanJson.startsWith('{')) {
        const start = cleanJson.indexOf('{');
        const end = cleanJson.lastIndexOf('}');
        if (start !== -1 && end !== -1) cleanJson = cleanJson.substring(start, end + 1);
    }

    const parsed = JSON.parse(cleanJson) as {
        totalPages: number;
        pages: Array<{ pageNumber: number; text: string }>;
        detectedTitle?: string | null;
        detectedAuthor?: string | null;
    };

    const text = parsed.pages
        .map(p => `[PÁGINA ${p.pageNumber}]\n${p.text}`)
        .join('\n\n');

    return { text, pageCount: parsed.totalPages };
}

// ---------------------------------------------------------------------------
// Main Cloud Function
// ---------------------------------------------------------------------------

export const syncResourceToGemini = onCall<SyncResourceRequest>({
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 300,
    secrets: ['GEMINI_API_KEY']
}, async (request) => {
    const db = getFirestore();
    const storage = getStorage();
    console.log('🚀 syncResourceToGemini started');

    try {
        const { resourceId } = request.data;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
        if (!resourceId) throw new Error('No resourceId provided');

        // 1. Fetch resource document
        const docRef = db.collection('library_resources').doc(resourceId);
        const doc = await docRef.get();

        if (!doc.exists) throw new Error(`Resource ${resourceId} does not exist`);

        const data = doc.data()!;
        if (!data.storageUrl) throw new Error(`Resource ${resourceId} has no storageUrl`);

        const title: string = data.title || resourceId;
        const storageUrl: string = data.storageUrl;
        const mimeType: string = data.mimeType || data.metadata?.mimeType || 'application/pdf';
        const isImage = IMAGE_MIME_TYPES.includes(mimeType);

        console.log(`📚 [Sync] Processing "${title}" (${mimeType})`);

        // -----------------------------------------------------------------------
        // 2. Determine enriched text for upload
        // -----------------------------------------------------------------------

        let enrichedText: string | null = null;
        let pageCount = 0;

        // Check if we already have extracted text from extractPdfWithGemini
        const existingTextContent: string | undefined = data.textContent;
        if (existingTextContent && existingTextContent.length > 100) {
            console.log(`✅ [Sync] Using existing extracted textContent (${existingTextContent.length} chars)`);
            enrichedText = existingTextContent;
            pageCount = data.pageCount || 0;
        } else {
            // Need to extract text now
            console.log(`🔍 [Sync] No textContent found — extracting now...`);

            // Download file
            const ext = isImage ? `.${mimeType.split('/')[1]}` : '.pdf';
            const tempFilePath = path.join(os.tmpdir(), `gemini_sync_${resourceId}${ext}`);

            if (storageUrl.startsWith('gs://')) {
                const parts = storageUrl.replace('gs://', '').split('/');
                const bucketName = parts[0];
                const filePath = parts.slice(1).join('/');
                await storage.bucket(bucketName).file(filePath).download({ destination: tempFilePath });
            } else {
                const response = await fetch(storageUrl);
                if (!response.ok) throw new Error(`Failed to fetch ${storageUrl}: ${response.statusText}`);
                fs.writeFileSync(tempFilePath, Buffer.from(await response.arrayBuffer()));
            }

            const stats = fs.statSync(tempFilePath);
            const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`📥 [Sync] Downloaded file: ${fileSizeMB}MB`);

            if (isImage) {
                // Images go straight to Gemini OCR
                console.log(`🖼️ [Sync] Image file — using Gemini OCR`);
                const result = await extractTextWithGeminiOCR(tempFilePath, mimeType, title, apiKey);
                enrichedText = result.text;
                pageCount = result.pageCount;
            } else {
                // PDF: try local extraction first (fast, free)
                const buffer = fs.readFileSync(tempFilePath);

                if (stats.size <= MAX_GEMINI_FILE_SIZE) {
                    try {
                        const localResult = await extractTextLocallyWithPages(buffer);
                        if (localResult) {
                            console.log(`✅ [Sync] Local PDF extraction succeeded (${localResult.pageCount} pages)`);
                            enrichedText = localResult.text;
                            pageCount = localResult.pageCount;
                        } else {
                            // Scanned PDF — fall back to Gemini OCR
                            console.log(`🤖 [Sync] Scanned PDF — falling back to Gemini OCR`);
                            const geminiResult = await extractTextWithGeminiOCR(tempFilePath, mimeType, title, apiKey);
                            enrichedText = geminiResult.text;
                            pageCount = geminiResult.pageCount;
                        }
                    } catch (localError) {
                        console.warn(`⚠️ [Sync] Local extraction failed, using Gemini OCR:`, localError);
                        const geminiResult = await extractTextWithGeminiOCR(tempFilePath, mimeType, title, apiKey);
                        enrichedText = geminiResult.text;
                        pageCount = geminiResult.pageCount;
                    }
                } else {
                    // File too large for Gemini — use local extraction only
                    console.log(`📄 [Sync] File too large for Gemini (${fileSizeMB}MB) — using local extraction`);
                    const localResult = await extractTextLocallyWithPages(buffer);
                    if (localResult) {
                        enrichedText = localResult.text;
                        pageCount = localResult.pageCount;
                    } else {
                        throw new Error(`PDF appears to be a scanned image but is too large (${fileSizeMB}MB) for Gemini OCR (50MB limit)`);
                    }
                }
            }

            // Save extracted text back to Firestore for future use
            await docRef.update({
                textContent: enrichedText,
                pageCount,
                textExtractionStatus: 'ready',
                extractedAt: new Date(),
                characterCount: enrichedText.length,
                updatedAt: new Date()
            });

            // Cleanup temp file
            try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }
        }

        if (!enrichedText) throw new Error('Could not produce enriched text for this resource');

        // -----------------------------------------------------------------------
        // 3. Upload enriched text as .txt to Gemini Files API
        // -----------------------------------------------------------------------

        // Write enriched text to a temp file
        const textFilePath = path.join(os.tmpdir(), `gemini_sync_${resourceId}.txt`);
        const header = `DOCUMENTO: ${title}\n${'='.repeat(60)}\n\n`;
        fs.writeFileSync(textFilePath, header + enrichedText, 'utf8');

        const fileManager = new GoogleAIFileManager(apiKey);

        console.log(`⬆️ [Sync] Uploading enriched text to Gemini Files API...`);
        const uploadResult = await fileManager.uploadFile(textFilePath, {
            mimeType: 'text/plain',
            displayName: title,
        });

        // Cleanup temp text file
        try { fs.unlinkSync(textFilePath); } catch { /* ignore */ }

        // Wait for Gemini to process
        let geminiFile = await fileManager.getFile(uploadResult.file.name);
        while (geminiFile.state === 'PROCESSING') {
            console.log(`⏳ [Sync] Waiting for Gemini to process uploaded text...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            geminiFile = await fileManager.getFile(uploadResult.file.name);
        }

        if (geminiFile.state === 'FAILED') throw new Error('Gemini failed to process the uploaded text');

        console.log(`✅ [Sync] File ready: ${uploadResult.file.name}`);

        // -----------------------------------------------------------------------
        // 4. Save geminiUri & geminiName to Firestore
        // -----------------------------------------------------------------------
        await docRef.update({
            geminiUri: uploadResult.file.uri,
            geminiName: uploadResult.file.name,
            pageCount,
            metadata: {
                ...data.metadata,
                geminiUri: uploadResult.file.uri,
                geminiName: uploadResult.file.name,
                geminiSyncedAt: new Date().toISOString(),
                pageCount,
                enrichedUpload: true, // Flag: uploaded as enriched text with page markers
            }
        });

        console.log('🎉 [Sync] Resource synced with enriched text — agents can now cite page numbers!');

        return {
            success: true,
            geminiUri: uploadResult.file.uri,
            geminiName: uploadResult.file.name,
            pageCount,
            enrichedUpload: true
        };

    } catch (error) {
        console.error('🔥 [Sync] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
});
