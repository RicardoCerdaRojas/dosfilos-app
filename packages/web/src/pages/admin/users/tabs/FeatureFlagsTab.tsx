import { useState } from 'react';
import type { User, FeatureFlagName } from '@dosfilos/domain';
import { FEATURE_FLAG_NAMES } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Flag } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useSetUserFeatureFlags } from '@/hooks/admin/useSetUserFeatureFlags';

interface Props {
    user: User;
}

/**
 * Admin tab listing every known feature flag with a toggle per flag.
 * Reads the current value off the live user profile (parent page
 * subscribes via `useUserProfile`) and pushes the new value through the
 * `setUserFeatureFlags` callable. The user document is the source of
 * truth — toggles flip optimistically only when the callable resolves.
 */
export function FeatureFlagsTab({ user }: Props) {
    const { t } = useTranslation('admin');
    const { setFlags, isLoading } = useSetUserFeatureFlags();
    const [pendingFlag, setPendingFlag] = useState<FeatureFlagName | null>(null);

    const handleToggle = async (flag: FeatureFlagName, next: boolean) => {
        setPendingFlag(flag);
        await setFlags(user.id, { [flag]: next });
        setPendingFlag(null);
    };

    return (
        <div className="space-y-4">
            <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Flag className="h-4 w-4 text-primary" />
                    <h2 className="text-lg font-semibold">
                        {t('users.featureFlags.title')}
                    </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                    {t('users.featureFlags.description')}
                </p>

                <div className="space-y-3">
                    {FEATURE_FLAG_NAMES.map((flag) => {
                        const enabled = user.featureFlags?.[flag] === true;
                        const busy = pendingFlag === flag && isLoading;
                        return (
                            <div
                                key={flag}
                                className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <code className="text-sm font-mono font-semibold">
                                            {flag}
                                        </code>
                                        {busy && (
                                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t(`users.featureFlags.flags.${flag}.description`, {
                                            defaultValue: '',
                                        })}
                                    </p>
                                </div>
                                <Switch
                                    checked={enabled}
                                    disabled={busy}
                                    onCheckedChange={(value) => handleToggle(flag, value)}
                                    aria-label={flag}
                                />
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
