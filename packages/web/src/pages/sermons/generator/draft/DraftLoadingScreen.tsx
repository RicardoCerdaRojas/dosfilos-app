import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';

/** Mientras el modelo redacta. Ocupa el paso entero: no hay nada que revisar aún. */
export function DraftLoadingScreen() {
    const { t } = useTranslation('generator');
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-lg font-medium">{t('drafting.loading')}</p>
                <p className="text-sm text-muted-foreground">{t('drafting.loadingSub')}</p>
            </div>
        </div>
    );
}
