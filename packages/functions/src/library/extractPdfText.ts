import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const db = getFirestore();
const storage = getStorage();

/**
 * Cloud Function: Extract text from PDFs uploaded to library
 * 
 * Triggers when a PDF is uploaded to: users/{userId}/library/{resourceId}/{filename}.pdf
 * Extracts text using pdf-parse and saves to Cloud Storage as .txt file
 * Updates Firestore with the URL to the text file
 */
export const extractPdfText = onObjectFinalized(
    {
        bucket: 'dosfilosapp.firebasestorage.app',
        region: 'us-central1',
        memory: '1GiB',
        timeoutSeconds: 300,
    },
    async (event) => {
        const filePath = event.data.name;
        const contentType = event.data.contentType;

        console.log(`📄 Processing file: ${filePath}`);

        // Only process PDFs in library folder
        if (!filePath || !contentType?.includes('pdf')) {
            console.log('Skipping: Not a PDF file');
            return;
        }

        // Check if it's in the library path: users/{userId}/library/{resourceId}/{filename}
        const libraryPathMatch = filePath.match(/^users\/([^/]+)\/library\/([^/]+)\//);
        if (!libraryPathMatch) {
            console.log('Skipping: Not in library path');
            return;
        }

        const userId = libraryPathMatch[1];
        const resourceId = libraryPathMatch[2];

        console.log(`📚 Extracting text for user: ${userId}, resource: ${resourceId}`);

        const resourceRef = db.collection('library_resources').doc(resourceId);

        try {
            // Wait for document to exist (may be created shortly after upload)
            let resourceDoc;
            const maxRetries = 5;
            const retryDelayMs = 3000;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                resourceDoc = await resourceRef.get();
                if (resourceDoc.exists) {
                    console.log(`✅ Document found on attempt ${attempt}`);
                    break;
                }
                console.log(`⏳ Document not found (attempt ${attempt}/${maxRetries}), waiting ${retryDelayMs}ms...`);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                }
            }

            if (!resourceDoc || !resourceDoc.exists) {
                console.log(`⚠️ Resource document ${resourceId} not found after ${maxRetries} attempts`);
                return;
            }

            // Update status to processing
            await resourceRef.update({
                textExtractionStatus: 'processing',
                updatedAt: new Date()
            });
            console.log(`🔄 Set status to 'processing' for resource ${resourceId}`);

            // Download the PDF file
            const bucket = storage.bucket(event.data.bucket);
            const file = bucket.file(filePath);
            const [buffer] = await file.download();

            console.log(`📥 Downloaded file: ${buffer.length} bytes`);

            // Extract text using pdf-parse
            const pdfData = await pdfParse(buffer);
            const extractedText = pdfData.text as string;

            console.log(`📝 Extracted ${extractedText.length} characters from ${pdfData.numpages} pages`);

            // Save extracted text to Cloud Storage as .txt file
            const textFilePath = `users/${userId}/library/${resourceId}/extracted-text.txt`;
            const textFile = bucket.file(textFilePath);

            await textFile.save(extractedText, {
                contentType: 'text/plain; charset=utf-8',
                metadata: {
                    resourceId,
                    userId,
                    extractedAt: new Date().toISOString(),
                    characterCount: extractedText.length.toString(),
                    pageCount: pdfData.numpages.toString()
                }
            });

            console.log(`💾 Saved text to Storage: ${textFilePath} (${extractedText.length} chars)`);

            // Use gs:// path format instead of signed URL (avoids IAM permission issues)
            // Client will use Firebase Storage SDK to download
            const textStoragePath = `gs://${event.data.bucket}/${textFilePath}`;

            // Update Firestore document with text file path and status
            await resourceRef.update({
                textContentUrl: textStoragePath,
                textExtractionStatus: 'ready',
                extractedAt: new Date(),
                pageCount: pdfData.numpages,
                characterCount: extractedText.length,
                needsReindex: true,
                updatedAt: new Date()
            });
            console.log(`✅ Updated resource ${resourceId} with text URL (status: ready)`);

        } catch (error) {
            console.error(`❌ Error extracting text from ${filePath}:`, error);

            // Update status to failed
            try {
                await resourceRef.update({
                    textExtractionStatus: 'failed',
                    extractionError: error instanceof Error ? error.message : 'Unknown error',
                    updatedAt: new Date()
                });
                console.log(`❌ Set status to 'failed' for resource ${resourceId}`);
            } catch (updateError) {
                console.error('Failed to update error status:', updateError);
            }

            throw error;
        }
    }
);


