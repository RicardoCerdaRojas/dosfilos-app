import {
    ICoreLibraryService,
    IFileSearchService,
    IStorageService,
    FileSearchStoreContext,
    FileSearchFileMetadata,
    CoreLibraryStoresConfig
} from '@dosfilos/domain';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';

/**
 * Core Library Service - Application Layer
 * 
 * Responsibilities (Single Responsibility Principle):
 * - Orchestrate File Search Store creation and management
 * - Manage global configuration in Firestore
 * - Provide store IDs to consumers
 * 
 * Design:
 * - Depends on abstractions (IFileSearchService) not concretions
 * - Open for extension, closed for modification
 * - Injectable dependencies for testability
 */
export class CoreLibraryService implements ICoreLibraryService {
    private stores: Record<FileSearchStoreContext, string | null> = {
        [FileSearchStoreContext.EXEGESIS]: null,
        [FileSearchStoreContext.HOMILETICS]: null,
        [FileSearchStoreContext.GENERIC]: null
    };

    private initialized = false;
    private readonly CONFIG_PATH = 'config/coreLibraryStores';

    constructor(
        private fileSearchService: IFileSearchService,
        private storageService: IStorageService
    ) { }

    /**
     * Ensure all 3 File Search Stores are ready
     * Called at user login
     * 
     * Flow:
     * 1. Load config from Firestore
     * 2. If stores exist → use them
     * 3. If not → create stores
     * 4. Save config for super admin visibility
     */
    async ensureStoresReady(): Promise<void> {
        console.log('🔧 CoreLibraryService: Ensuring stores are ready...');

        // 1. Try to load existing config
        const config = await this.loadConfig();

        if (config && this.areStoresValid(config)) {
            console.log('✅ Using existing stores from config');
            this.stores = config.stores;
            this.initialized = true;

            // Update last validated timestamp
            await this.updateLastValidated();
            return;
        }

        // 2. Create new stores
        console.log('📚 Creating new File Search Stores...');
        await this.createAllStores();

        this.initialized = true;
    }

    /**
     * Get store ID for a specific context
     * Throws if not initialized
     */
    getStoreId(context: FileSearchStoreContext): string {
        if (!this.initialized) {
            throw new Error('CoreLibraryService not initialized. Call ensureStoresReady() first.');
        }

        const storeId = this.stores[context];
        if (!storeId) {
            throw new Error(`Store ${context} not found. This should not happen.`);
        }

        return storeId;
    }

    /**
     * Check if service is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Force re-creation of all stores (admin operation)
     * WARNING: This will delete old stores and create new ones
     */
    async recreateStores(): Promise<void> {
        console.log('🔄 CoreLibraryService: Recreating all stores...');

        // Delete old stores if they exist
        const config = await this.loadConfig();
        if (config) {
            for (const context of Object.values(FileSearchStoreContext)) {
                const storeId = config.stores[context];
                if (storeId) {
                    try {
                        await this.fileSearchService.deleteFileSearchStore(storeId);
                        console.log(`✅ Deleted old store: ${context}`);
                    } catch (error) {
                        console.warn(`⚠️ Could not delete store ${context}:`, error);
                    }
                }
            }
        }

        // Create new stores
        await this.createAllStores();
    }

    /**
     * Private: Create all 3 stores
     */
    private async createAllStores(): Promise<void> {
        const exegesisFiles = await this.uploadAndGetFiles(FileSearchStoreContext.EXEGESIS);
        const homileticsFiles = await this.uploadAndGetFiles(FileSearchStoreContext.HOMILETICS);
        const genericFiles = await this.uploadAndGetFiles(FileSearchStoreContext.GENERIC);

        // Create stores in parallel for speed
        const [exegesisStore, homileticsStore, genericStore] = await Promise.all([
            this.fileSearchService.createFileSearchStore(
                exegesisFiles.map(f => f.geminiUri),
                'Dos Filos - Biblioteca de Exégesis'
            ),
            this.fileSearchService.createFileSearchStore(
                homileticsFiles.map(f => f.geminiUri),
                'Dos Filos - Biblioteca de Homilética'
            ),
            this.fileSearchService.createFileSearchStore(
                genericFiles.map(f => f.geminiUri),
                'Dos Filos - Biblioteca Genérica'
            )
        ]);

        // Update local state
        this.stores = {
            [FileSearchStoreContext.EXEGESIS]: exegesisStore.name,
            [FileSearchStoreContext.HOMILETICS]: homileticsStore.name,
            [FileSearchStoreContext.GENERIC]: genericStore.name
        };

        // Save config to Firestore (visible to super admin)
        await this.saveConfig({
            stores: this.stores,
            files: {
                exegesis: exegesisFiles,
                homiletics: homileticsFiles,
                generic: genericFiles
            },
            createdAt: new Date(),
            lastValidatedAt: new Date()
        });

        console.log('✅ All stores created and config saved');
    }

