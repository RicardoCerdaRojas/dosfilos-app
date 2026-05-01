import type { PaperRubric } from './PaperRubric';

/**
 * A reusable rubric template owned by a single user, transversal
 * across exegetical papers.
 *
 * Mental model parallel to `UserStyleGuide` — but with a CRITICAL
 * lifecycle difference:
 *
 *   - **UserStyleGuide** is referenced LIVE by papers
 *     (`paper.styleGuideId`). Edit the guide → all papers using
 *     it pick up the new mechanics. Correct because style is pure
 *     formatting; if your seminary publishes a new TMS edition,
 *     every in-flight paper should re-format the new way.
 *
 *   - **UserRubric** is COPIED to papers as a snapshot
 *     (`paper.rubric` stays embedded). Edit the rubric here →
 *     historical papers KEEP the version they were created with.
 *     Correct because rubrics are grading criteria; once you
 *     submitted Paper A under Rubric V1, that submission was
 *     evaluated against V1 and shouldn't retroactively become
 *     "non-compliant" when you tweak the rubric for Paper B.
 *
 * The link from `paper` to `userRubric` is therefore non-essential
 * — papers are self-contained after creation. We DON'T add a
 * `paper.rubricId` foreign key in v1. The "applied from" history
 * lives only in the UI ("Esta rúbrica se inició desde TMS NT800").
 *
 * Storage: top-level collection `userRubrics/{rubricId}` with
 * `ownerId` field, mirroring `userStyleGuides`. Owner-only RLS via
 * Firestore rules.
 */
export interface UserRubric {
    id: string;
    ownerId: string;

    /** Human label — "TMS NT800 — Hebreos paper", "Generic OT exegetical". */
    displayName: string;

    /**
     * Whether this template auto-applies when the student creates
     * a new paper without picking a different one. Exactly one
     * `UserRubric` per user is `isDefault: true` at any time
     * (enforced by the repo's `setDefault` transaction).
     */
    isDefault: boolean;

    /**
     * The full rubric content — same shape as `PaperRubric` so
     * applying a template to a paper is a literal copy. The
     * `provenance` field stays meaningful: a template can itself
     * be `'extracted-from-document'` (the user pasted the
     * seminary rubric into the editor when creating it),
     * `'system-default'` (forked from the TMS default), or
     * `'user-edited'` (hand-built or modified).
     */
    rubric: PaperRubric;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Draft shape for `createRubric` — id and timestamps assigned by
 * the repo.
 */
export type UserRubricDraft = Omit<UserRubric, 'id' | 'createdAt' | 'updatedAt'>;
