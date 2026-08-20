import { CoreLibraryService } from '@dosfilos/application';

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
        // Sin dependencia de File Search: el camino vivo de este servicio
        // (`initializeFromConfig`) solo lee configuración de Firestore. El
        // `throw` que había acá era el interruptor más peligroso del track —
        // corre en cada login desde `firebase-context`, dentro de un try/catch
        // que solo loguea. Borrar la clave habría dejado Core Library apagada
        // en silencio, y con ella el contexto de biblioteca del generador.
        coreLibraryServiceInstance = new CoreLibraryService();
    }

    return coreLibraryServiceInstance;
}

/**
 * Reset singleton (for testing purposes)
 */
export function resetCoreLibraryService(): void {
    coreLibraryServiceInstance = null;
}
