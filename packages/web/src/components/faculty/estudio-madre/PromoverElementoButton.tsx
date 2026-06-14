import { useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/i18n';
import { useEstudioEnConstruccion } from '@/features/estudio-madre/useEstudioEnConstruccion';
import type { ElementoTipo } from '@dosfilos/domain';

/**
 * Gesto de promoción (spec v1.3 §2.4): promueve UN mensaje a UN elemento del
 * Estudio Madre. Acto explícito y deliberado — nada entra al estudio por
 * defecto. La autoría se infiere del rol (mensaje del docente = `docente`;
 * del asistente = `sistema`), para que la métrica de autoría sea honesta.
 *
 * MVP = riel pasaje formativo (§11): el picker ofrece los 6 tipos formativos.
 * Los tipos experto (marco/argumento…) llegan con el Asistente B (v2).
 */
const TIPOS_FORMATIVOS: ElementoTipo[] = [
    'idea_central',
    'observacion',
    'testigo',
    'testigo_historico',
    'error_confrontado',
    'aplicacion',
];

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
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"
                    title={t('estudioMadre.promote')}
                    aria-label={t('estudioMadre.promote')}
                >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {t('estudioMadre.promoteAs')}
                </p>
                {TIPOS_FORMATIVOS.map((tipo) => (
                    <button
                        key={tipo}
                        type="button"
                        onClick={() => {
                            promover({ tipo, contenido, autoria, mensajeId });
                            setOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        {t(`estudioMadre.tipos.${tipo}`)}
                    </button>
                ))}
            </PopoverContent>
        </Popover>
    );
}
