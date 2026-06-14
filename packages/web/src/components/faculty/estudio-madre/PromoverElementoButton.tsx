import { useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useEstudioEnConstruccion } from '@/features/estudio-madre/useEstudioEnConstruccion';
import { PromoteTipoMenu } from './PromoteTipoMenu';

/**
 * Gesto de promoción del MENSAJE COMPLETO (spec v1.3 §2.4): promueve UN mensaje
 * a UN elemento del Estudio Madre. Acto explícito y deliberado — nada entra al
 * estudio por defecto. La autoría se infiere del rol (docente / sistema) para
 * que la métrica sea honesta. (Para promover un fragmento, ver el toolbar de
 * selección de texto.)
 */
export function PromoverElementoButton({
    sessionId,
    mensajeId,
    contenido,
    role,
}: {
    sessionId: string;
    mensajeId: string;
    contenido: string;
    role: 'user' | 'model' | 'system';
}) {
    const { t } = useTranslation('faculty');
    const { promover } = useEstudioEnConstruccion(sessionId);
    const [open, setOpen] = useState(false);

    const autoria = role === 'user' ? 'docente' : 'sistema';

    return (
        <PromoteTipoMenu
            open={open}
            onOpenChange={setOpen}
            onPick={(tipo) => {
                promover({ tipo, contenido, autoria, mensajeId });
                setOpen(false);
            }}
        >
            <button
                type="button"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"
                title={t('estudioMadre.promote')}
                aria-label={t('estudioMadre.promote')}
            >
                <BookmarkPlus className="w-3.5 h-3.5" />
            </button>
        </PromoteTipoMenu>
    );
}
