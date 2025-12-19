import { CoreLibraryService } from '@dosfilos/application';
import { GeminiFileSearchService, FirebaseStorageService } from '@dosfilos/infrastructure';

/**
 * Singleton instance of CoreLibraryService
 * Initialized lazily when needed
 */
let coreLibraryServiceInstance: CoreLibraryService | null = null;

/**
 * Get or create CoreLibraryService singleton
 * 
 * Dependencies are injected here (Dependency Injection at composition root)
 */
export function getCoreLibraryService(): CoreLibraryService {
    if (!coreLibraryServiceInstance) {
        // Get API key from environment
        const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('VITE_GEMINI_API_KEY not found, Core Library will not work');
            throw new Error('VITE_GEMINI_API_KEY not configured');
        }

        // Create dependencies
        const fileSearchService = new GeminiFileSearchService(apiKey);
        const storageService = new FirebaseStorageService();

        // Create service with injected dependencies
        coreLibraryServiceInstance = new CoreLibraryService(
            fileSearchService as any, // Temporary type workaround
            storageService as any
        );
    }

    return coreLibraryServiceInstance;
}

/**
 * Reset singleton (for testing purposes)
 */
export function resetCoreLibraryService(): void {
    coreLibraryServiceInstance = null;
}
