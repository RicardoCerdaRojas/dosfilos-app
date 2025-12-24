import { useCallback } from 'react';
import { useFirebase } from '@/context/firebase-context';
import { UsageLimitsService, LimitCheckResult } from '@dosfilos/application/src/services/UsageLimitsService';
import { FirebaseUserProfileRepository, FirebasePlanRepository } from '@dosfilos/infrastructure';

// Singleton instances
const userProfileRepository = new FirebaseUserProfileRepository();
const planRepository = new FirebasePlanRepository();
const usageLimitsService = new UsageLimitsService(userProfileRepository, planRepository);

export function useUsageLimits() {
    const { user } = useFirebase();

    const checkCanCreateSermon = useCallback(async (): Promise<LimitCheckResult> => {
        if (!user) return { allowed: false, reason: 'No autenticado' };
        return usageLimitsService.canCreateSermon(user.uid);
    }, [user]);

    const checkCanCreatePreachingPlan = useCallback(async (): Promise<LimitCheckResult> => {
        if (!user) return { allowed: false, reason: 'No autenticado' };
        return usageLimitsService.canCreatePreachingPlan(user.uid);
    }, [user]);

    const checkCanStartGreekSession = useCallback(async (): Promise<LimitCheckResult> => {
        if (!user) return { allowed: false, reason: 'No autenticado' };
        return usageLimitsService.canStartGreekSession(user.uid);
    }, [user]);

    const checkCanAccessLibrary = useCallback(async (): Promise<boolean> => {
        if (!user) return false;
        return usageLimitsService.canAccessLibrary(user.uid);
    }, [user]);

    const getLibraryStorageUsage = useCallback(async () => {
        if (!user) return { used: 0, limit: 0, percentage: 0 };
        return usageLimitsService.getLibraryStorageUsage(user.uid);
    }, [user]);

    return {
        checkCanCreateSermon,
        checkCanCreatePreachingPlan,
        checkCanStartGreekSession,
        checkCanAccessLibrary,
        getLibraryStorageUsage,
    };
}
