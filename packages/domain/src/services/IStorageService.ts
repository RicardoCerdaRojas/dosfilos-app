/**
 * Interface for file storage service
 * Following Clean Architecture principles - Domain layer interface
 */

export interface UploadOptions {
    folder?: string;
    metadata?: Record<string, string>;
    contentType?: string;
    makePublic?: boolean;
}

export interface UploadProgress {
    bytesTransferred: number;
    totalBytes: number;
    percentage: number;
}

export interface StoredFile {
    id: string;
    name: string;
    url: string;
    downloadUrl: string;
    size: number;
    contentType: string;
    uploadedAt: Date;
    metadata?: Record<string, string>;
}

export interface IStorageService {
    /**
     * Upload a file to storage
     */
    uploadFile(
        file: File | Blob,
        path: string,
        options?: UploadOptions,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<StoredFile>;

    /**
     * Upload multiple files
     */
    uploadFiles(
        files: File[],
        folder: string,
        options?: UploadOptions,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<StoredFile[]>;

    /**
     * Download a file from storage
     */
    downloadFile(path: string): Promise<Blob>;

    /**
     * Get download URL for a file
     */
    getDownloadUrl(path: string): Promise<string>;

    /**
     * Delete a file from storage
     */
    deleteFile(path: string): Promise<void>;

    /**
     * Delete multiple files
     */
    deleteFiles(paths: string[]): Promise<void>;

    /**
     * List files in a folder
     */
    listFiles(folder: string): Promise<StoredFile[]>;

    /**
     * Get file metadata
     */
    getFileMetadata(path: string): Promise<StoredFile>;

    /**
     * Update file metadata
     */
    updateFileMetadata(
        path: string,
        metadata: Record<string, string>
    ): Promise<void>;

    /**
     * Check if file exists
     */
    fileExists(path: string): Promise<boolean>;

    /**
     * Get storage usage for a user
     */
    getStorageUsage(userId: string): Promise<{
        usedBytes: number;
        fileCount: number;
    }>;
}
