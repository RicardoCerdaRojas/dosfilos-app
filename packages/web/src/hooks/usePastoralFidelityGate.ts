import { useFeatureFlag } from './useFeatureFlag';
import { useUserProfile } from './useUserProfile';

export type PastoralFidelityGateReason =
    | 'loading'
    | 'flag-disabled'
    | 'confession-required'
    | 'allowed';

export interface PastoralFidelityGateResult {
    /** True iff the user can enter the Pastoral Fidelity flow. */
    allowed: boolean;
    /** Loading state — surface a spinner while waiting for profile + flag. */
    loading: boolean;
    /** Why the gate decided what it decided — drives the CTA the UI surfaces. */
    reason: PastoralFidelityGateReason;
}

/**
 * Gate hook for the Pastoral Fidelity flow ([ADR-007 § Q2](docs/pastoral-fidelity/decisions/ADR-007-phase-0-policy-resolutions.md)).
 *
 * Two requirements:
 *   1. Feature flag `pastoral_fidelity_flow` enabled for the user. Admins
 *      flip this per-user from the Feature Flags tab (PR 0.1).
 *   2. The user has declared a confessional identity (any catalog id or
 *      the synthetic `'non-confessional'`). Without this, Testigo 3 of
 *      the three-witness mechanism cannot anchor — so the flow refuses
 *      to start and pushes the user to `/settings/confession`.
 *
 * Returns a discriminated state so the UI can render exactly the right
 * CTA: loading spinner, "Activar flag" link, "Declarar confesión", or
 * unlocked entry.
 */
export function usePastoralFidelityGate(): PastoralFidelityGateResult {
    const { enabled, loading: flagLoading } = useFeatureFlag('pastoral_fidelity_flow');
    const { profile, loading: profileLoading } = useUserProfile();

    if (flagLoading || profileLoading) {
        return { allowed: false, loading: true, reason: 'loading' };
    }
    if (!enabled) {
        return { allowed: false, loading: false, reason: 'flag-disabled' };
    }
    if (!profile?.declaredConfession) {
        return { allowed: false, loading: false, reason: 'confession-required' };
    }
    return { allowed: true, loading: false, reason: 'allowed' };
}
