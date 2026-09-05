import type { PaperRubric } from './PaperRubric';
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
    'textual-commentary': 'technical',
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

export interface RoleExpectations {
    /** How many anchor-role sources the rubric expects (sum of minimums). */
    anchor: number;
    /** How many contrast-role sources the rubric expects. */
    contrast: number;
    /** How many technical-role sources the rubric expects. */
    technical: number;
}

/**
 * Per-role count RANGES the dialectical strategy considers typical
 * for a rigorous exegetical paper. The hero card uses the range as
 * a "X-Y fuentes recomendadas" badge per role, and the coverage card
 * uses `min` as the fallback target when the rubric is silent. Keep
 * these synced with any copy that mentions explicit numbers.
 */
export const STRATEGY_SUGGESTED_RANGES: Readonly<Record<SourceRole, { min: number; max: number }>> = {
    anchor: { min: 4, max: 5 },
    contrast: { min: 4, max: 5 },
    technical: { min: 3, max: 4 },
};

/**
 * Lower-bound counts derived from `STRATEGY_SUGGESTED_RANGES`. Used
 * as the per-role fallback target in the coverage card when the
 * rubric stays silent on a role (no rubric chosen, or it only
 * specifies a total quantity without per-type minimums). Rubric
 * expectations always WIN when present.
 */
export const STRATEGY_SUGGESTED_COUNTS: RoleExpectations = {
    anchor: STRATEGY_SUGGESTED_RANGES.anchor.min,
    contrast: STRATEGY_SUGGESTED_RANGES.contrast.min,
    technical: STRATEGY_SUGGESTED_RANGES.technical.min,
};

/**
 * Effective per-role target to display in the coverage chip. Rule:
 * use the rubric expectation if it speaks (>0); otherwise fall back
 * to the strategy's suggested count. The chip turns green when the
 * actual count meets this effective target.
 */
export function computeEffectiveRoleTargets(
    expectations: RoleExpectations,
): RoleExpectations {
    return {
        anchor: expectations.anchor > 0 ? expectations.anchor : STRATEGY_SUGGESTED_COUNTS.anchor,
        contrast: expectations.contrast > 0 ? expectations.contrast : STRATEGY_SUGGESTED_COUNTS.contrast,
        technical: expectations.technical > 0 ? expectations.technical : STRATEGY_SUGGESTED_COUNTS.technical,
    };
}

/**
 * Maps each rubric source-requirement to its dialectical role and
 * sums the minimums per role. Lets the corpus role-coverage card
 * display "Anclas: 2 / 5" — bridging the rubric (which speaks in
 * sourceTypes) with the strategy (which speaks in roles).
 *
 * Returns all-zero expectations when the rubric has no source
 * requirements (the very-permissive default) so the card falls
 * back to "≥1 of each role" semantics.
 */
export function computeRoleExpectations(
    rubric: Pick<PaperRubric, 'sourceRequirements'> | null,
): RoleExpectations {
    const out: RoleExpectations = { anchor: 0, contrast: 0, technical: 0 };
    if (!rubric?.sourceRequirements) return out;
    for (const req of rubric.sourceRequirements) {
        const role = suggestRoleForType(req.sourceType);
        if (!role) continue;
        out[role] += req.minimum;
    }
    return out;
}

/**
 * The granular `SourceType` (the 13-value academic catalog) that
 * best represents each dialectical role for new-source defaults.
 * When the user clicks "Elegir el ANCLA" in the corpus hero, the
 * add-source dialog opens with this type pre-selected in the
 * academic-type picker — they can change it but the typical case
 * is correct out of the box.
 */
export const TYPICAL_SOURCE_TYPE_BY_ROLE: Readonly<Record<SourceRole, SourceType>> = {
    anchor: 'commentary-expository',
    contrast: 'commentary-critical',
    technical: 'lexicon-technical',
};

/**
 * Library `LibraryResource.type` values that should pre-filter the
 * library picker when the user is choosing a source for each role.
 * Multi-value: anchor surfaces broad-category 'commentary' resources;
 * contrast surfaces 'exegetical-commentary' + theological/bible
 * dictionaries + historical context; technical surfaces grammars +
 * critical-texts.
 *
 * Keys are read on the corpus hero buttons; the dialog uses them to
 * narrow the library list to plausible candidates without HIDING
 * the rest (the user can clear the chip filter to see everything).
 */
export const LIBRARY_TYPES_BY_ROLE: Readonly<Record<SourceRole, ReadonlyArray<string>>> = {
    anchor: ['commentary'],
    contrast: ['exegetical-commentary', 'theological-dictionary', 'bible-dictionary', 'historical-context'],
    technical: ['grammar', 'critical-text'],
};
