export interface KeyWord {
    original: string;
    transliteration: string;
    morphology: string;
    syntacticFunction: string;
    significance: string;
}

export interface ExegeticalStudy {
    passage: string;
    context: {
        historical: string;
        literary: string;
        audience: string;
    };
    keyWords: KeyWord[];
    exegeticalProposition: string;
    pastoralInsights: string[];
}

export interface HomileticalAnalysis {
    exegeticalStudy: ExegeticalStudy;
    homileticalApproach: 'expository' | 'thematic' | 'narrative' | 'topical';
    contemporaryApplication: string[];
    homileticalProposition: string;
    outline: {
        mainPoints: {
            title: string;
            description: string;
            scriptureReferences: string[];
        }[];
    };
}

export interface GenerationRules {
    theologicalBias?: string; // e.g., "Reformed", "Charismatic"
    preferredBibleVersion?: string; // e.g., "RV1960", "NVI"
    tone?: 'inspirational' | 'educational' | 'casual' | 'formal' | 'evangelistic';
    targetAudience?: 'general' | 'youth' | 'children' | 'adults' | 'seniors';
    customInstructions?: string; // User-defined prompt additions
}

export interface SermonContent {
    title: string;
    introduction: string;
    body: {
        point: string;
        content: string;
        illustration?: string;
    }[];
    conclusion: string;
    callToAction?: string;
}
