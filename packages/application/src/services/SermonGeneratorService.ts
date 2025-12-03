import { ISermonGenerator, ExegeticalStudy, HomileticalAnalysis, GenerationRules, SermonContent } from '@dosfilos/domain';
import { GeminiSermonGenerator } from '@dosfilos/infrastructure';

import { PhaseConfiguration } from '@dosfilos/domain';
import { FirebaseStorageService } from '@dosfilos/infrastructure';

export class SermonGeneratorService {
    private generator: ISermonGenerator;
    private storageService: FirebaseStorageService;

    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('Gemini API key not configured. Generator features will be disabled.');
        }
        this.generator = new GeminiSermonGenerator(apiKey || '');
        this.storageService = new FirebaseStorageService();
    }

    private async hydrateConfig(config: PhaseConfiguration): Promise<PhaseConfiguration> {
        const hydratedDocs = await Promise.all(config.documents.map(async (doc) => {
            if (doc.storagePath) {
                try {
                    const content = await this.storageService.downloadFile(doc.storagePath);
                    // Convert Blob to text
                    const text = await content.text();
                    return { ...doc, content: text };
                } catch (error) {
                    console.error(`Failed to download document ${doc.name}:`, error);
                    return doc; // Return original doc if download fails
                }
            }
            return doc;
        }));

        return {
            ...config,
            documents: hydratedDocs
        };
    }

    async generateExegesis(passage: string, rules: GenerationRules, config?: PhaseConfiguration): Promise<ExegeticalStudy> {
        const hydratedConfig = config ? await this.hydrateConfig(config) : undefined;
        return this.generator.generateExegesis(passage, rules, hydratedConfig);
    }

    async generateHomiletics(exegesis: ExegeticalStudy, rules: GenerationRules, config?: PhaseConfiguration): Promise<HomileticalAnalysis> {
        const hydratedConfig = config ? await this.hydrateConfig(config) : undefined;
        return this.generator.generateHomiletics(exegesis, rules, hydratedConfig);
    }

    async generateSermonDraft(analysis: HomileticalAnalysis, rules: GenerationRules, config?: PhaseConfiguration): Promise<SermonContent> {
        const hydratedConfig = config ? await this.hydrateConfig(config) : undefined;
        return this.generator.generateSermonDraft(analysis, rules, hydratedConfig);
    }

    isAvailable(): boolean {
        return !!import.meta.env.VITE_GEMINI_API_KEY;
    }
}

export const sermonGeneratorService = new SermonGeneratorService();