    /**
     * Private: Upload files for a specific context and return metadata
     */
    private async uploadAndGetFiles(context: FileSearchStoreContext): Promise<FileSearchFileMetadata[]> {
        const coreFilesMap = this.getCoreFilesDefinition();
        const files = coreFilesMap[context];

        const uploadedFiles: FileSearchFileMetadata[] = [];

        for (const fileDef of files) {
            try {
                // Download from Firebase Storage
                const blob = await this.storageService.downloadFileAsBlob(fileDef.storagePath);

                // Upload to Gemini
                const geminiUri = await this.fileSearchService.uploadFile(
                    blob,
                    'application/pdf',
                    fileDef.name
                );

                uploadedFiles.push({
                    geminiUri,
                    name: fileDef.name,
                    storagePath: fileDef.storagePath,
                    author: fileDef.author,
                    year: fileDef.year,
                    pages: fileDef.pages,
                    uploadedAt: new Date()
                });

                console.log(`✅ Uploaded: ${fileDef.name}`);
            } catch (error) {
                console.error(`❌ Failed to upload ${fileDef.name}:`, error);
                throw error;
            }
        }

        return uploadedFiles;
    }

    /**
     * Private: Get core files definition
     * This is the "source of truth" for which files belong to each store
     * 
     * NOTE: Update this when adding/removing core library files
     */
    private getCoreFilesDefinition(): Record<FileSearchStoreContext, Array<{
        name: string;
        storagePath: string;
        author?: string;
        year?: string;
        pages: number;
    }>> {
        return {
            [FileSearchStoreContext.EXEGESIS]: [
                {
                    name: 'Léxico Griego-Español del Nuevo Testamento',
                    storagePath: 'core-library/exegesis/lexico-griego-tuggy.pdf',
                    author: 'Alfred E. Tuggy',
                    year: '1996',
                    pages: 400
                },
                {
                    name: 'Léxico Hebreo-Español del Antiguo Testamento',
                    storagePath: 'core-library/exegesis/lexico-hebreo.pdf',
                    author: 'Moisés Chávez',
                    pages: 400
                },
                {
                    name: 'Introducción a la Hermenéutica Bíblica',
                    storagePath: 'core-library/exegesis/hermeneutica-intro.pdf',
                    author: 'José M. Martínez',
                    pages: 200
                }
            ],
            [FileSearchStoreContext.HOMILETICS]: [
                {
                    name: 'La Predicación Bíblica',
                    storagePath: 'core-library/homiletics/robinson-predicacion.pdf',
                    author: 'Haddon W. Robinson',
                    year: '2000',
                    pages: 300
                },
                {
                    name: 'Teología Sistemática (extractos)',
                    storagePath: 'core-library/homiletics/grudem-teologia.pdf',
                    author: 'Wayne Grudem',
                    year: '2007',
                    pages: 400
                },
                {
                    name: 'El Arte de Predicar',
                    storagePath: 'core-library/homiletics/stott-predicacion.pdf',
                    author: 'John Stott',
                    pages: 200
                },
                {
                    name: 'Bosquejos de Sermones',
                    storagePath: 'core-library/homiletics/bosquejos.pdf',
                    pages: 100
                }
            ],
            [FileSearchStoreContext.GENERIC]: [
                {
                    name: 'Teología Bíblica del AT y NT',
                    storagePath: 'core-library/generic/house-teologia-biblica.pdf',
                    author: 'Paul House',
                    pages: 400
                },
                {
                    name: 'Consejería Bíblica (extractos)',
                    storagePath: 'core-library/generic/adams-consejeria.pdf',
                    author: 'Jay E. Adams',
                    pages: 300
                },
                {
                    name: 'Ética Cristiana',
                    storagePath: 'core-library/generic/etica-cristiana.pdf',
                    author: 'Norman Geisler',
                    pages: 200
                }
            ]
        };
    }

    /**
     * Private: Load config from Firestore
     */
    private async loadConfig(): Promise<CoreLibraryStoresConfig | null> {
        try {
            const db = getFirestore();
            const configDoc = await getDoc(doc(db, this.CONFIG_PATH));

            if (!configDoc.exists()) {
                return null;
            }

            const data = configDoc.data();
            return {
                stores: data.stores,
                files: data.files,
                createdAt: data.createdAt?.toDate() || new Date(),
                lastValidatedAt: data.lastValidatedAt?.toDate() || new Date()
            };
        } catch (error) {
            console.error('❌ Failed to load config:', error);
            return null;
        }
    }

    /**
     * Private: Save config to Firestore
     * This makes configuration visible to super admins
     */
    private async saveConfig(config: CoreLibraryStoresConfig): Promise<void> {
        try {
            const db = getFirestore();
            await setDoc(doc(db, this.CONFIG_PATH), {
                stores: config.stores,
                files: config.files,
                createdAt: config.createdAt,
                lastValidatedAt: config.lastValidatedAt
            });

            console.log('✅ Config saved to Firestore (visible to admins)');
        } catch (error) {
            console.error('❌ Failed to save config:', error);
            throw error;
        }
    }

    /**
     * Private: Update last validated timestamp
     */
    private async updateLastValidated(): Promise<void> {
        try {
            const db = getFirestore();
            await setDoc(doc(db, this.CONFIG_PATH), {
                lastValidatedAt: new Date()
            }, { merge: true });
        } catch (error) {
            console.warn('⚠️ Failed to update last validated:', error);
        }
    }

    /**
     * Private: Check if stores from config are valid
     */
    private areStoresValid(config: CoreLibraryStoresConfig): boolean {
        return !!(
            config.stores.exegesis &&
            config.stores.homiletics &&
            config.stores.generic
        );
    }
}
