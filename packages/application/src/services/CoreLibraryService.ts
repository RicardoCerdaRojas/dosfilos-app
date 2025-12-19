import {
    ICoreLibraryService,
    IFileSearchService,
    FileSearchStoreContext,
    FileSearchFileMetadata,
    CoreLibraryStoresConfig,
    LibraryResourceEntity
} from '@dosfilos/domain';
import { doc, getDoc, setDoc, getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const ADMIN_EMAIL = 'rdocerda@gmail.com';

/**
 * Core Library Service - Refactored
 * 
 * Uses admin's library documents marked as isCore instead of separate Firebase Storage
 * 
 * Flow:
 * 1. Admin uploads PDFs to their library (like any user)
 * 2. Admin marks documents as "core" with coreContext (exegesis|homiletics|generic)
 * 3. System creates File Search Stores from those documents
 * 4. Stores available globally for all users
 * 
 * Benefits:
 * - Reuses existing library infrastructure
 * - No duplicate upload logic
 * - Admin can manage via UI
 * - Cloud Functions handle text extraction automatically
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
        private fileSearchService: IFileSearchService
    ) { }

    async ensureStoresReady(): Promise<void> {
        try {
            console.log('🔧 CoreLibraryService: Ensuring stores are ready...');

            // 1. Load existing config
            const config = await this.loadConfig();

            if (config && this.areStoresValid(config)) {
                console.log('✅ Using existing stores from config');
                this.stores = config.stores;
                this.initialized = true;
                await this.updateLastValidated();
                return;
            }

            // 2. Create new stores from admin's core documents
            console.log('📚 Creating File Search Stores from core library...');
            await this.createAllStores();

            this.initialized = true;
        } catch (error: any) {
            // Graceful degradation: If we can't create stores, that's OK
            // The system will work without them (just without core library context)
            if (error.message?.includes('permissions') || error.code === 'permission-denied') {
                console.warn('⚠️ CoreLibraryService: Insufficient permissions to manage core library.');
                console.warn('💡 To enable core library, update Firestore rules to allow read/write on config/ and users/');
            } else if (error.message?.includes('No core documents')) {
                console.info('💡 CoreLibraryService: No core documents found. Upload PDFs and mark as core to enable.');
            } else {
                console.error('❌ CoreLibraryService error:', error);
            }
            // Don't set initialized = true, but don't throw either
            // Just continue without core library support
        }
    }

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

    isInitialized(): boolean {
        return this.initialized;
    }

    async recreateStores(): Promise<void> {
        console.log('🔄 CoreLibraryService: Recreating all stores...');

        // Delete old stores
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
     * Get core documents from admin's library
     * Groups by coreContext
     */
    private async getCoreDocuments(): Promise<Record<string, LibraryResourceEntity[]>> {
        try {
            const db = getFirestore();

            // Get admin user ID
            const usersRef = collection(db, 'users');
            const adminQuery = query(usersRef, where('email', '==', ADMIN_EMAIL));
            const adminSnapshot = await getDocs(adminQuery);

            if (adminSnapshot.empty) {
                console.warn(`⚠️ Admin user ${ADMIN_EMAIL} not found`);
                return {
                    exegesis: [],
                    homiletics: [],
                    generic: []
                };
            }

            const adminUserId = adminSnapshot.docs[0].id;

            // Get core library resources for admin
            const libraryRef = collection(db, 'library_resources');
            const coreQuery = query(
                libraryRef,
                where('userId', '==', adminUserId),
                where('isCore', '==', true)
            );

            const snapshot = await getDocs(coreQuery);
            const coreDocsByContext: Record<string, LibraryResourceEntity[]> = {
                exegesis: [],
                homiletics: [],
                generic: []
            };

            snapshot.forEach(doc => {
                const data = doc.data();
                const resource = new LibraryResourceEntity(
                    doc.id,
                    data.userId,
                    data.title,
                    data.author,
                    data.type,
                    data.storageUrl,
                    data.mimeType,
                    data.sizeBytes,
                    data.textExtractionStatus,
                    data.textContent,
                    data.createdAt?.toDate(),
                    data.updatedAt?.toDate(),
                    data.preferredForPhases,
                    data.metadata,
                    data.pageCount,
                    data.isCore,
                    data.coreContext
                );

                const context = resource.coreContext || 'generic';
                if (coreDocsByContext[context]) {
                    coreDocsByContext[context].push(resource);
                }
            });

            console.log('📚 Core documents found:', {
                exegesis: coreDocsByContext.exegesis.length,
                homiletics: coreDocsByContext.homiletics.length,
                generic: coreDocsByContext.generic.length
            });

            return coreDocsByContext;
        } catch (error) {
            console.error('❌ Failed to get core documents:', error);
            return {
                exegesis: [],
                homiletics: [],
                generic: []
            };
        }
    }

    private async createAllStores(): Promise<void> {
        const coreDocsByContext = await this.getCoreDocuments();

        // Prepare file metadata for each context
        const exegesisFiles = this.prepareFileMetadata(coreDocsByContext.exegesis || []);
        const homileticsFiles = this.prepareFileMetadata(coreDocsByContext.homiletics || []);
        const genericFiles = this.prepareFileMetadata(coreDocsByContext.generic || []);

        if (exegesisFiles.length === 0 && homileticsFiles.length === 0 && genericFiles.length === 0) {
            console.warn('⚠️ No core documents found. Skipping store creation.');
            console.info('💡 Admin should upload documents and mark them as core in the library.');
            // Don't throw - just return without creating stores
            // This allows the app to continue working normally
            return;
        }

        // Create stores (only if has files)
        const [exegesisStore, homileticsStore, genericStore] = await Promise.all([
            exegesisFiles.length > 0
                ? this.fileSearchService.createFileSearchStore(
                    exegesisFiles.map(f => f.geminiUri),
                    'Dos Filos - Biblioteca de Exégesis'
                )
                : Promise.resolve({ name: '' }),
            homileticsFiles.length > 0
                ? this.fileSearchService.createFileSearchStore(
                    homileticsFiles.map(f => f.geminiUri),
                    'Dos Filos - Biblioteca de Homilética'
                )
                : Promise.resolve({ name: '' }),
            genericFiles.length > 0
                ? this.fileSearchService.createFileSearchStore(
                    genericFiles.map(f => f.geminiUri),
                    'Dos Filos - Biblioteca Genérica'
                )
                : Promise.resolve({ name: '' })
        ]);

        // Update local state
        this.stores = {
            [FileSearchStoreContext.EXEGESIS]: exegesisStore.name || null,
            [FileSearchStoreContext.HOMILETICS]: homileticsStore.name || null,
            [FileSearchStoreContext.GENERIC]: genericStore.name || null
        };

        // Save config
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
     * Prepare file metadata from library resources
     * Uses existing geminiUri from library documents
     */
    private prepareFileMetadata(resources: LibraryResourceEntity[]): FileSearchFileMetadata[] {
        return resources
            .filter(r => r.metadata?.geminiUri) // Only resources synced to Gemini
            .map(r => ({
                geminiUri: r.metadata!.geminiUri,
                name: r.title,
                storagePath: r.storageUrl,
                author: r.author,
                pages: r.pageCount || 0,
                uploadedAt: r.updatedAt
            }));
    }

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

    private areStoresValid(config: CoreLibraryStoresConfig): boolean {
        return !!(
            config.stores.exegesis ||
            config.stores.homiletics ||
            config.stores.generic
        );
    }
}
