import { Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { useTranslation } from '@/i18n';

export function ActionLoadingView() {
    const { t } = useTranslation('auth');
    return (
        <AuthLayout title={t('action.loading.title')}>
            <div className="flex flex-col items-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" aria-hidden />
                <p className="text-sm text-muted-foreground">{t('action.loading.message')}</p>
            </div>
        </AuthLayout>
    );
}
