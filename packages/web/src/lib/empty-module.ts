// Empty module to replace @google/generative-ai/server in browser builds
// This module should not be used in the browser - it's just a placeholder

export class GoogleAICacheManager {
    constructor() {
        throw new Error('GoogleAICacheManager is not available in browser environment');
    }
}

export class GoogleAIFileManager {
    constructor() {
        throw new Error('GoogleAIFileManager is not available in browser environment');
    }
}

export const readFileSync = () => {
    throw new Error('readFileSync is not available in browser environment');
};

export default {};
