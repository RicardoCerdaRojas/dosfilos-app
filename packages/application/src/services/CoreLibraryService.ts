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

    /**
     * `fileSearchService` es OPCIONAL a propósito.
     *
     * Los dos únicos métodos que lo usan — `recreateStores` y `createAllStores`
     * — no los llama nadie: la creación de stores se hace del lado del servidor
     * desde el panel de admin. El camino que sí corre en cada login es
     * `initializeFromConfig()`, que solo lee configuración de Firestore.
     *
     * Exigirlo obligaba al composition root del navegador a construir la
     * implementación de Gemini con la clave en el bundle, solo para satisfacer
     * una firma cuyo destino es inalcanzable. Se deja el parámetro (los métodos
     * siguen ahí y podrían revivir) pero ya no fuerza la clave. La única
     * implementación que había (`GeminiFileSearchService`) se borró al sacar el
     * SDK del navegador; si esto revive, la implementación va del lado del
     * servidor y entra por acá como adapter de callable.
     */
    constructor(
        private fileSearchService: IFileSearchService | null = null
    ) { }

    /** Falla con un mensaje que dice DÓNDE está ahora, no solo que falta. */
    private requireFileSearch(): IFileSearchService {
        if (!this.fileSearchService) {
            throw new Error(
                'CoreLibraryService: no hay IFileSearchService inyectado. La creación de ' +
                'stores se hace del lado del servidor desde /dashboard/admin/core-library.',
            );
        }
        return this.fileSearchService;
    }

    async ensureStoresReady(): Promise<void> {
        try {


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

            await this.createAllStores();

            this.initialized = true;
        } catch (error: any) {
            // ... error handling ...
        }
    }

    /**
     * 🎯 Initialize service from existing config ONLY.
     * Safe for client-side use (does not attempt to create stores).
     */
    async initializeFromConfig(): Promise<void> {
        const config = await this.loadConfig();
        if (config && this.areStoresValid(config)) {
            this.stores = config.stores;
            this.initialized = true;
        } else {
            console.log('ℹ️ CoreLibraryService: No valid config found');
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

    /**
     * Get current config (without trying to create stores)
     * Used for loading existing config without triggering creation
     */
    async getConfig(): Promise<CoreLibraryStoresConfig | null> {
        return await this.loadConfig();
    }

    async recreateStores(): Promise<void> {


        // Delete old stores
        const config = await this.loadConfig();
        if (config) {
            for (const context of Object.values(FileSearchStoreContext)) {
                const storeId = config.stores[context];
                if (storeId) {
                    try {
                        await this.requireFileSearch().deleteFileSearchStore(storeId);
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

            // Get core library resources for admin.
            // Post-RAG refactor: the source of truth is `coreStores: string[]` (array of store keys)
            // on each doc. The legacy `isCore`/`coreContext` fields are no longer written.
            const libraryRef = collection(db, 'library_resources');
            const coreQuery = query(
                libraryRef,
                where('userId', '==', adminUserId),
            );

            const snapshot = await getDocs(coreQuery);
            const coreDocsByContext: Record<string, LibraryResourceEntity[]> = {
                exegesis: [],
                homiletics: [],
                generic: []
            };

            snapshot.forEach(doc => {
                const data = doc.data();
                const coreStores: string[] | undefined = Array.isArray(data.coreStores) ? data.coreStores : undefined;
                if (!coreStores || coreStores.length === 0) return;

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
                    coreStores as ('exegesis' | 'homiletics' | 'generic')[]
                );

                // Bucket the resource into each built-in store it belongs to.
                for (const store of coreStores) {
                    if (coreDocsByContext[store]) {
                        coreDocsByContext[store].push(resource);
                    }
                }
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
                ? this.requireFileSearch().createFileSearchStore(
                    exegesisFiles.map(f => f.geminiUri),
                    'Dos Filos - Biblioteca de Exégesis'
                )
                : Promise.resolve({ name: '' }),
            homileticsFiles.length > 0
                ? this.requireFileSearch().createFileSearchStore(
                    homileticsFiles.map(f => f.geminiUri),
                    'Dos Filos - Biblioteca de Homilética'
                )
                : Promise.resolve({ name: '' }),
            genericFiles.length > 0
                ? this.requireFileSearch().createFileSearchStore(
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
            .filter(r => r.metadata?.annotatedGeminiUri || r.metadata?.geminiUri)
            .map(r => ({
                // Prefer annotated text URI (Strategy 1) over raw PDF URI
                geminiUri: r.metadata!.annotatedGeminiUri ?? r.metadata!.geminiUri,
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
