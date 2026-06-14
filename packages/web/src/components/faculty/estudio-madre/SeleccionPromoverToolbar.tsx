import { useState } from 'react';
import { toast } from 'sonner';
import { BookmarkPlus, Copy } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useEstudioEnConstruccion } from '@/features/estudio-madre/useEstudioEnConstruccion';
import { useTextSelection } from '@/features/estudio-madre/useTextSelection';
import { PromoteTipoMenu } from './PromoteTipoMenu';

/**
 * Toolbar flotante que aparece al seleccionar texto dentro de los mensajes:
 * promover el FRAGMENTO seleccionado a un elemento (picker de tipo) o copiarlo.
 * Convive con el botón de promoción por mensaje (que promueve la respuesta
 * completa). spec v1.3 §2.4 — promoción explícita y deliberada.
 *
 * Autoría del fragmento: `sistema` por defecto (la mayoría de las selecciones
 * son contenido del tutor). Editar el elemento luego lo pasa a `mixto`.
 */
export function SeleccionPromoverToolbar({ sessionId }: { sessionId: string }) {
    const { t } = useTranslation('faculty');
    const { selection, clear } = useTextSelection();
    const { promover } = useEstudioEnConstruccion(sessionId);
    const [menuOpen, setMenuOpen] = useState(false);

    if (!selection) return null;

    const top = Math.max(8, selection.rect.top - 8);
    const left = selection.rect.left + selection.rect.width / 2;

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(selection.text);
            toast.success(t('estudioMadre.copied'));
        } catch {
            /* clipboard no disponible */
        }
        clear();
    };

    return (
        <div
            data-seleccion-toolbar
            style={{ position: 'fixed', top, left, transform: 'translate(-50%, -100%)', zIndex: 50 }}
            className="flex items-center gap-1 rounded-lg border border-border bg-popover shadow-md p-1"
        >
            <PromoteTipoMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                align="start"
                onPick={(tipo) => {
                    promover({ tipo, contenido: selection.text, autoria: 'sistema' });
                    setMenuOpen(false);
                    clear();
                    toast.success(t('estudioMadre.promoted'));
                }}
            >
                <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-accent text-foreground"
                >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    {t('estudioMadre.promoteShort')}
                </button>
            </PromoteTipoMenu>
            <button
                type="button"
                onClick={copiar}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-accent text-foreground"
            >
                <Copy className="w-3.5 h-3.5" />
                {t('estudioMadre.copy')}
            </button>
        </div>
    );
}
