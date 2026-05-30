import { useFeatureFlag } from './useFeatureFlag';
import { useUserProfile } from './useUserProfile';

/**
 * Phase 1.5 sub-gate: pastor must have BOTH `pastoral_fidelity_flow`
 * (parent) AND `pastoral_word_study` (sub-flag) enabled to see the new
 * `PastoralWordStudyModal`. When only the parent is enabled, the
 * MorphologyStep stays on the Phase 1 interim degraded surface
 * (greek tutor embed) per ADR-016.
 */
export function usePastoralWordStudyGate(): { enabled: boolean; loading: boolean } {
    const parent = useFeatureFlag('pastoral_fidelity_flow');
    const sub = useFeatureFlag('pastoral_word_study');
    return {
        enabled: parent.enabled && sub.enabled,
        loading: parent.loading || sub.loading,
    };
}

/**
 * Phase 2 sub-gate: pastor needs BOTH `pastoral_fidelity_flow` (parent)
 * AND `three_witnesses` (sub-flag) for the witness validation gate to run
 * after the six-step seed completes (ADR-011). When only the parent is on,
 * "Continuar al borrador" behaves as in Phase 1 (no validation).
 */
export function useThreeWitnessesGate(): { enabled: boolean; loading: boolean } {
    const parent = useFeatureFlag('pastoral_fidelity_flow');
    const sub = useFeatureFlag('three_witnesses');
    return {
        enabled: parent.enabled && sub.enabled,
        loading: parent.loading || sub.loading,
    };
}

/**
 * Phase 2.5 sub-gate: pastor needs BOTH `pastoral_fidelity_flow` (parent)
 * AND `study_depth` (sub-flag) for the Study Companion (coverage badge +
 * per-step orientation, ADR-025/026). Default off → blast radius 0 until
 * toggled. When only the parent is on, the wizard behaves as in Phase 1.6.
 */
export function useStudyDepthGate(): { enabled: boolean; loading: boolean } {
    const parent = useFeatureFlag('pastoral_fidelity_flow');
    const sub = useFeatureFlag('study_depth');
    return {
        enabled: parent.enabled && sub.enabled,
        loading: parent.loading || sub.loading,
    };
}

/**
 * Phase 3 sub-gate: pastor needs BOTH `pastoral_fidelity_flow` (parent)
 * AND `fidelity_pass` (sub-flag) for the claim/source fidelity pass — the
 * second-pass LLM evaluator that scores every `[N]` marker (ADR-029) and
 * the FidelityReviewPanel in the sermon editor. Default off → blast
 * radius 0 until toggled. When only the parent is on, sermons publish
 * with identity-only validation (Phase B+C citation engine) as before.
 */
export function useFidelityPassGate(): { enabled: boolean; loading: boolean } {
    const parent = useFeatureFlag('pastoral_fidelity_flow');
    const sub = useFeatureFlag('fidelity_pass');
    return {
        enabled: parent.enabled && sub.enabled,
        loading: parent.loading || sub.loading,
    };
}

export type PastoralFidelityGateReason =
    | 'loading'
    | 'flag-disabled'
    | 'allowed';

export interface PastoralFidelityGateResult {
    /** True iff the user can enter the Pastoral Fidelity flow. */
    allowed: boolean;
    /** Loading state — surface a spinner while waiting for profile + flag. */
    loading: boolean;
    /** Why the gate decided what it decided — drives the CTA the UI surfaces. */
    reason: PastoralFidelityGateReason;
    /**
     * Whether the user has confessional witnesses enabled (ADR-010).
     * Default `true` unless the pastor explicitly opted out via
     * `/settings/confession` with a justification. Phase 2 Testigo 3
     * consumers read this to decide whether `distinctive` and
     * `open-evangelical` checks fire. `core` ecumenical doctrines fire
     * regardless of this flag — they are universal.
     */
    confessionalWitnessesEnabled: boolean;
}

/**
 * Gate hook for the Pastoral Fidelity flow.
 *
 * Single hard requirement: feature flag `pastoral_fidelity_flow`
 * enabled for the user. Admins flip this per-user from the Feature
 * Flags tab (PR 0.1).
 *
 * Confessional witnesses (ADR-010) is independent of the gate — it's a
 * pastoral configuration that shapes Phase 2 Testigo 3 behaviour but
 * never blocks entry. Default ON because the manifesto treats
 * historical theology as constitutive of the method.
 */
export function usePastoralFidelityGate(): PastoralFidelityGateResult {
    const { enabled, loading: flagLoading } = useFeatureFlag('pastoral_fidelity_flow');
    const { profile, loading: profileLoading } = useUserProfile();

    if (flagLoading || profileLoading) {
        return {
            allowed: false,
            loading: true,
            reason: 'loading',
            confessionalWitnessesEnabled: false,
        };
    }
    if (!enabled) {
        return {
            allowed: false,
            loading: false,
            reason: 'flag-disabled',
            confessionalWitnessesEnabled: false,
        };
    }
    return {
        allowed: true,
        loading: false,
        reason: 'allowed',
        // ADR-010 default: absent field = enabled. Only an explicit `false`
        // (opt-out by the pastor with audit-logged justification) silences
        // distinctive + open-evangelical witnesses.
        confessionalWitnessesEnabled: profile?.useConfessionalWitnesses !== false,
    };
}
