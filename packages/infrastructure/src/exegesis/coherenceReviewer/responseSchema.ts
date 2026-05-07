import { SchemaType } from '@google/generative-ai';

/**
 * JSON schema for the coherence reviewer's structured output. Locks
 * issue category + severity to enums so Gemini can't return labels
 * outside the catalog. Empty `issues` array is valid → "internally
 * consistent".
 */
export const COHERENCE_REVIEW_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        summary: {
            type: SchemaType.STRING,
            description: 'One-sentence overall verdict in the requested language.',
        },
        issues: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    category: {
                        type: SchemaType.STRING,
                        enum: [
                            'thesis-mismatch',
                            'verse-conflict',
                            'translation-inconsistency',
                            'unfulfilled-promise',
                            'conclusion-overreach',
                            'tone-drift',
                            'other',
                        ],
                    },
                    severity: {
                        type: SchemaType.STRING,
                        enum: ['high', 'medium', 'low'],
                    },
                    message: {
                        type: SchemaType.STRING,
                        description: 'Concrete description of the inconsistency in the requested language. Cite the relevant section labels (e.g. "Versículo 3" / "Conclusión") so the user can locate the issue.',
                    },
                    relatedStepIds: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: 'IDs of the steps the issue spans. Empty when paper-wide.',
                    },
                },
                required: ['category', 'severity', 'message', 'relatedStepIds'],
            },
        },
    },
    required: ['summary', 'issues'],
} as const;
