import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const db = getFirestore();
const storage = getStorage();

// Gemini file size limit is 50MB
const MAX_GEMINI_FILE_SIZE = 50 * 1024 * 1024;

// Get API key from environment
const getApiKey = (): string => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable not set');
    }
    return apiKey;
};

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
        timeoutSeconds: 540,
        secrets: ['GEMINI_API_KEY'],
    },
    async (event) => {
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
            let usedGemini: boolean;

            // Choose extraction method based on file size
            if (stats.size <= MAX_GEMINI_FILE_SIZE) {
                console.log(`🤖 [Extract] Using Gemini (file size under 50MB)`);
                const apiKey = getApiKey();
                try {
                    const result = await extractWithGemini(tempFilePath, resourceId, apiKey);
                    extractedText = result.text;
                    pageCount = result.pageCount;
                    usedGemini = true;
                } catch (geminiError) {
                    // Fallback to pdf-parse if Gemini fails (e.g., response too large)
                    console.warn(`⚠️ [Extract] Gemini failed, falling back to pdf-parse:`, geminiError);
                    const buffer = fs.readFileSync(tempFilePath);
                    const result = await extractWithPdfParse(buffer);
                    extractedText = result.text;
                    pageCount = result.pageCount;
                    usedGemini = false;
                }
            } else {
                console.log(`📄 [Extract] Using pdf-parse fallback (file size ${fileSizeMB.toFixed(2)}MB exceeds 50MB limit)`);
                const buffer = fs.readFileSync(tempFilePath);
                const result = await extractWithPdfParse(buffer);
                extractedText = result.text;
                pageCount = result.pageCount;
                usedGemini = false;
            }

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

            // Update Firestore document with extracted text and ready status
            await resourceRef.update({
                textContent: finalText,
                textExtractionStatus: 'ready',
                extractedAt: new Date(),
                pageCount,
                characterCount: extractedText.length,
                extractedWithGemini: usedGemini,
                extractionVersion: usedGemini ? '2.0-gemini' : '2.0-pdfparse',
                needsReindex: true,
                wasTruncated,
                updatedAt: new Date()
            });
            console.log(`✅ [Extract] Updated resource ${resourceId} (${usedGemini ? 'Gemini' : 'pdf-parse'}, status: ready)`);

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
