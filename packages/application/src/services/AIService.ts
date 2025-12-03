import { IAIService } from '@dosfilos/domain';
import { GeminiAIService } from '@dosfilos/infrastructure';

/**
 * Application layer service for AI operations
 * Wraps infrastructure implementation with business logic
 */
export class AIService {
    private aiService: IAIService;

    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            console.warn('Gemini API key not configured. AI features will be disabled.');
        }

        this.aiService = new GeminiAIService(apiKey || '');
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
    isAvailable(): boolean {
        return !!import.meta.env.VITE_GEMINI_API_KEY;
    }
}

// Export singleton instance
export const aiService = new AIService();
