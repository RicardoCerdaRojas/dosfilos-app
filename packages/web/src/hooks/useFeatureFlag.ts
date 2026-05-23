import { useUserProfile } from './useUserProfile';
import type { FeatureFlagName } from '@dosfilos/domain';

/**
 * Reads a single feature-flag value off the current user's profile.
 * Returns `false` for missing flags so consumers can treat the gate
 * uniformly without null checks.
 *
 * The profile loads once per session via `useUserProfile`; mutations
 * (admin Feature Flags tab) require the user to refresh — feature gating
 * isn't latency-critical and real-time updates would force a snapshot
 * subscription on every component that reads any flag.
 */
export function useFeatureFlag(name: FeatureFlagName): { enabled: boolean; loading: boolean } {
    const { profile, loading } = useUserProfile();
    const enabled = profile?.featureFlags?.[name] === true;
    return { enabled, loading };
}
