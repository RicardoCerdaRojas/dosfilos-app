import { IStorageService } from '@dosfilos/domain';
import { FirebaseStorageService } from '@dosfilos/infrastructure';

export class StorageService {
    private static instance: StorageService;
    private storageService: IStorageService;

    private constructor() {
        this.storageService = new FirebaseStorageService();
    }

    public static getInstance(): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    public getService(): IStorageService {
        return this.storageService;
    }
}

export const storageService = StorageService.getInstance().getService();
