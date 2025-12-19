import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_CONFIG } from "./config";

export class GeminiFileSearchService {
    private genAI: GoogleGenerativeAI;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Upload a file directly to Gemini API (Browser compatible)
     */
    async uploadFile(fileBlob: Blob, mimeType: string = 'application/pdf', displayName?: string): Promise<string> {
        console.log(`📤 GeminiFileSearch: Uploading file (${fileBlob.size} bytes)...`);

        // 1. Initial Resumable Upload Request to get upload URL
        const metadata = { file: { displayName } };
        const initResponse = await fetch(
            `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: {
                    'X-Goog-Upload-Protocol': 'resumable',
                    'X-Goog-Upload-Command': 'start',
                    'X-Goog-Upload-Header-Content-Length': fileBlob.size.toString(),
                    'X-Goog-Upload-Header-Content-Type': mimeType,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metadata)
            }
        );

        if (!initResponse.ok) {
            throw new Error(`Failed to initiate upload: ${initResponse.statusText}`);
        }

        const uploadUrl = initResponse.headers.get('x-goog-upload-url');
        if (!uploadUrl) {
            throw new Error('No upload URL received from Gemini API');
        }

        // 2. Perform the actual upload
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'upload, finalize',
                'X-Goog-Upload-Offset': '0',
                'Content-Length': fileBlob.size.toString()
            },
            body: fileBlob
        });

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload file content: ${uploadResponse.statusText}`);
        }

        const result = await uploadResponse.json() as { file: { uri: string; name: string } };
        const fileUri = result.file.uri;
        console.log('✅ Gemini Upload Complete:', fileUri);

        // 3. Wait for file to become ACTIVE (Processing check)
        console.log('⏳ Waiting for file processing...');
        let isActive = false;
        let attempts = 0;
        const maxAttempts = 30; // Wait up to 30 seconds

        const fileName = result.file.name; // format: files/xxxxxx

