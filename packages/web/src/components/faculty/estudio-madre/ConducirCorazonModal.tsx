import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { validarConduccionCorazon, type ConduccionCorazonRespuestas } from '@dosfilos/domain';

/** Pasos de texto (C2–C5); C1 es la elección de proposición, aparte. */
const PASOS_TEXTO = ['caraAfectiva', 'raizTeocentrica', 'puenteCongregacion', 'afeccion'] as const;
type PasoTexto = (typeof PASOS_TEXTO)[number];

const RESPUESTAS_VACIAS: ConduccionCorazonRespuestas = {
    proposicionElementoId: '',
    caraAfectiva: '',
    raizTeocentrica: '',
    puenteCongregacion: '',
    afeccion: '',
};

/**
 * Conducción del corazón (manifiesto v1.3 §3.2). Stepper guiado C1–C5: el sistema
 * pregunta, da pistas y confronta; el docente escribe la afección. El sistema
 * NUNCA redacta el afecto. Produce un `aplicacion:corazon` trazado al texto.
 */
export function ConducirCorazonModal({
    open,
    onOpenChange,
    ideasCentrales,
    onConducir,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Ideas centrales del estudio (la proposición exegética a la que C1 ancla). */
    ideasCentrales: { id: string; contenido: string }[];
    onConducir: (respuestas: ConduccionCorazonRespuestas) => void;
}) {
    const { t } = useTranslation('faculty');
    const [paso, setPaso] = useState(0); // 0 = C1, 1..4 = C2..C5
    const [r, setR] = useState<ConduccionCorazonRespuestas>(RESPUESTAS_VACIAS);

    const reset = () => {
        setPaso(0);
        setR(RESPUESTAS_VACIAS);
    };

    const cerrar = (next: boolean) => {
        if (!next) reset();
        onOpenChange(next);
    };

    const setCampo = (campo: PasoTexto, valor: string) => setR((prev) => ({ ...prev, [campo]: valor }));

    const sinProposicion = ideasCentrales.length === 0;
    const esUltimo = paso === 4;
    const validacion = useMemo(() => validarConduccionCorazon(r), [r]);

    // Avance por paso: C1 exige proposición elegida; cada paso de texto exige
    // que ese paso no esté en `faltantes`.
    const pasoListo = (() => {
        if (paso === 0) return !!r.proposicionElementoId;
        const campo = PASOS_TEXTO[paso - 1];
        const mapa: Record<PasoTexto, boolean> = {
            caraAfectiva: !validacion.faltantes.includes('caraAfectiva'),
            raizTeocentrica: !validacion.faltantes.includes('raizTeocentrica'),
            puenteCongregacion: !validacion.faltantes.includes('puenteCongregacion'),
            afeccion: !validacion.faltantes.includes('afeccion'),
        };
        return mapa[campo];
    })();

    const finalizar = () => {
        if (!validacion.valido) {
            toast.error(t('estudioMadre.corazon.incompleto'));
            return;
        }
        onConducir(r);
        toast.success(t('estudioMadre.corazon.listo'));
        reset();
        onOpenChange(false);
    };

    const claveC = paso === 0 ? 'c1' : `c${paso + 1}`;

    return (
        <Dialog open={open} onOpenChange={cerrar}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        <span className="inline-flex items-center gap-2">
                            <Heart className="w-4 h-4 text-accent" />
                            {t('estudioMadre.corazon.title')}
                        </span>
                    </DialogTitle>
                    <DialogDescription>{t(`estudioMadre.corazon.${claveC}.pregunta`)}</DialogDescription>
                </DialogHeader>

                {/* Progreso C1..C5 */}
                <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className={cn('h-1 flex-1 rounded-full', i <= paso ? 'bg-accent' : 'bg-border')}
                        />
                    ))}
                </div>

                <div className="space-y-3 py-1">
                    {/* Pista de elicitación (la linterna, no el tesoro). */}
                    <p className="text-xs text-muted-foreground italic">
                        {t(`estudioMadre.corazon.${claveC}.pista`)}
                    </p>

                    {paso === 0 ? (
                        sinProposicion ? (
                            <p className="text-sm text-warning">{t('estudioMadre.corazon.c1.sinIdea')}</p>
                        ) : (
                            <div className="space-y-1.5">
                                {ideasCentrales.map((idea) => (
                                    <label
                                        key={idea.id}
                                        className={cn(
                                            'flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer',
                                            r.proposicionElementoId === idea.id
                                                ? 'border-accent bg-accent/5'
                                                : 'border-border hover:bg-accent/5',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="proposicion"
                                            className="mt-1"
                                            checked={r.proposicionElementoId === idea.id}
                                            onChange={() =>
                                                setR((prev) => ({ ...prev, proposicionElementoId: idea.id }))
                                            }
                                        />
                                        <span>{idea.contenido}</span>
                                    </label>
                                ))}
                            </div>
                        )
                    ) : (
                        <textarea
                            value={r[PASOS_TEXTO[paso - 1]]}
                            onChange={(ev) => setCampo(PASOS_TEXTO[paso - 1], ev.target.value)}
                            rows={4}
                            placeholder={t(`estudioMadre.corazon.${claveC}.placeholder`)}
                            aria-label={t(`estudioMadre.corazon.${claveC}.pregunta`)}
                            className="w-full text-sm rounded-md border border-border bg-background px-2 py-1.5 resize-y text-foreground"
                        />
                    )}

                    {/* Confrontación del paso (qué atrapa este examen). */}
                    <p className="text-xs text-muted-foreground">
                        {t(`estudioMadre.corazon.${claveC}.confronta`)}
                    </p>
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => (paso === 0 ? cerrar(false) : setPaso((p) => p - 1))}
                    >
                        {paso === 0 ? t('estudioMadre.corazon.cancelar') : t('estudioMadre.corazon.atras')}
                    </Button>
                    {esUltimo ? (
                        <Button size="sm" onClick={finalizar} disabled={!validacion.valido}>
                            {t('estudioMadre.corazon.finalizar')}
                        </Button>
                    ) : (
                        <Button size="sm" onClick={() => setPaso((p) => p + 1)} disabled={!pasoListo}>
                            {t('estudioMadre.corazon.siguiente')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
