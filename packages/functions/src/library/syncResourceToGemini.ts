import { onCall } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Initialize Firebase if not already done
try {
    initializeApp();
} catch (e) {
    // Already initialized
}

const db = getFirestore();
const storage = getStorage();

interface SyncResourceRequest {
    resourceId: string;
}

export const syncResourceToGemini = onCall<SyncResourceRequest>({
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 300
}, async (request) => {
    console.log('🚀 syncResourceToGemini function started');

    try {
        const { resourceId } = request.data;

        // Use environment variable for API key (set in Firebase Functions config)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }

        if (!resourceId) {
            throw new Error('No resourceId provided');
        }

        const fileManager = new GoogleAIFileManager(apiKey);

        console.log(`Fetching doc ${resourceId}...`);
        const docRef = db.collection('library_resources').doc(resourceId);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new Error(`Doc ${resourceId} does not exist`);
        }

        const data = doc.data();
        if (!data?.storageUrl) {
            throw new Error(`Doc ${resourceId} has no storageUrl`);
        }

        const storageUrl = data.storageUrl;
        console.log(`Downloading ${data.title} from ${storageUrl}...`);

        const tempFilePath = path.join(os.tmpdir(), `gemini_sync_${resourceId}.pdf`);

        // Download
        if (storageUrl.startsWith('gs://')) {
            const parts = storageUrl.replace('gs://', '').split('/');
            const bucketName = parts[0];
            const filePath = parts.slice(1).join('/');
            await storage.bucket(bucketName).file(filePath).download({ destination: tempFilePath });
        } else {
            // Assume HTTP
            const response = await fetch(storageUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${storageUrl}: ${response.statusText}`);
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(tempFilePath, Buffer.from(buffer));
        }

        // Upload to Gemini
        console.log(`Uploading ${data.title} to Gemini...`);
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: 'application/pdf',
            displayName: data.title
        });

        console.log(`Uploaded ${data.title}: ${uploadResult.file.name}`);

        // Wait for file to be processed
        let geminiFile = await fileManager.getFile(uploadResult.file.name);
        while (geminiFile.state === 'PROCESSING') {
            console.log(`⏳ [Gemini] File still processing...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            geminiFile = await fileManager.getFile(uploadResult.file.name);
        }

        if (geminiFile.state === 'FAILED') {
            throw new Error('Gemini file processing failed');
        }

        // Extract page count using Gemini
        // We use a lightweight model just to get the page count if possible, 
        // or we can rely on the file metadata if Gemini provides it, but usually it doesn't provide page count directly in metadata.
        // So we'll run a quick generation to get the page count.

        // Actually, for accuracy and since we are already paying the latency cost, 
        // let's try to get the page count. 
        // Note: The most reliable way without re-extracting all text (which is expensive) 
        // is to trust the PDF parser if we have it, OR ask Gemini "How many pages?".

        // Let's use pdf-parse locally as it's faster and free for just page count.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const pdfBuffer = fs.readFileSync(tempFilePath);
        const pdfData = await pdfParse(pdfBuffer);
        const pageCount = pdfData.numpages;

        console.log(`📄 Page count determined: ${pageCount}`);

        // Cleanup temp file
        fs.unlinkSync(tempFilePath);

        // Update Firestore
        await docRef.update({
            pageCount: pageCount, // Update top-level pageCount
            metadata: {
                ...data.metadata,
                geminiUri: uploadResult.file.uri,
                geminiName: uploadResult.file.name,
                geminiSyncedAt: new Date().toISOString(),
                pageCount: pageCount // Also update metadata for backward compatibility
            }
        });

        console.log('✅ Resource updated with Gemini URI');

        return {
            success: true,
            geminiUri: uploadResult.file.uri,
            geminiName: uploadResult.file.name
        };

    } catch (error) {
        console.error('🔥 Error in syncResourceToGemini:', error);
        // Ensure we return a 200 OK with error details to avoid CORS issues
        // The client should check for success: false
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown internal error',
            details: JSON.stringify(error)
        };
    }
});
