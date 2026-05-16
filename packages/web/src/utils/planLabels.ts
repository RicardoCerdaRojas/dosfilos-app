/**
 * Single source of truth for plan id → display label across the app.
 * Plan names are brand product nouns (not translated text), so a plain
 * map is enough — no i18n indirection.
 *
 * Was previously duplicated in sidebar, admin filter, PlanBadge, and
 * dashboard PlanBalanceChip. Drift between those four lookups produced
 * the "Basic vs Personal" inconsistency where the dashboard rendered
 * `capitalize(planId)` ("Basic") while the sidebar map said "Personal".
 */
const PLAN_LABEL: Record<string, string> = {
    free: 'Free',
    basic: 'Personal',
    pro: 'Pro',
    team: 'Team',
    enterprise: 'Enterprise',
};

export function getPlanLabel(planId: string | null | undefined): string {
    if (!planId) return PLAN_LABEL.free;
    return PLAN_LABEL[planId] ?? planId.charAt(0).toUpperCase() + planId.slice(1);
}
