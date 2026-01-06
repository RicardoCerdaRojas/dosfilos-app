/**
 * Entity representing a Gemini File Search Store
 * Stores are persistent and don't expire until manually deleted
 */
export interface FileSearchStoreEntity {
    /** Unique identifier (Gemini store name) */
    id: string;

    /** Store type/context */
    context: FileSearchStoreContext;

    /** Files included in this store */
    files: FileSearchFileMetadata[];

    /** When the store was created */
    createdAt: Date;

    /** Total pages indexed */
    totalPages: number;

    /** Estimated token count */
    estimatedTokens: number;
}

/**
 * Context types for specialized stores
 */
export enum FileSearchStoreContext {
    EXEGESIS = 'exegesis',
    HOMILETICS = 'homiletics',
    GENERIC = 'generic'
}

/**
 * Metadata for a file in a File Search Store
 */
export interface FileSearchFileMetadata {
    /** Gemini file URI */
    geminiUri: string;

    /** Display name */
    name: string;

    /** Firebase Storage path (for re-upload if needed) */
    storagePath: string;

    /** Author */
    author?: string;

    /** Publishing year */
    year?: string;

    /** Page count */
    pages: number;

    /** When uploaded to Gemini */
    uploadedAt: Date;
}

/**
 * Configuration for core library stores (stored in Firestore)
 */
export interface CoreLibraryStoresConfig {
    /** Store IDs (can be null if store not created yet) */
    stores: {
        exegesis: string | null;
        homiletics: string | null;
        generic: string | null;
    };

    /** Files metadata */
    files: {
        exegesis: FileSearchFileMetadata[];
        homiletics: FileSearchFileMetadata[];
        generic: FileSearchFileMetadata[];
    };

    /** When stores were created */
    createdAt: Date;

    /** Last validation check */
    lastValidatedAt: Date;
}
