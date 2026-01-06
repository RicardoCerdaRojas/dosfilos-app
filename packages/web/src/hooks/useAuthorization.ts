import { useFirebase } from '@/context/firebase-context';
import {
    Module,
    Feature,
    AdminPermission,
} from '@dosfilos/domain';
import {
    AuthorizationService
} from '@dosfilos/application';
import {
    FirebasePlanRepository
} from '@dosfilos/infrastructure';
import { useMemo } from 'react';

// Singleton instance
const planRepository = new FirebasePlanRepository();
const authService = new AuthorizationService(planRepository);

export function useAuthorization() {
    const { user } = useFirebase();

    const hasModule = useMemo(() => {
        return async (module: Module): Promise<boolean> => {
            return authService.hasModule(user, module);
        };
    }, [user]);

    const hasFeature = useMemo(() => {
        return async (feature: Feature): Promise<boolean> => {
            return authService.hasFeature(user, feature);
        };
    }, [user]);

    const hasAdminPermission = useMemo(() => {
        return (permission: AdminPermission): boolean => {
            return authService.hasAdminPermission(user, permission);
        };
    }, [user]);

    const isAdmin = useMemo(() => {
        return authService.isAdmin(user);
    }, [user]);

    const isPlanActive = useMemo(() => {
        return authService.isPlanActive(user?.subscription);
    }, [user]);

    const planName = useMemo(() => {
        return authService.getPlanName(user);
    }, [user]);

    return {
        hasModule,
        hasFeature,
        hasAdminPermission,
        isAdmin,
        isPlanActive,
        planName,
    };
}
