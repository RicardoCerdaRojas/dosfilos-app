import { useState } from 'react';
import { Loader2, MoreVertical, PenLine, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/i18n';

interface Props {
    loading: boolean;
    /**
     * El taller existe Y el pastor ya decidió algo en él.
     *
     * Es lo que separa "rehacer" de "vaciar el trabajo": sin decisiones,
     * regenerar es simplemente volver a pedir un borrador.
     */
    workshopHasDecisions: boolean;
    /** Llevar al taller, que es la ruta que NO se salta las decisiones. */
    onGoToWorkshop: () => void;
    onRegenerate: () => void;
}

/**
 * Rehacer el borrador desde cero: la SALIDA DE EMERGENCIA de ADR-037.
 *
 * NO ES UN BOTÓN MÁS DE LA BARRA, y ese es el punto de este componente.
 * Regenerar estaba al lado del pasaje, con el mismo peso visual, siendo la
 * acción que se salta el pipeline entero: produce el sermón que nadie decidió,
 * que es exactamente el artefacto que el flujo socrático existe para no
 * fabricar. El ADR lo dice sin rodeos — dejar una puerta de atrás que produce
 * el mismo artefacto sin decisiones "vacía el pipeline por el uso, no por el
 * diseño".
 *
 * SOBREVIVE, PORQUE UN SÁBADO A LAS 23:00 EXISTE. El ADR la conserva a
 * propósito: si el flujo guiado es el único camino, el pastor apurado abandona
 * la herramienta. Lo que cambia es el peso: de acción destacada a opción dentro
 * del menú, con la consecuencia dicha antes de ejecutarla.
 *
 * EL DIÁLOGO OFRECE LA ALTERNATIVA, NO SÓLO LA ADVERTENCIA. Cuando ya hay
 * decisiones en el taller, "Volver a armar" hace lo que el pastor casi siempre
 * quiere —un borrador nuevo DESDE lo que decidió— y regenerar no. Advertir sin
 * ofrecer la salida correcta deja al apurado eligiendo la destructiva igual.
 */
export function RegenerateDraftAction({
    loading,
    workshopHasDecisions,
    onGoToWorkshop,
    onRegenerate,
}: Props) {
    const { t } = useTranslation('generator');
    const [confirmando, setConfirmando] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={loading}
                        aria-label={t('drafting.moreActions')}
                        title={t('drafting.moreActions')}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <MoreVertical className="h-4 w-4" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setConfirmando(true)}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('drafting.regenerateConfirm.menuItem')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('drafting.regenerateConfirm.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {workshopHasDecisions
                                ? t('drafting.regenerateConfirm.workshopDescription')
                                : t('drafting.regenerateConfirm.description')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('drafting.regenerateConfirm.cancel')}</AlertDialogCancel>

                        {workshopHasDecisions && (
                            <AlertDialogAction
                                onClick={onGoToWorkshop}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                <PenLine className="mr-2 h-4 w-4" />
                                {t('drafting.regenerateConfirm.goToWorkshop')}
                            </AlertDialogAction>
                        )}

                        {/* LA DESTRUCTIVA NO ES LA PRIMARIA cuando hay una
                            alternativa que conserva el trabajo. */}
                        <AlertDialogAction
                            onClick={onRegenerate}
                            className={
                                workshopHasDecisions
                                    ? 'bg-transparent text-destructive border border-destructive/40 hover:bg-destructive/10'
                                    : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            }
                        >
                            {t('drafting.regenerateConfirm.confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
