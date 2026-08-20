import { IAIService } from '@dosfilos/domain';
import { GeminiAIService } from '@dosfilos/infrastructure';

/**
 * Application layer service for AI operations
 * Wraps infrastructure implementation with business logic
 */
export class AIService {
    private aiService: IAIService;

    constructor() {
        this.aiService = new GeminiAIService();
    }

    /**
     * Get the underlying AI service instance
     */
    getService(): IAIService {
        return this.aiService;
    }

    /**
     * Check if AI service is available
     */
    /**
     * Antes devolvía la mera presencia de la clave de Gemini en el bundle. Esa
     * clave ya no vive en el navegador: la generación sale por callables
     * autenticados, así que la disponibilidad no depende de nada que el cliente
     * pueda mirar.
     *
     * Se conserva el método en vez de borrarlo porque sus llamadores lo usan
     * como guarda de UI — `generate-sermon.tsx` esconde la página entera con
     * él. Devolver `true` es la traducción honesta de "el servidor siempre
     * puede"; una comprobación real de salud del callable sería otra feature,
     * no parte de esta migración.
     */
    isAvailable(): boolean {
        return true;
    }
}

// Export singleton instance
export const aiService = new AIService();
