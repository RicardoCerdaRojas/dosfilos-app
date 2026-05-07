/**
 * Canonical plan ID constants.
 *
 * The persisted plan IDs are LEGACY (`basic`, `pro`, `team`) — Hito 4
 * of the pricing roadmap deliberately kept the IDs to avoid migrating
 * `users/{uid}.subscription.planId` for every existing subscriber and
 * to keep Stripe price-id mappings stable. Display names changed
 * (Free / Personal / Pro / Equipo) but the IDs did not.
 *
 * Use these constants instead of inlining string literals so renaming
 * stays a single edit AND the mapping ID → display is documented in
 * one place.
 *
 * Mapping:
 *   - `PLAN_FREE`     → "Free"     (free tier)
 *   - `PLAN_PERSONAL` → "Personal" (legacy id `basic`)
 *   - `PLAN_PRO`      → "Pro"
 *   - `PLAN_EQUIPO`   → "Equipo"   (legacy id `team`)
 *
 * Avoid using the literal `'personal'` or `'equipo'` as plan ids —
 * those are display labels, not document keys. The canonical
 * Firestore key is the legacy id.
 */
export const PLAN_FREE = 'free' as const;
export const PLAN_PERSONAL = 'basic' as const;
export const PLAN_PRO = 'pro' as const;
export const PLAN_EQUIPO = 'team' as const;

export const ALL_PLAN_IDS = [PLAN_FREE, PLAN_PERSONAL, PLAN_PRO, PLAN_EQUIPO] as const;

export type PlanId = typeof ALL_PLAN_IDS[number];

/**
 * Human-readable display label for a plan id. Falls back to a
 * Title-Cased version of the id when the value isn't recognized so
 * a misconfigured plan doc still renders something readable.
 */
export const PLAN_DISPLAY_NAMES: Readonly<Record<PlanId, string>> = {
    [PLAN_FREE]: 'Free',
    [PLAN_PERSONAL]: 'Personal',
    [PLAN_PRO]: 'Pro',
    [PLAN_EQUIPO]: 'Equipo',
};

export function getPlanDisplayName(planId: string | null | undefined): string {
    if (!planId) return 'Free';
    if (isKnownPlanId(planId)) return PLAN_DISPLAY_NAMES[planId];
    return planId.charAt(0).toUpperCase() + planId.slice(1);
}

export function isKnownPlanId(value: string): value is PlanId {
    return (ALL_PLAN_IDS as readonly string[]).includes(value);
}
