import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LlamaParseClient, pagesToMarkedText, pagesToMarkdown } from './llamaParseClient';
import { recordLlamaParseUsage, selectLlamaParseAccount } from './llamaParseAccountSelector';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');


// Gemini file size limit is 50MB
const MAX_GEMINI_FILE_SIZE = 50 * 1024 * 1024;
// LlamaParse supports up to 100MB (and we've verified free-tier covers typical theology books)
const MAX_LLAMAPARSE_FILE_SIZE = 100 * 1024 * 1024;

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
 * Returns structured pages with reliable page numbers.
 */
async function extractWithLlamaParse(
    tempFilePath: string,
    resourceId: string,
    apiKey: string
): Promise<{ text: string; markdown: string; pageCount: number }> {
    const buffer = fs.readFileSync(tempFilePath);
    const client = new LlamaParseClient(apiKey);

    const result = await client.parseDocument(buffer, `${resourceId}.pdf`, {
        mode: 'fast',
        language: 'es',  // Most of the corpus is Spanish; Greek/Hebrew inline survives
        parsingInstruction: 'Preserva con precisión los caracteres griegos (α-ω) y hebreos (א-ת). Mantén la estructura de capítulos, secciones, tablas y notas al pie. No traduzcas términos teológicos ni citas bíblicas.',
    });

    console.log(`[LlamaParse] Parsed ${result.pages.length} pages. Credits used: ${result.jobMetadata.job_credits_usage ?? '?'}`);

    const text = pagesToMarkedText(result.pages);
    const markdown = pagesToMarkdown(result.pages);
    return { text, markdown, pageCount: result.pages.length };
}

interface PageData {
    pageNumber: number;
    text: string;
}

