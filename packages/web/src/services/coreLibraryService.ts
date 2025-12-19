import { CoreLibraryService } from '@dosfilos/application';
import { GeminiFileSearchService } from '@dosfilos/infrastructure';

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

        // Create dependencies (only IFileSearchService now - no storage needed)
        const fileSearchService = new GeminiFileSearchService(apiKey);

        // Create service with injected dependencies
        coreLibraryServiceInstance = new CoreLibraryService(
            fileSearchService as any // Temporary type workaround
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
