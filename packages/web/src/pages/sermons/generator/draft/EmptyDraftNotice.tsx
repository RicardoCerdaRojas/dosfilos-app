import { useTranslation } from '@/i18n';

/**
 * LA PESTAÑA BORRADOR EXISTE ANTES DEL BORRADOR.
 *
 * Sin esto, entrar al taller sin haber armado nada dejaba una pestaña que no se
 * podía abrir — y el pastor sin saber qué le falta para llenarla.
 */
export function EmptyDraftNotice() {
    const { t } = useTranslation('generator');
    return (
        <div className="flex-1 min-h-0 flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-2">
                <h3 className="font-semibold">{t('drafting.emptyDraftTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('drafting.emptyDraftDesc')}</p>
            </div>
        </div>
    );
}
