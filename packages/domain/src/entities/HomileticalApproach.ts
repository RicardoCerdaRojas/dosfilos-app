/**
 * Homiletical Approach Entity
 * 
 * Represents a specific direction or strategy for preaching a sermon.
 * Each approach defines a unique lens through which to present the biblical text.
 * 
 * @domain Sermon Generation
 * @layer Domain - Pure entity with no external dependencies
 */

import { SermonOutline } from './SermonGenerator';

/**
 * Types of homiletical approaches available for sermon preparation
 */
export type ApproachType =
    | 'pastoral'      // Focus on pastoral care, comfort, and encouragement
    | 'teológico'     // Deep theological/doctrinal exploration
    | 'apologético'   // Defense of faith, addressing objections
    | 'evangelístico' // Gospel presentation for non-believers
    | 'expositivo'    // Verse-by-verse exposition
    | 'narrativo';    // Story-driven, narrative preaching

/**
 * Tone options for sermon delivery
 */
export type SermonTone =
    | 'exhortativo'     // Encouraging, uplifting
    | 'de ánimo'        // Comforting, hope-giving, faith-strengthening
    | 'didáctico'       // Teaching, instructional
    | 'frontal'         // Direct, confrontational
    | 'académico'       // Scholarly, analytical
    | 'conversacional'  // Casual, relatable
    | 'persuasivo';     // Convincing, compelling

/**
 * Preview of a homiletical approach (Phase 1)
 * 
 * Lightweight interface containing only the essential information
 * needed for the preacher to choose a direction. This follows the
 * Interface Segregation Principle (ISP) by not including the
 * detailed proposition and outline until the approach is selected.
 * 
 * @pattern Two-Phase Generation
 * @solid ISP - Interface Segregation Principle
 */
export interface HomileticalApproachPreview {
    /**
     * Unique identifier for this approach
     * Format: `${type}-${uniqueId}` (e.g., "pastoral-1", "teologico-2")
     */
    id: string;

    /**
     * Category of the homiletical approach
     */
    type: ApproachType;

    /**
     * Specific direction or focus of this approach
     * @example "Consolar y fortalecer a creyentes en aflicción"
     * @example "Profundizar en la doctrina de la kenosis de Cristo"
     */
    direction: string;

    /**
     * Recommended tone for sermon delivery
     */
    tone: SermonTone;

    /**
     * Primary purpose or goal of the sermon with this approach
     * @example "Animar a la iglesia a perseverar con esperanza en tiempos difíciles"
     */
    purpose: string;

    /**
     * Brief description of suggested structure/flow
     * Not the full outline, just a high-level description
     * @example "Introducción empática → Promesas de Dios → Testimonios → Aplicación práctica"
     */
    suggestedStructure: string;

    /**
     * Target audience for whom this approach is most appropriate
     * @example "Creyentes atravesando crisis o tribulación"
     * @example "Líderes y maestros de la iglesia"
     */
    targetAudience: string;

    /**
     * AI's rationale for recommending this approach
     * Explains why this approach fits well with the passage
     * @example "El contexto de sufrimiento en Filipenses hace este enfoque muy relevante"
     */
    rationale: string;
}

/**
 * Complete definition of a homiletical approach (Phase 2)
 * 
 * This entity represents one possible way to preach a sermon based on
 * the exegetical study. Multiple approaches can be generated for the
 * same passage, allowing the preacher to choose the most appropriate
 * direction for their context.
 */
export interface HomileticalApproach {
    /**
     * Unique identifier for this approach
     * Format: `${type}-${uniqueId}` (e.g., "pastoral-1", "teologico-2")
     */
    id: string;

    /**
     * Category of the homiletical approach
     */
    type: ApproachType;

    /**
     * Specific direction or focus of this approach
     * @example "Consolar y fortalecer a creyentes en aflicción"
     * @example "Profundizar en la doctrina de la kenosis de Cristo"
     */
    direction: string;

