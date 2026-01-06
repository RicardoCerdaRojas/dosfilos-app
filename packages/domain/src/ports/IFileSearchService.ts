import { FileSearchStoreContext, FileSearchStoreEntity } from '../entities/FileSearchStoreEntity';

/**
 * Port (Interface) for File Search operations
 * Following Dependency Inversion Principle - domain defines contract
 */
export interface IFileSearchService {
    /**
     * Upload file to Gemini File API
     * Files are temporary (48h) and used to create stores
     */
    uploadFile(
        fileBlob: Blob,
        mimeType: string,
        displayName: string
    ): Promise<string>;

    /**
     * Create a persistent File Search Store from uploaded files
     * Stores don't expire until manually deleted
     */
    createFileSearchStore(
        fileUris: string[],
        displayName?: string
    ): Promise<{ name: string; createTime: Date }>;

    /**
     * Delete a File Search Store
     */
    deleteFileSearchStore(storeName: string): Promise<void>;

    /**
     * List all File Search Stores
     */
    listFileSearchStores(): Promise<FileSearchStoreEntity[]>;
}

/**
 * Port (Interface) for Core Library management
 * Application layer orchestration
 */
export interface ICoreLibraryService {
    /**
     * Ensure all File Search Stores are ready
     * Creates stores if they don't exist
     * Called at user login
     */
    ensureStoresReady(): Promise<void>;

    /**
     * Get store ID for a specific context
     */
    getStoreId(context: FileSearchStoreContext): string;

    /**
     * Check if stores are initialized
     */
    isInitialized(): boolean;

    /**
     * Force re-creation of stores (admin operation)
     */
    recreateStores(): Promise<void>;
}
