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

/**
 * Phase 4 PR 1 sub-gate: pastor needs BOTH `pastoral_fidelity_flow` (parent)
 * AND `contra_scan` (sub-flag) for the contra-scan pre-publish confrontation
 * (ADR-033) — surfacing dissenting library chunks before publish. Default off
 * → blast radius 0. Independent of `fidelity_pass` (dormant per ADR-032): this
 * is the active P3 confrontation on the sermon.
 */
export function useContraScanGate(): { enabled: boolean; loading: boolean } {
    const parent = useFeatureFlag('pastoral_fidelity_flow');
    const sub = useFeatureFlag('contra_scan');
    return {
        enabled: parent.enabled && sub.enabled,
        loading: parent.loading || sub.loading,
    };
}

/**
 * ADR-035 sub-gate: pastor needs BOTH `pastoral_fidelity_flow` (parent) AND
 * `passage_profile` (sub-flag) for the passage profile (Capa 1) + adaptive
 * coverage. Default off → blast radius 0. While off, the guided study runs the
 * classic 8-step flow with no profiling. Held off until the shadow run
 * adjudicates detector precision (plan §5) before the flip to enforce.
 */
export function usePassageProfileGate(): { enabled: boolean; loading: boolean } {
    const parent = useFeatureFlag('pastoral_fidelity_flow');
    const sub = useFeatureFlag('passage_profile');
    return {
        enabled: parent.enabled && sub.enabled,
        loading: parent.loading || sub.loading,
    };
}

/**
 * ADR-035 enforce-gate: aplica el perfil (nudges + confront retenido + colector
 * de cobertura) SOLO con los tres flags on: pastoral_fidelity_flow +
 * passage_profile (sombra) + passage_profile_enforce. Separado de la sombra a
 * propósito — el enforce se enciende tras adjudicar precisión (plan §5). Default
 * off → perfila/registra pero no confronta.
 */
export function usePassageProfileEnforceGate(): { enabled: boolean; loading: boolean } {
    const parent = useFeatureFlag('pastoral_fidelity_flow');
    const shadow = useFeatureFlag('passage_profile');
    const enforce = useFeatureFlag('passage_profile_enforce');
    return {
        enabled: parent.enabled && shadow.enabled && enforce.enabled,
        loading: parent.loading || shadow.loading || enforce.loading,
    };
}

/**
 * ADR-036 PR6 enforce-gate: aplica el VERIFY-DROP de las lecturas erróneas del
 * DETECTOR (descarta las que no anclan a un verso real) SOLO con los tres flags
 * on: pastoral_fidelity_flow + passage_profile + anchor_fidelity_enforce.
 * Separado del shadow a propósito — se enciende tras medir el corte 1 en sombra.
 * Default off → mide la tasa de falla pero no descarta. El piso curado (PR5) es
 * independiente de este flag (siempre verificado).
 */
export function useAnchorFidelityEnforceGate(): { enabled: boolean; loading: boolean } {
    const parent = useFeatureFlag('pastoral_fidelity_flow');
    const shadow = useFeatureFlag('passage_profile');
    const enforce = useFeatureFlag('anchor_fidelity_enforce');
    return {
        enabled: parent.enabled && shadow.enabled && enforce.enabled,
        loading: parent.loading || shadow.loading || enforce.loading,
    };
}

/**
 * Redacción v2 Fase 1 (§4.4) enforce-gate: enciende la CONFRONTACIÓN del override
 * de género socrático (paso 2) SOLO con los tres flags on: pastoral_fidelity_flow
 * + passage_profile (sombra) + genre_override_enforce. Separado del enforce de
 * cobertura a propósito (adjudicación y datos distintos). Default off → el
 * sistema MIDE el discernimiento de género en sombra pero no confronta
 * (shadow-first).
 */
export function useGenreOverrideEnforceGate(): { enabled: boolean; loading: boolean } {
    const parent = useFeatureFlag('pastoral_fidelity_flow');
    const shadow = useFeatureFlag('passage_profile');
    const enforce = useFeatureFlag('genre_override_enforce');
    return {
        enabled: parent.enabled && shadow.enabled && enforce.enabled,
        loading: parent.loading || shadow.loading || enforce.loading,
    };
}

/**
 * Redacción v2 Fase 1 (§4.5) — ayuda estructural sensible al género en el paso 3
 * (andamiaje formativo LIVE). La cadena EXPRESA la dependencia: la ayuda ramifica
 * por el género confirmado en el paso 2, cuya maquinaria (PR1) vive detrás de
 * `passage_profile` → enciende con pastoral_fidelity_flow + passage_profile +
 * step3_genre_help. NO se puede tener la ayuda con el subsistema de género
 * apagado. Default off: el texto pastoral-facing (`guidance`) espera revisión del
 * fundador. No es shadow/enforce — es ayuda formativa gated.
 */
export function useStep3GenreHelpGate(): { enabled: boolean; loading: boolean } {
    const parent = useFeatureFlag('pastoral_fidelity_flow');
    const genreSubsystem = useFeatureFlag('passage_profile');
    const help = useFeatureFlag('step3_genre_help');
    return {
        enabled: parent.enabled && genreSubsystem.enabled && help.enabled,
        loading: parent.loading || genreSubsystem.loading || help.loading,
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