    /**
     * Recommended tone for sermon delivery
     */
    tone: SermonTone;

    /**
     * Primary purpose or goal of the sermon with this approach
     * @example "Animar a la iglesia a perseverar con esperanza en tiempos difíciles"
     */
    purpose: string;

    /**
     * Suggested structure/flow for the sermon
     * @example "Introducción empática → Promesas de Dios → Testimonios → Aplicación práctica"
     */
    suggestedStructure: string;

    /**
     * Target audience for whom this approach is most appropriate
     * @example "Creyentes atravesando crisis o tribulación"
     * @example "Líderes y maestros de la iglesia"
     */
    targetAudience: string;

    /**
     * AI's rationale for recommending this approach
     * Explains why this approach fits well with the passage
     * @example "El contexto de sufrimiento en Filipenses hace este enfoque muy relevante"
     */
    rationale: string;

    /**
     * Homiletical proposition specific to this approach
     * Adapts the core message to fit the chosen direction
     */
    homileticalProposition: string;

    /**
     * Preview of outline points for congregation
     * Shows main point titles with scripture references
     * Displayed alongside proposition to give sermon roadmap
     * @example ["I. Debes asimilar la gloria divina (v. 6)", "II. Debes asimilar la humillación (vv. 7-8)"]
     */
    outlinePreview?: string[];

    /**
     * Contemporary applications aligned with this approach
     * Typically 3-5 concrete, actionable applications
     */
    contemporaryApplication: string[];

    /**
     * Sermon outline structured according to this approach
     * Main points with descriptions and scripture references
     */
    outline: SermonOutline;
}

/**
 * Value Object for Approach ID
 * Ensures IDs follow the correct format
 */
export class ApproachId {
    private constructor(private readonly value: string) { }

    /**
     * Creates a new ApproachId with validation
     * @throws Error if id is empty or invalid format
     */
    static create(type: ApproachType, index: number): ApproachId {
        if (!type) {
            throw new Error('Approach type is required');
        }
        if (index < 0) {
            throw new Error('Index must be non-negative');
        }

        const id = `${type}-${index + 1}`;
        return new ApproachId(id);
    }

    /**
     * Parse existing ID string
     */
    static fromString(id: string): ApproachId {
        if (!id || !id.includes('-')) {
            throw new Error('Invalid approach ID format. Expected: type-number');
        }
        return new ApproachId(id);
    }

    toString(): string {
        return this.value;
    }

    equals(other: ApproachId): boolean {
        return this.value === other.value;
    }
}

/**
 * Factory for creating HomileticalApproach instances
 * Handles validation and transformation from external data
 */
export class ApproachFactory {
    /**
     * Creates a HomileticalApproach from AI-generated data
     * Validates all required fields and provides defaults where appropriate
     */
    static createFromAIResponse(data: any, index: number): HomileticalApproach {
        // Validate required fields
        if (!data.type) {
            throw new Error('Approach type is required');
        }
        if (!data.direction) {
            throw new Error('Approach direction is required');
        }

        // Generate validated ID
        const id = ApproachId.create(data.type as ApproachType, index);

        return {
            id: id.toString(),
            type: data.type as ApproachType,
            direction: data.direction,
            tone: data.tone || 'conversacional',
            purpose: data.purpose || '',
            suggestedStructure: data.suggestedStructure || '',
            targetAudience: data.targetAudience || 'Congregación general',
            rationale: data.rationale || '',
            homileticalProposition: data.homileticalProposition || '',
            contemporaryApplication: Array.isArray(data.contemporaryApplication)
                ? data.contemporaryApplication
                : [],
            outline: data.outline || { mainPoints: [] }
        };
    }

    /**
     * Validates that an approach is complete and usable
     */
    static validate(approach: HomileticalApproach): boolean {
        return !!(
            approach.id &&
            approach.type &&
            approach.direction &&
            approach.tone &&
            approach.homileticalProposition &&
            approach.outline
        );
    }
}
