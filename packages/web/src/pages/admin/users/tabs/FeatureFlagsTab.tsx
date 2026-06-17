import { useState } from 'react';
import type { User, FeatureFlagName } from '@dosfilos/domain';
import {
    FEATURE_FLAG_NAMES,
    getFlagPrerequisites,
    getFlagDependents,
    isDormantFeatureFlag,
} from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Loader2, Flag, Moon } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useSetUserFeatureFlags } from '@/hooks/admin/useSetUserFeatureFlags';

interface Props {
    user: User;
}

/**
 * Admin tab listing every known feature flag with a toggle per flag.
 *
 * Activación inteligente con la topología de dependencias declarada en dominio
 * (`FEATURE_FLAG_PREREQUISITES`):
 * - Hacia arriba (prereqs) → AUTOMÁTICO: encender un flag enciende el cierre
 *   transitivo de sus prerequisitos → nunca un flag activo-pero-inerte.
 * - Hacia abajo (dependientes) → NUNCA cascada silenciosa: apagar un padre con
 *   descendientes activos pide CONFIRMACIÓN y lista qué se apagará.
 * - Flags dormantes (`fidelity_pass`, ADR-032) → INACTIVABLES, no solo
 *   desaconsejados.
 */
export function FeatureFlagsTab({ user }: Props) {
    const { t } = useTranslation('admin');
    const { setFlags, isLoading } = useSetUserFeatureFlags();
    const [pendingFlag, setPendingFlag] = useState<FeatureFlagName | null>(null);
    const [disableTarget, setDisableTarget] = useState<{
        flag: FeatureFlagName;
        dependents: FeatureFlagName[];
    } | null>(null);

    const isOn = (flag: FeatureFlagName) => user.featureFlags?.[flag] === true;

    const applyFlags = async (
        anchor: FeatureFlagName,
        patch: Partial<Record<FeatureFlagName, boolean>>,
    ) => {
        setPendingFlag(anchor);
        await setFlags(user.id, patch);
        setPendingFlag(null);
    };

    const handleToggle = async (flag: FeatureFlagName, next: boolean) => {
        if (isDormantFeatureFlag(flag)) return; // inactivable

        if (next) {
            // Up automático: enciende también los prereqs transitivos que estén off.
            const patch: Partial<Record<FeatureFlagName, boolean>> = { [flag]: true };
            for (const prereq of getFlagPrerequisites(flag)) {
                if (!isOn(prereq)) patch[prereq] = true;
            }
            await applyFlags(flag, patch);
            return;
        }

        // Apagar: si hay descendientes activos, NO cascada silenciosa → confirmar.
        const activeDependents = getFlagDependents(flag).filter(isOn);
        if (activeDependents.length > 0) {
            setDisableTarget({ flag, dependents: activeDependents });
            return;
        }
        await applyFlags(flag, { [flag]: false });
    };

    const confirmDisable = async () => {
        if (!disableTarget) return;
        const patch: Partial<Record<FeatureFlagName, boolean>> = { [disableTarget.flag]: false };
        for (const dep of disableTarget.dependents) patch[dep] = false;
        const anchor = disableTarget.flag;
        setDisableTarget(null);
        await applyFlags(anchor, patch);
    };

    return (
        <div className="space-y-4">
            <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Flag className="h-4 w-4 text-primary" />
                    <h2 className="text-lg font-semibold">{t('users.featureFlags.title')}</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                    {t('users.featureFlags.description')}
                </p>

                <div className="space-y-3">
                    {FEATURE_FLAG_NAMES.map((flag) => {
                        const enabled = isOn(flag);
                        const busy = pendingFlag === flag && isLoading;
                        const dormant = isDormantFeatureFlag(flag);
                        return (
                            <div
                                key={flag}
                                className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <code className="text-sm font-mono font-semibold">{flag}</code>
                                        {dormant && (
                                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                                                <Moon className="h-3 w-3" />
                                                {t('users.featureFlags.dormantBadge')}
                                            </Badge>
                                        )}
                                        {busy && (
                                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t(`users.featureFlags.flags.${flag}.description`, {
                                            defaultValue: '',
                                        })}
                                    </p>
                                    {dormant && (
                                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                                            {t('users.featureFlags.dormantNote')}
                                        </p>
                                    )}
                                </div>
                                <Switch
                                    checked={enabled}
                                    disabled={busy || dormant}
                                    onCheckedChange={(value) => handleToggle(flag, value)}
                                    aria-label={flag}
                                />
                            </div>
                        );
                    })}
                </div>
            </Card>

            <AlertDialog open={disableTarget !== null} onOpenChange={(o) => !o && setDisableTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('users.featureFlags.disableTitle', { flag: disableTarget?.flag ?? '' })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('users.featureFlags.disableDescription', {
                                flag: disableTarget?.flag ?? '',
                                count: disableTarget?.dependents.length ?? 0,
                                dependents: (disableTarget?.dependents ?? []).join(', '),
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('users.featureFlags.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDisable}>
                            {t('users.featureFlags.disableConfirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
