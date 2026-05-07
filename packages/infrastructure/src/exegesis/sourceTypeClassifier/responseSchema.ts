import { SchemaType } from '@google/generative-ai';

/**
 * JSON schema for the source-type classifier response. Mirrors
 * `ClassifySourceTypeOutput` but with the discriminated `sourceType`
 * enum locked to the canonical catalog (13 values + `'other'`).
 *
 * Locked enum values mean Gemini cannot return strings outside the
 * catalog — even if the prompt accidentally suggests one. The use
 * case still defends with `SOURCE_TYPE_CATALOG[result.sourceType]`
 * lookup before returning.
 */
export const SOURCE_TYPE_CLASSIFIER_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        sourceType: {
            type: SchemaType.STRING,
            enum: [
                'biblical-text-edition',
                'critical-apparatus',
                'lexicon-technical',
                'theological-dictionary',
                'grammar-syntax',
                'commentary-critical',
                'commentary-expository',
                'historical-background',
                'theological-monograph',
                'journal-article',
                'primary-source-ancient',
                'style-template-paper',
                'other',
            ],
            description: 'Best-fit type from the academic catalog.',
        },
        confidence: {
            type: SchemaType.STRING,
            enum: ['high', 'medium', 'low'],
            description: 'How sure the classifier is about its choice.',
        },
        reasoning: {
            type: SchemaType.STRING,
            description: 'One concise sentence in the requested language explaining WHY this type was chosen.',
        },
    },
    required: ['sourceType', 'confidence', 'reasoning'],
} as const;
