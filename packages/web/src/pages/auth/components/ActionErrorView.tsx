import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { mapAuthErrorCodeToKey } from './authErrorMessages';

interface ActionErrorViewProps {
    code: string | null;
}

export function ActionErrorView({ code }: ActionErrorViewProps) {
    const { t } = useTranslation('auth');
    const errorKey = mapAuthErrorCodeToKey(code);

    return (
        <AuthLayout title={t('action.error.title')} subtitle={t(errorKey)}>
            <div className="space-y-6">
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-[2px]" aria-hidden />
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                            {t('action.error.heading')}
                        </p>
                        <p className="text-[13px] text-muted-foreground">{t('action.error.help')}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Link to="/auth/verify-email" className="block">
                        <Button variant="outline" className="w-full h-11">
                            {t('action.error.backToVerify')}
                        </Button>
                    </Link>
                    <Link to="/login" className="block">
                        <Button
                            variant="ghost"
                            className="w-full h-10 text-muted-foreground hover:text-foreground"
                        >
                            {t('action.error.backToLogin')}
                        </Button>
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}
