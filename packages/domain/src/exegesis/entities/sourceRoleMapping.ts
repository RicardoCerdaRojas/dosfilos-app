import type { ProjectSource } from './ProjectSource';
import type { SourceType } from './SourceType';
import type { SourceRole } from './StepSourcePlan';

/**
 * Default role suggestion for each `SourceType`. Drives the corpus
 * tab's role-coverage card: when the student adds a commentary-
 * expository, we increment the "anchor" bucket; a critical commentary
 * goes to "contrast"; a lexicon to "technical".
 *
 * The mapping reflects the default DIDACTIC role each type plays in
 * a classical exegetical paper — not a hard rule. The student can
 * always pin a critical commentary AS an anchor on a verse where
 * that's the right call (the planner's per-step role assignment
 * makes the final decision). This map only seeds the corpus-side
 * coverage indicator.
 *
 * Types that don't fit any role (style templates, generic "other")
 * map to `null` — they don't show up in the dialectical coverage at
 * all (style-template-paper is never cited; "other" is too vague to
 * suggest a role).
 */
export const SUGGESTED_ROLE_BY_SOURCE_TYPE: Readonly<Record<SourceType, SourceRole | null>> = {
    // Anchor — primary reading.
    'commentary-expository': 'anchor',

    // Contrast — voices that add a different angle to the anchor.
    'commentary-critical': 'contrast',
    'theological-dictionary': 'contrast',
    'historical-background': 'contrast',
    'theological-monograph': 'contrast',
    'journal-article': 'contrast',

    // Technical — backs a specific lexical / syntactic / textual decision.
    'lexicon-technical': 'technical',
    'grammar-syntax': 'technical',
    'critical-apparatus': 'technical',
    'primary-source-ancient': 'technical',
    'biblical-text-edition': 'technical',

    // No dialectical role.
    'style-template-paper': null,
    'other': null,
};

/**
 * Lookup helper for the role suggestion. Returns `null` for types
 * with no didactic role mapping.
 */
export function suggestRoleForType(type: SourceType): SourceRole | null {
    return SUGGESTED_ROLE_BY_SOURCE_TYPE[type] ?? null;
}

export interface RoleCoverage {
    /** How many anchor-suggesting sources are in the corpus. */
    anchor: number;
    /** How many contrast-suggesting sources are in the corpus. */
    contrast: number;
    /** How many technical-suggesting sources are in the corpus. */
    technical: number;
    /** Sources whose type doesn't suggest any role (style templates etc.). */
    unrolled: number;
    /** Total sources counted (sum of the four buckets above). */
    total: number;
}

/**
 * Aggregates the coverage by suggested role across a paper's corpus.
 * Pure — no side effects; safe to call inside `useMemo`.
 *
 * Used by the corpus tab in dialectical mode to surface "Anclas: 2 /
 * Contrastes: 1 / Técnicas: 0 — te falta una técnica" guidance, and
 * by the planner / nudges to prioritize what's missing.
 */
export function computeRoleCoverage(
    sources: ReadonlyArray<Pick<ProjectSource, 'sourceType'>>,
): RoleCoverage {
    let anchor = 0;
    let contrast = 0;
    let technical = 0;
    let unrolled = 0;
    for (const s of sources) {
        const role = suggestRoleForType(s.sourceType);
        if (role === 'anchor') anchor++;
        else if (role === 'contrast') contrast++;
        else if (role === 'technical') technical++;
        else unrolled++;
    }
    return {
        anchor,
        contrast,
        technical,
        unrolled,
        total: anchor + contrast + technical + unrolled,
    };
}

/**
 * Returns a list of roles where the corpus has zero coverage. Useful
 * for the "te falta X" nudges. Never reports `null`/unrolled — those
 * aren't part of the dialectical strategy.
 */
export function findMissingRoles(coverage: RoleCoverage): SourceRole[] {
    const missing: SourceRole[] = [];
    if (coverage.anchor === 0) missing.push('anchor');
    if (coverage.contrast === 0) missing.push('contrast');
    if (coverage.technical === 0) missing.push('technical');
    return missing;
}
