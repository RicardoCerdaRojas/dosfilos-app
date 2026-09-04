import { useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/i18n';

/**
 * `window.confirm` con la forma de siempre y el diálogo de la app.
 *
 * El nativo bloquea el hilo del navegador, no se puede traducir ni
 * estilar, y en algunos navegadores móviles el usuario puede silenciarlo
 * para el resto de la sesión — es decir, una acción destructiva podría
 * ejecutarse sin preguntar nada. Quedaban once llamadas repartidas por
 * la aplicación.
 *
 * `ConfirmDialog` ya existía, pero exige estado propio en cada pantalla:
 * abrir, recordar sobre qué, cerrar. Once veces lo mismo. Este hook
 * conserva la forma del nativo —`if (!await confirm(...)) return;`— y a
 * cambio pide una sola cosa: renderizar `confirmDialog` en el árbol.
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *
 *   const borrar = async () => {
 *       if (!await confirm({ title: t('…'), body: t('…') })) return;
 *       await servicio.borrar(id);
 *   };
 *
 *   return (<>…{confirmDialog}</>);
 *
 * Cerrar con Esc, con el botón Cancelar o pulsando fuera resuelve
 * `false`: sólo el botón de confirmar resuelve `true`. Un diálogo que se
 * cierra solo nunca puede leerse como un sí.
 */
export interface ConfirmRequest {
    /** Por defecto, «Confirma la acción» del namespace común. */
    title?: string;
    body: string;
    /** Por defecto, «Confirmar» del namespace común. */
    confirmLabel?: string;
    /** Por defecto, «Cancelar» del namespace común. */
    cancelLabel?: string;
    /** Por defecto `true`: casi todo lo que se confirma es destructivo. */
    destructive?: boolean;
}

export interface UseConfirmResult {
    confirm: (request: ConfirmRequest) => Promise<boolean>;
    /** Renderizar en el árbol del componente; sin esto no aparece nada. */
    confirmDialog: React.ReactNode;
}

export function useConfirm(): UseConfirmResult {
    const { t } = useTranslation('common');
    const [request, setRequest] = useState<ConfirmRequest | null>(null);
    const resolverRef = useRef<((ok: boolean) => void) | null>(null);

    const settle = useCallback((ok: boolean) => {
        const resolve = resolverRef.current;
        resolverRef.current = null;
        setRequest(null);
        resolve?.(ok);
    }, []);

    const confirm = useCallback((next: ConfirmRequest) => {
        // Una segunda pregunta mientras la primera sigue abierta deja a
        // quien esperaba sin respuesta nunca. Se resuelve la anterior
        // como «no»: nadie la contestó, y ante la duda no se destruye.
        resolverRef.current?.(false);
        setRequest(next);
        return new Promise<boolean>(resolve => {
            resolverRef.current = resolve;
        });
    }, []);

    const confirmDialog = request ? (
        <ConfirmDialog
            open
            onOpenChange={open => { if (!open) settle(false); }}
            title={request.title ?? t('confirmations.title')}
            body={request.body}
            confirmLabel={request.confirmLabel ?? t('buttons.confirm')}
            cancelLabel={request.cancelLabel ?? t('buttons.cancel')}
            destructive={request.destructive ?? true}
            onConfirm={() => settle(true)}
        />
    ) : null;

    return { confirm, confirmDialog };
}
