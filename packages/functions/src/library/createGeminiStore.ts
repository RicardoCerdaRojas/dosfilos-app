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

interface FileSearchStore {
    name: string;
}

interface CreateStoreRequest {
    resourceIds: string[];
}

export const createGeminiStore = onCall<CreateStoreRequest>({
    cors: true,
    secrets: ['GEMINI_API_KEY']
}, async (request) => {
    console.log('🚀 createGeminiStore function started');

    try {
        const { resourceIds } = request.data;
        console.log('Request data:', JSON.stringify(request.data));

        // Use environment variable for API key (set in Firebase Functions config)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('❌ GEMINI_API_KEY environment variable is not set');
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }

        if (!resourceIds || resourceIds.length === 0) {
            console.error('❌ No resourceIds provided');
            throw new Error('No resourceIds provided');
        }

        const fileManager = new GoogleAIFileManager(apiKey);
        const uploadedFiles = [];

        // 1. Download and Upload Files
        console.log(`Processing ${resourceIds.length} resources...`);

        for (const resourceId of resourceIds) {
            console.log(`Fetching doc ${resourceId}...`);
            const doc = await db.collection('library_resources').doc(resourceId).get();
            if (!doc.exists) {
                console.log(`Doc ${resourceId} does not exist`);
                continue;
            }

            const data = doc.data();
            if (!data?.storageUrl) {
                console.log(`Doc ${resourceId} has no storageUrl`);
                continue;
            }

            const storageUrl = data.storageUrl;
            console.log(`Downloading ${data.title} from ${storageUrl}...`);

            const tempFilePath = path.join(os.tmpdir(), `gemini_${resourceId}.pdf`);

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
            uploadedFiles.push(uploadResult.file);
            fs.unlinkSync(tempFilePath);
        }

        // 2. Create Store
        console.log('Creating Gemini Store...');
        const createStoreResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: "DosFilos Test Store" })
        });

        if (!createStoreResponse.ok) {
            const errText = await createStoreResponse.text();
            console.error(`Failed to create store: ${createStoreResponse.status} ${errText}`);
            throw new Error(`Failed to create store: ${errText}`);
        }

        const store = await createStoreResponse.json() as FileSearchStore;
        console.log(`Store created: ${store.name}`);

        // 3. Add files to store
        for (const file of uploadedFiles) {
            console.log(`Adding ${file.name} to store...`);
            const addResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/${store.name}/files?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resourceName: file.name })
            });

            if (!addResp.ok) {
                console.error(`Failed to add file: ${await addResp.text()}`);
            } else {
                console.log(`Added ${file.name} to store`);
            }
        }

        console.log('✅ Function completed successfully');
        return {
            success: true,
            storeName: store.name,
            fileCount: uploadedFiles.length,
            fileUris: uploadedFiles.map(f => f.uri)
        };

    } catch (error) {
        console.error('🔥 Error in createGeminiStore:', error);
        // Return error structure instead of throwing to avoid CORS issues on crash
        return {
            success: false,
            error: (error as Error).message,
            stack: (error as Error).stack
        };
    }
});