        while (!isActive && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s

            const stateResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${this.apiKey}`
            );

            if (stateResponse.ok) {
                const fileState = await stateResponse.json() as { state: string };
                if (fileState.state === 'ACTIVE') {
                    isActive = true;
                    console.log('✅ File is ACTIVE and ready.');
                } else if (fileState.state === 'FAILED') {
                    throw new Error('Gemini File Processing FAILED');
                }
            }
            attempts++;
        }

        if (!isActive) {
            console.warn('⚠️ File upload timed out waiting for ACTIVE state. It might not be ready yet.');
        }

        return fileUri;
    }

    async createCache(fileUris: string[], ttlSeconds: number = 3600): Promise<{ name: string; expireTime: Date }> {
        console.log(`📦 GeminiFileSearch: Creating cache for ${fileUris.length} files...`);
        try {
            // Use fetch directly to avoid Server SDK issues in Browser
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: `models/${GEMINI_CONFIG.MODEL_NAME}`, // 🎯 Use Configured Model
                        contents: fileUris.map(uri => ({
                            role: 'user',
                            parts: [{
                                fileData: {
                                    fileUri: uri,
                                    mimeType: "application/pdf"
                                }
                            }]
                        })),
                        ttl: `${ttlSeconds}s`
                    })
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('🚨 GEMINI CACHE API ERROR BODY:', errorBody); // 🎯 NEW: Explicit log
                throw new Error(`Gemini Cache Creation Failed (${response.status}): ${errorBody}`);
            }

            const cache = await response.json() as { name: string; expireTime: string };
            console.log('✅ Cache created:', cache.name, 'Expires:', cache.expireTime);

            // Return both name and expireTime for proper tracking
            return {
                name: cache.name,
                expireTime: new Date(cache.expireTime)
            };

        } catch (error: any) {
            // Check for permission/expiration errors (403/404)
            if (error.toString().includes('403') || error.toString().includes('404')) {
                console.warn('⚠️ GeminiFileSearch: Cache creation failed due to expired files or permissions.');
                console.warn('ℹ️ Suggestion: Re-upload the documents to generate new Gemini URIs.');
            } else {
                console.error('❌ GeminiFileSearch Cache Error:', error);
            }
            throw error;
        }
    }

    /**
     * Create a File Search Store (permanent, no expiration)
     * Stores don't expire until manually deleted
     * @param fileUris Array of Gemini file URIs
     * @param displayName Optional display name for the store
     * @returns Store name and creation time
     */
    async createFileSearchStore(
        fileUris: string[],
        displayName?: string
    ): Promise<{ name: string; createTime: Date }> {
        console.log(`📚 Creating File Search Store with ${fileUris.length} files...`);

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        displayName: displayName || `Store-${Date.now()}`,
                        fileUris
                    })
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('🚨 FILE SEARCH STORE CREATE ERROR:', errorBody);
                throw new Error(`File Search Store creation failed (${response.status}): ${errorBody}`);
            }

            const store = await response.json() as { name: string; createTime: string };
            console.log('✅ File Search Store created:', store.name);

            return {
                name: store.name,
                createTime: new Date(store.createTime)
            };

        } catch (error: any) {
            console.error('❌ File Search Store creation error:', error);
            throw error;
        }
    }

    /**
     * Delete a File Search Store
     * @param storeName The resource name of the store
     */
    async deleteFileSearchStore(storeName: string): Promise<void> {
        console.log(`🗑️ Deleting File Search Store: ${storeName}`);

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/${storeName}?key=${this.apiKey}`,
                {
                    method: 'DELETE'
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Store deletion failed (${response.status}): ${errorBody}`);
            }

            console.log('✅ File Search Store deleted');
        } catch (error: any) {
            console.error('❌ Store deletion error:', error);
            throw error;
        }
    }

    /**
     * List all File Search Stores in the project
     * @returns Array of store names
     */
    async listFileSearchStores(): Promise<Array<{ name: string; displayName: string; createTime: Date }>> {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${this.apiKey}`,
                {
                    method: 'GET'
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`List stores failed (${response.status}): ${errorBody}`);
            }

            const data = await response.json() as { fileSearchStores?: Array<{ name: string; displayName: string; createTime: string }> };

            return (data.fileSearchStores || []).map(store => ({
                name: store.name,
                displayName: store.displayName,
                createTime: new Date(store.createTime)
            }));

        } catch (error: any) {
            console.error('❌ List stores error:', error);
            return [];
        }
    }

    /**
     * Sends a message to Gemini using a specific File Search Store for context.
     * @param message The user's query
     * @param storeName The resource name of the File Search Store (e.g. "fileSearchStores/...")
     * @returns The generated response text
     */
    async chatWithStore(message: string, storeName: string): Promise<string> {
        console.log(`🤖 GeminiFileSearch: Querying "${message}" against store "${storeName}"`);

        try {
            // Use gemini-1.5-flash for speed and efficiency
            // Note: Ensure the model supports file_search tool
            const model = this.genAI.getGenerativeModel({
                model: GEMINI_CONFIG.MODEL_NAME,
                tools: [
                    {
                        // @ts-ignore - Types might be missing in some SDK versions
                        fileSearch: {
                            fileSearchStoreNames: [storeName]
                        }
                    }
                ]
            });

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: message }] }]
            });

            const response = result.response;
            console.log('🤖 GeminiFileSearch: Response received');

            // Log citations if available for debugging
            // @ts-ignore
            if (response.candidates?.[0]?.groundingMetadata) {
                // @ts-ignore
                console.log('📚 Citations:', response.candidates[0].groundingMetadata);
            }

            return response.text();
        } catch (error) {
            console.error('❌ GeminiFileSearch Error:', error);
            throw error;
        }
    }

    /**
     * Sends a message to Gemini using direct file URIs for context (Multimodal).
     * @param message The user's query
     * @param fileUris Array of file URIs (gs:// or https://generativelanguage...)
     * @returns The generated response text
     */
    async chatWithFiles(message: string, fileUris: string[]): Promise<string> {
        console.log(`🤖 GeminiFileSearch: Querying "${message}" with ${fileUris.length} files`);

        try {
            // Use gemini-2.5-flash or 1.5-flash (both support large context)
            const model = this.genAI.getGenerativeModel({
                model: GEMINI_CONFIG.MODEL_NAME,
                systemInstruction: "You are an expert theology assistant. Use the provided documents as your primary source. Be concise and cite page numbers when possible. If the exact answer is not explicitly stated, infer from the context or summarize relevant sections."
            });

            const fileParts = fileUris.map(uri => ({
                fileData: {
                    fileUri: uri,
                    mimeType: "application/pdf"
                }
            }));

            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        ...fileParts,
                        { text: message }
                    ]
                }]
            });

            const response = result.response;
            console.log('🤖 GeminiFileSearch: Response received');
            return response.text();
        } catch (error) {
            console.error('❌ GeminiFileSearch Error:', error);
            throw error;
        }
    }


    /**
     * Sends a message to Gemini using a cached context.
     * @param message The user's query
     * @param cacheName The resource name of the cache
     * @returns The generated response text
     */
    async chatWithCache(message: string, cacheName: string): Promise<string> {
        console.log(`🤖 GeminiFileSearch: Querying "${message}" using cache "${cacheName}"`);

        try {
            const modelWithCache = this.genAI.getGenerativeModel({
                model: GEMINI_CONFIG.MODEL_NAME,
                // @ts-ignore
                cachedContent: cacheName
            });

            const result = await modelWithCache.generateContent({
                contents: [{ role: 'user', parts: [{ text: message }] }]
            });

            const response = result.response;
            console.log('🤖 GeminiFileSearch: Response received (Cached)');
            return response.text();
        } catch (error) {
            console.error('❌ GeminiFileSearch Cache Chat Error:', error);
            throw error;
        }
    }
}