interface ExtractionResult {
    success: boolean;
    totalPages: number;
    pages: PageData[];
    detectedTitle?: string | null;
    detectedAuthor?: string | null;
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
 * Extract text using pdf-parse (fallback for large files)
 */
async function extractWithPdfParse(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    const pdfData = await pdfParse(buffer);
    const cleanedText = cleanPdfText(pdfData.text);
    return {
        text: cleanedText,
        pageCount: pdfData.numpages
    };
}

/**
 * Extract text using Gemini (for files under 50MB)
 */
async function extractWithGemini(
    tempFilePath: string,
    resourceId: string,
    apiKey: string
): Promise<{ text: string; pageCount: number; pages?: PageData[] }> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    console.log(`⬆️ [Gemini] Uploading to Gemini Files API...`);
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: 'application/pdf',
        displayName: `${resourceId}.pdf`,
    });

    // Wait for file to be processed
    let geminiFile = await fileManager.getFile(uploadResult.file.name);
    while (geminiFile.state === FileState.PROCESSING) {
        console.log(`⏳ [Gemini] File still processing...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        geminiFile = await fileManager.getFile(uploadResult.file.name);
    }

    if (geminiFile.state === FileState.FAILED) {
        throw new Error('Gemini file processing failed');
    }

    console.log(`✅ [Gemini] File ready: ${geminiFile.displayName}`);

    // Extract text using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const extractionPrompt = `
Eres un experto en extracción de texto de documentos académicos y teológicos.

TAREA: Extrae TODO el texto de este PDF de forma estructurada y limpia.

REGLAS:
1. Preserva la estructura de párrafos (líneas en blanco entre párrafos)
2. Mantén títulos y subtítulos en líneas separadas
3. NO incluyas números de página en el texto
4. Limpia errores de OCR obvios
5. Preserva citas bíblicas exactamente como aparecen
6. Mantén términos teológicos correctamente escritos

FORMATO DE SALIDA (JSON estricto):
{
  "success": true,
  "totalPages": <número>,
  "pages": [
    {
      "pageNumber": 1,
      "text": "Texto limpio de la página 1..."
    }
  ],
  "detectedTitle": "Título del libro si se detecta o null",
  "detectedAuthor": "Autor si se detecta o null"
}

IMPORTANTE: Responde SOLO con JSON válido, sin markdown ni explicaciones.
`;

    const result = await model.generateContent([
        extractionPrompt,
        {
            fileData: {
                mimeType: geminiFile.mimeType!,
                fileUri: geminiFile.uri,
            },
        },
    ]);

    const responseText = result.response.text();

    // Parse JSON response
    let extractedData: ExtractionResult;
    try {
        // More robust cleanup of various response formats
        let cleanJson = responseText.trim();

        // Remove ```json or ``` at the start
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.slice(7);
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.slice(3);
        }

        // Remove standalone 'json' prefix (without backticks)
        if (cleanJson.startsWith('json')) {
            cleanJson = cleanJson.slice(4);
        }

        // Remove ``` at the end
        if (cleanJson.endsWith('```')) {
            cleanJson = cleanJson.slice(0, -3);
        }

        cleanJson = cleanJson.trim();

        // Try to find JSON object if response has extra text
        if (!cleanJson.startsWith('{')) {
            const jsonStart = cleanJson.indexOf('{');
            const jsonEnd = cleanJson.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
            }
        }

        extractedData = JSON.parse(cleanJson) as ExtractionResult;
    } catch (parseError) {
        console.error('❌ [Gemini] Failed to parse JSON response:', responseText.substring(0, 500));
        throw new Error('Failed to parse Gemini response as JSON');
    }

    // Cleanup Gemini file
    await fileManager.deleteFile(geminiFile.name);

    // Combine pages with markers
    const fullText = extractedData.pages
        ?.map((p: PageData) => `[PAGE ${p.pageNumber}]\n${p.text}`)
        .join('\n\n') || '';

    return {
        text: fullText,
        pageCount: extractedData.totalPages,
        pages: extractedData.pages
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
        // Storage triggers are capped at 540s. For very large PDFs that need more time,
        // use the reprocessWithLlamaParse callable (up to 3600s).
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

            // Update status to processing
            await resourceRef.update({
                textExtractionStatus: 'processing',
                updatedAt: new Date()
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

            let extractedText: string;
            let pageCount: number;
            let extractionVersion: string;
            let structuredMarkdown: string | null = null;

            // Pick a LlamaParse account from the multi-account pool (Hito 6).
            // null when no account configured / has capacity → skip to Gemini.
            let llamaSelected: Awaited<ReturnType<typeof selectLlamaParseAccount>> | null = null;
            try {
                if (stats.size <= MAX_LLAMAPARSE_FILE_SIZE) {
                    llamaSelected = await selectLlamaParseAccount();
                }
            } catch (selectErr: any) {
                console.warn(`⚠️ [Extract] No LlamaParse account available: ${selectErr.message}`);
            }
            const canUseLlamaParse = llamaSelected !== null;

            // Extraction priority:
            //   1. LlamaParse (primary) — best structure/page preservation
            //   2. Gemini 2.0 Flash (fallback) — reliable text extraction
            //   3. pdf-parse (last resort) — local, free, basic
            if (canUseLlamaParse && llamaSelected) {
                const account = llamaSelected;
                console.log(`🦙 [Extract] Using LlamaParse account ${account.accountId}`);
                try {
                    const result = await extractWithLlamaParse(tempFilePath, resourceId, account.apiKey);
                    extractedText = result.text;
                    pageCount = result.pageCount;
                    structuredMarkdown = result.markdown;
                    extractionVersion = '3.0-llamaparse';
                    // Record account usage. Non-fatal if it fails — billing is the source of truth.
                    try {
                        await recordLlamaParseUsage(account.accountId, result.pageCount);
                    } catch (usageErr: any) {
                        console.warn(`[Extract] Account usage update skipped: ${usageErr.message}`);
                    }
                } catch (llamaError) {
                    console.warn(`⚠️ [Extract] LlamaParse failed, falling back to Gemini:`, llamaError);
                    if (stats.size <= MAX_GEMINI_FILE_SIZE) {
                        try {
                            const result = await extractWithGemini(tempFilePath, resourceId, getApiKey());
                            extractedText = result.text;
                            pageCount = result.pageCount;
                            extractionVersion = '2.0-gemini';
                        } catch (geminiError) {
                            console.warn(`⚠️ [Extract] Gemini also failed, using pdf-parse:`, geminiError);
                            const buffer = fs.readFileSync(tempFilePath);
                            const result = await extractWithPdfParse(buffer);
                            extractedText = result.text;
                            pageCount = result.pageCount;
                            extractionVersion = 'fallback-pdfparse';
                        }
                    } else {
                        const buffer = fs.readFileSync(tempFilePath);
                        const result = await extractWithPdfParse(buffer);
                        extractedText = result.text;
                        pageCount = result.pageCount;
                        extractionVersion = 'fallback-pdfparse';
                    }
                }
            } else if (stats.size <= MAX_GEMINI_FILE_SIZE) {
                console.log(`🤖 [Extract] Using Gemini (no LlamaParse key or file size limit)`);
                try {
                    const result = await extractWithGemini(tempFilePath, resourceId, getApiKey());
                    extractedText = result.text;
                    pageCount = result.pageCount;
                    extractionVersion = '2.0-gemini';
                } catch (geminiError) {
                    console.warn(`⚠️ [Extract] Gemini failed, falling back to pdf-parse:`, geminiError);
                    const buffer = fs.readFileSync(tempFilePath);
                    const result = await extractWithPdfParse(buffer);
                    extractedText = result.text;
                    pageCount = result.pageCount;
                    extractionVersion = 'fallback-pdfparse';
                }
            } else {
                console.log(`📄 [Extract] Using pdf-parse (file > 100MB or no LlamaParse)`);
                const buffer = fs.readFileSync(tempFilePath);
                const result = await extractWithPdfParse(buffer);
                extractedText = result.text;
                pageCount = result.pageCount;
                extractionVersion = 'fallback-pdfparse';
            }

            const usedGemini = extractionVersion === '2.0-gemini';
            const usedLlamaParse = extractionVersion === '3.0-llamaparse';

            console.log(`📝 [Extract] Extracted ${extractedText.length} characters from ${pageCount} pages`);

            // Firestore has a 1MB field limit - check size
            const textBytes = Buffer.byteLength(extractedText, 'utf8');
            let finalText = extractedText;
            let wasTruncated = false;

            const MAX_BYTES = 900000;
            if (textBytes > MAX_BYTES) {
                console.log(`⚠️ [Extract] Text too large (${textBytes} bytes), truncating...`);
                finalText = extractedText.substring(0, MAX_BYTES);
                wasTruncated = true;
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
                needsReindex: true,
                wasTruncated,
                updatedAt: new Date()
            };
            if (structuredContentUrl) updateData.structuredContentUrl = structuredContentUrl;

            await resourceRef.update(updateData);
            console.log(`✅ [Extract] Updated resource ${resourceId} (${extractionVersion}, status: ready)`);

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
