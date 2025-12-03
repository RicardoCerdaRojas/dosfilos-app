/**
 * Interface for AI-powered sermon generation service
 * Following Clean Architecture principles - Domain layer interface
 */

export interface GenerateSermonOptions {
    topic?: string;
    bibleReferences?: string[];
    targetAudience?: 'general' | 'youth' | 'children' | 'adults' | 'seniors';
    tone?: 'formal' | 'casual' | 'inspirational' | 'educational';
    length?: 'short' | 'medium' | 'long'; // ~5min, ~15min, ~30min
    language?: string;
    includeIntroduction?: boolean;
    includeConclusion?: boolean;
    includeCallToAction?: boolean;
}

export interface GeneratedSermonContent {
    title: string;
    introduction?: string;
    mainPoints: {
        title: string;
        content: string;
        bibleReferences?: string[];
    }[];
    conclusion?: string;
    callToAction?: string;
    suggestedBibleReferences: string[];
    suggestedTags: string[];
}

export interface IAIService {
    /**
     * Generate a complete sermon based on provided options
     */
    generateSermon(options: GenerateSermonOptions): Promise<GeneratedSermonContent>;

    /**
     * Generate sermon outline only (structure without full content)
     */
    generateSermonOutline(options: GenerateSermonOptions): Promise<{
        title: string;
        mainPoints: string[];
        suggestedReferences: string[];
    }>;

    /**
     * Expand a specific section of a sermon
     */
    expandSection(
        sectionTitle: string,
        context: string,
        bibleReferences?: string[]
    ): Promise<string>;

    /**
     * Suggest bible references for a given topic
     */
    suggestBibleReferences(topic: string, count?: number): Promise<string[]>;

    /**
     * Improve/refine existing sermon content
     */
    refineContent(content: string, instructions?: string): Promise<string>;

    /**
     * Generate sermon title suggestions
     */
    generateTitleSuggestions(topic: string, count?: number): Promise<string[]>;

    /**
     * Validate if a user message is relevant to the context
     */
    validateContext(message: string, context?: string): Promise<{ isValid: boolean; refusalMessage?: string }>;
}
