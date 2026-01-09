export const GEMINI_CONFIG = {
    // Using gemini-pro as the stable model for v1 API.
    // Note: gemini-1.5-flash requires v1beta API version.
    MODEL_NAME: 'gemini-2.5-flash',

    // Configuration for generation
    GENERATION_CONFIG: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        responseMimeType: 'application/json',
    }
};
