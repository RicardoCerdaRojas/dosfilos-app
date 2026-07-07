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
    | 'temático'      // A theme developed by letting Scripture define, correct and order it
    | 'pastoral'      // Focus on pastoral care, comfort, and encouragement
    | 'teológico'     // Deep theological/doctrinal exploration
    | 'apologético'   // Defense of faith, addressing objections
    | 'evangelístico' // Gospel presentation for non-believers
    | 'narrativo';    // Story-driven, narrative preaching
//
// NOTE (2026-07-06): `expositivo` is intentionally NOT a form here. Expositivity
// is the fidelity CONDITION every form must meet (the text governs the content),
// modeled as global disqualifier G3 in the judge catalog — not a parallel form.
// `topical` is likewise not a form: it is thematic-done-unfaithfully (a failure
// mode). See normalizeHomileticalApproach for legacy value migration, and byblos
// decision "Corrección de categoría: expositividad es G3".

/**
 * Canonical set of homiletical FORMS (the six-form catalog). Must stay in sync
 * with the judge's compliance-criteria catalog (invariant enforced by a test).
 */
export const APPROACH_TYPES: readonly ApproachType[] = [
    'temático',
    'pastoral',
    'teológico',
    'apologético',
    'evangelístico',
    'narrativo',
] as const;

/**
 * Runtime membership guard for `ApproachType`. Use at every WRITE border where a
 * value of unknown origin (AI output, imported data) becomes a stored approach —
 * a truthy check is not enough (presence ≠ validity). Fail-closed: reject anything
 * that is not a member of the six-form catalog.
 */
export function isApproachType(value: unknown): value is ApproachType {
    return typeof value === 'string' && (APPROACH_TYPES as readonly string[]).includes(value);
}

/**
 * How the current form was derived from a stored value. Preserves origin so a
 * legacy value is never laundered into a clean-looking current form.
 *  - `native`         — stored already as a current-catalog form.
 *  - `renamed`        — clean English→Spanish rename (thematic/narrative).
 *  - `legacy_topical` — was `topical`: reads as `temático` (same form, wrong
 *                       name), but whether the original study was faithful-
 *                       expositive or theme-imposing is UNKNOWN. Its
 *                       expositivity (global G3) is `sin_auditar` — never treat
 *                       it as audited-faithful. Surface for preacher confirmation.
 *  - `none`           — no form could be inferred.
 */
export type ApproachProvenance = 'native' | 'renamed' | 'legacy_topical' | 'none';

/** Result of normalizing a possibly-legacy homiletical-approach value. */
export interface NormalizedApproach {
    /** The current-catalog form, or undefined when no valid form can be inferred. */
    approach?: ApproachType;
    /**
     * Origin of the value. `legacy_topical` carries `sin_auditar` semantics for
     * expositivity — do NOT collapse it to a clean `temático` (would lose
     * traceability and imply the study was audited-faithful when it was not).
     */
    provenance: ApproachProvenance;
    /**
     * True when the mapping should be CONFIRMED by the preacher rather than
     * accepted silently (currently: legacy `topical` → `temático`). Derived from
     * provenance; never force the preacher's structural choice silently.
     */
    needsConfirmation: boolean;
}

/**
 * Legacy value → current form. Corrects the accidental 4→6 enum transition:
 *  - `thematic`/`narrative` were English renames → `temático`/`narrativo`.
 *  - `expository`/`expositivo` were never a form (expositivity is condition G3) → unset.
 *  - `topical` was thematic mis-named → `temático`, but flagged for confirmation.
 */
const LEGACY_APPROACH_MAP: Record<string, ApproachType | undefined> = {
    thematic: 'temático',
    narrative: 'narrativo',
    expository: undefined,
    expositivo: undefined,
    topical: 'temático',
};

/**
 * Normalizes a stored homiletical-approach value to the current `ApproachType`
 * catalog. Native current forms pass through. Legacy values migrate per
 * LEGACY_APPROACH_MAP. Legacy `topical` sets `needsConfirmation` so the mapping
 * to `temático` is surfaced to the preacher, never forced silently. Unknown or
 * empty → no form.
 */
export function normalizeHomileticalApproach(
    value: string | undefined | null,
): NormalizedApproach {
    if (!value) {
        return { provenance: 'none', needsConfirmation: false };
    }
    if ((APPROACH_TYPES as readonly string[]).includes(value)) {
        return { approach: value as ApproachType, provenance: 'native', needsConfirmation: false };
    }
    if (value === 'topical') {
        // Same form as temático, wrong name — but expositivity is `sin_auditar`.
        return { approach: 'temático', provenance: 'legacy_topical', needsConfirmation: true };
    }
    if (value in LEGACY_APPROACH_MAP) {
        const mapped = LEGACY_APPROACH_MAP[value];
        // `expository`/`expositivo` map to undefined (condition, not a form) → none.
        return {
            approach: mapped,
            provenance: mapped ? 'renamed' : 'none',
            needsConfirmation: false,
        };
    }
    return { provenance: 'none', needsConfirmation: false };
}

/**
 * Tone options for sermon delivery
 */
export type HomileticalTone =
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
    tone: HomileticalTone;

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
    tone: HomileticalTone;

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
        // Fail-closed on the WRITE border: reject a `type` that is not a real
        // form. AI output is untrusted — a truthy string is not enough (presence
        // ≠ validity). This is how corrupt values (a tone label, a leaked prompt
        // block) got persisted before. Callers filter/skip a rejected preview.
        if (!isApproachType(data.type)) {
            throw new Error(`Invalid approach type: ${JSON.stringify(data.type).slice(0, 80)}`);
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
            // Membership, not truthy: a corrupt `type` string must fail here so
            // the caller's filter drops the preview before it can be persisted.
            isApproachType(approach.type) &&
            approach.direction &&
            approach.tone &&
            approach.homileticalProposition &&
            approach.outline
        );
    }
}
