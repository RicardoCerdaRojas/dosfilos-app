import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
    getMetadata,
    updateMetadata,
    uploadString,
    getBytes,
    FirebaseStorage,
    StorageReference,
    UploadTaskSnapshot
} from 'firebase/storage';
import {
    IStorageService,
    UploadOptions,
    UploadProgress,
    StoredFile
} from '@dosfilos/domain';
import { initializeFirebase } from '../config/firebase';

export class FirebaseStorageService implements IStorageService {
    private storage: FirebaseStorage;

    constructor() {
        const { app } = initializeFirebase();
        this.storage = getStorage(app);
    }

    async uploadText(path: string, content: string): Promise<string> {
        try {
            const storageRef = ref(this.storage, path);
            await uploadString(storageRef, content, 'raw', {
                contentType: 'text/plain'
            });
            return await getDownloadURL(storageRef);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async uploadFile(
        file: File | Blob,
        path: string,
        options?: UploadOptions,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<StoredFile> {
        try {
            const fullPath = options?.folder
                ? `${options.folder}/${path}`.replace(/\/+/g, '/')
                : path;

            const storageRef = ref(this.storage, fullPath);

            const metadata = {
                contentType: options?.contentType || file.type,
                customMetadata: options?.metadata
            };

            const uploadTask = uploadBytesResumable(storageRef, file, metadata);

            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot: UploadTaskSnapshot) => {
                        if (onProgress) {
                            const progress: UploadProgress = {
                                bytesTransferred: snapshot.bytesTransferred,
                                totalBytes: snapshot.totalBytes,
                                percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                            };
                            onProgress(progress);
                        }
                    },
                    (error) => {
                        reject(this.handleError(error));
                    },
                    async () => {
                        try {
                            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                            const fileMetadata = await getMetadata(uploadTask.snapshot.ref);

                            resolve(this.mapToFile(fileMetadata, downloadUrl));
                        } catch (error) {
                            reject(this.handleError(error));
                        }
                    }
                );
            });
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async uploadFiles(
        files: File[],
        folder: string,
        options?: UploadOptions,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<StoredFile[]> {
        // This is a simplified implementation. For accurate total progress, 
        // we would need to aggregate progress from all files.
        const promises = files.map(file =>
            this.uploadFile(file, file.name, { ...options, folder })
        );
        return Promise.all(promises);
    }

    async downloadFile(path: string): Promise<Blob> {
        try {
            const storageRef = ref(this.storage, path);
            const bytes = await getBytes(storageRef);
            return new Blob([bytes]);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getDownloadUrl(path: string): Promise<string> {
        try {
            const storageRef = ref(this.storage, path);
            return await getDownloadURL(storageRef);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async deleteFile(path: string): Promise<void> {
        try {
            const storageRef = ref(this.storage, path);
            await deleteObject(storageRef);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async deleteFiles(paths: string[]): Promise<void> {
        await Promise.all(paths.map(path => this.deleteFile(path)));
    }

    async listFiles(folder: string): Promise<StoredFile[]> {
        try {
            const listRef = ref(this.storage, folder);
            const res = await listAll(listRef);

            const filePromises = res.items.map(async (itemRef) => {
                const metadata = await getMetadata(itemRef);
                const url = await getDownloadURL(itemRef);
                return this.mapToFile(metadata, url);
            });

            return Promise.all(filePromises);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getFileMetadata(path: string): Promise<StoredFile> {
        try {
            const storageRef = ref(this.storage, path);
            const metadata = await getMetadata(storageRef);
            const url = await getDownloadURL(storageRef);
            return this.mapToFile(metadata, url);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updateFileMetadata(
        path: string,
        metadata: Record<string, string>
    ): Promise<void> {
        try {
            const storageRef = ref(this.storage, path);
            await updateMetadata(storageRef, { customMetadata: metadata });
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async fileExists(path: string): Promise<boolean> {
        try {
            await this.getFileMetadata(path);
            return true;
        } catch (error: any) {
            if (error.code === 'storage/object-not-found') {
                return false;
            }
            throw error;
        }
    }

    async getStorageUsage(userId: string): Promise<{
        usedBytes: number;
        fileCount: number;
    }> {
        // Note: Firebase Storage client SDK doesn't support getting folder size directly.
        // We would need to list all files recursively or use Cloud Functions.
        // For now, we'll list files in the user's root folder (non-recursive for MVP)
        try {
            const userFolder = `users/${userId}`;
            const files = await this.listFiles(userFolder);

            const usedBytes = files.reduce((acc, file) => acc + file.size, 0);

            return {
                usedBytes,
                fileCount: files.length
            };
        } catch (error) {
            // If folder doesn't exist or empty, return 0
            return { usedBytes: 0, fileCount: 0 };
        }
    }

    private mapToFile(metadata: any, downloadUrl: string): StoredFile {
        return {
            id: metadata.fullPath,
            name: metadata.name,
            url: downloadUrl, // Using downloadUrl as url for now
            downloadUrl: downloadUrl,
            size: metadata.size,
            contentType: metadata.contentType,
            uploadedAt: new Date(metadata.timeCreated),
            metadata: metadata.customMetadata || {}
        };
    }

    private handleError(error: any): Error {
        console.error('Firebase Storage Error:', error);

        const code = error.code;
        let message = error.message;

        switch (code) {
            case 'storage/unauthorized':
                message = 'No tienes permisos para realizar esta acción';
                break;
            case 'storage/canceled':
                message = 'La subida del archivo fue cancelada';
                break;
            case 'storage/unknown':
                message = 'Ocurrió un error desconocido con el almacenamiento';
                break;
            case 'storage/object-not-found':
                message = 'El archivo no fue encontrado';
                break;
            case 'storage/quota-exceeded':
                message = 'Has excedido tu cuota de almacenamiento';
                break;
        }

        return new Error(message);
    }
}
