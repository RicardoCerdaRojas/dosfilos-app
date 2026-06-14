import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronUp, ChevronDown, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { facultyService } from '@dosfilos/application';
import {
    aplicarVerificacionCitasMvp,
    claimsBlockingAbsolutely,
    claimsRequiringResponse,
    esAfirmacionDePeso,
    serializarEstudio,
    MIN_RESPALDO_TESTIGOS,
    WITNESS_THRESHOLDS,
    type ElementoTipo,
    type EstudioFidelidadResult,
    type EstudioMadre,
    type Extraction,
} from '@dosfilos/domain';
import { useEstudioEnConstruccion } from '@/features/estudio-madre/useEstudioEnConstruccion';
import { TIPOS_BASICOS, TIPOS_AVANZADOS } from '@/features/estudio-madre/tipos';
import { useValidarEstudioMadre } from '@/hooks/useValidarEstudioMadre';
import { EstadoFidelidadBadge } from './EstadoFidelidadBadge';

export function EstudioEnConstruccionPanel({
    sessionId,
    userId,
    onRefetch,
    onOpenBorrador,
}: {
    sessionId: string;
    userId: string;
    /** Refresca la lista de Recursos tras cristalizar (sin abrir el borrador). */
    onRefetch?: () => void;
    /** Abre el borrador en el editor (desde el diálogo de confirmación). */
    onOpenBorrador?: (extraction: Extraction) => void;
}) {
    const { t } = useTranslation('faculty');
    const estudio = useEstudioEnConstruccion(sessionId);
    const { validar, loading } = useValidarEstudioMadre();
    const [resultado, setResultado] = useState<EstudioFidelidadResult | null>(null);
    const [persisted, setPersisted] = useState(false);
    /** Estudio recién cristalizado en verde → diálogo de confirmación. */
    const [successExtraction, setSuccessExtraction] = useState<Extraction | null>(null);

    /** Persiste el estudio una vez que las puertas están en verde. */
    const persistir = async (result: EstudioFidelidadResult) => {
        // Elementos con la puerta 4 ya aplicada (sin mensajeId, metadato del borrador).
        const elementosConCitas = aplicarVerificacionCitasMvp(estudio.elementos).map(
            ({ mensajeId: _omit, ...e }) => e,
        );
        const sobre: EstudioMadre = {
            tipo: 'pasaje',
            modo: 'formativo',
            referencia: estudio.referencia.trim(),
            origenConversacionId: sessionId,
            estadoFidelidad: result.estadoFidelidad,
            version: 1,
            clonadoDe: null,
            elementos: elementosConCitas,
            autoriaResumen: result.autoria,
            proyectosVinculados: [],
            historialConfrontacion: [],
        };
        const extraction = await facultyService.crearEstudioMadre.execute({
            userId,
            sessionId,
            title: estudio.titulo.trim() || estudio.referencia.trim(),
            markdown: serializarEstudio(estudio.elementos),
            estudioMadre: sobre,
            derivedFromMessageIds: estudio.elementos
                .map((e) => e.mensajeId)
                .filter((id): id is string => !!id),
        });
        setPersisted(true);
        onRefetch?.();
        // En vez de saltar de golpe al borrador: confirmar el logro (verde) y dejar
        // que el docente decida cuándo abrir el borrador.
        setSuccessExtraction(extraction);
    };

    /**
     * Cristaliza: corre las puertas con las respuestas a testigos actuales. Si
     * queda en verde, persiste; si no, muestra el gate de resolución y NO cierra
     * (spec §2.4: "el sistema dice qué falta antes de dejar cerrar").
     */
    const cristalizar = async () => {
        if (estudio.elementos.length === 0) {
            toast.error(t('estudioMadre.needElements'));
            return;
        }
        if (!estudio.referencia.trim()) {
            toast.error(t('estudioMadre.needReference'));
            return;
        }
        const resolutions = Object.entries(estudio.respuestas)
            .map(([claimKey, response]) => ({ claimKey, response }))
            .filter((r) => r.response.trim().length > 0);
        const result = await validar({
            estudioId: sessionId,
            referencia: estudio.referencia.trim(),
            elementos: estudio.elementos,
            resolutions,
        });
        if (!result) {
            toast.error(t('estudioMadre.error'));
            return;
        }
        setResultado(result);
        setPersisted(false);
        if (result.estadoFidelidad === 'verde') {
            try {
                await persistir(result);
            } catch {
                toast.error(t('estudioMadre.error'));
            }
        }
    };

    const nuevoEstudio = () => {
        estudio.limpiar();
        setResultado(null);
        setPersisted(false);
    };

    const pendiente = !!resultado && resultado.estadoFidelidad !== 'verde';

    return (
        <div className="flex flex-col h-full">
            {resultado && (
                <div className="border-b border-border p-3 space-y-2">
                    <EstadoFidelidadBadge
                        estado={resultado.estadoFidelidad}
                        bloqueos={resultado.bloqueos}
                        autoriaPct={resultado.autoria.docentePct}
                    />
                    {persisted ? (
                        // Estudio cerrado en verde + guardado → arrancar otro.
                        <Button variant="outline" size="sm" onClick={nuevoEstudio} className="w-full">
                            {t('estudioMadre.newStudy')}
                        </Button>
                    ) : (
                        // En progreso: resolver, no descartar. Discreto, no primario.
                        <button
                            type="button"
                            onClick={nuevoEstudio}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            {t('estudioMadre.discard')}
                        </button>
                    )}
                </div>
            )}
            {estudio.elementos.length === 0 ? (
                <div className="p-4">
                    <p className="text-sm text-muted-foreground">{t('estudioMadre.panelEmpty')}</p>
                </div>
            ) : (
              <>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {estudio.elementos.map((e, i) => {
                    const respaldos = e.respaldoTestigos?.length ?? 0;
                    const necesitaRespaldo = esAfirmacionDePeso(e.tipo);
                    return (
                        <div key={e.id} className="rounded-lg border border-border p-2 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <select
                                    value={e.tipo}
                                    onChange={(ev) => estudio.cambiarTipo(e.id, ev.target.value as ElementoTipo)}
                                    className="text-xs rounded-md border border-border bg-background px-1.5 py-1 text-foreground"
                                >
                                    <optgroup label={t('estudioMadre.grupoBasicos')}>
                                        {TIPOS_BASICOS.map((tipo) => (
                                            <option key={tipo} value={tipo}>
                                                {t(`estudioMadre.tipos.${tipo}`)}
                                            </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label={t('estudioMadre.grupoAvanzados')}>
                                        {TIPOS_AVANZADOS.map((tipo) => (
                                            <option key={tipo} value={tipo}>
                                                {t(`estudioMadre.tipos.${tipo}`)}
                                            </option>
                                        ))}
                                    </optgroup>
                                </select>
                                <div className="ml-auto flex items-center gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => estudio.mover(e.id, 'up')}
                                        disabled={i === 0}
                                        title={t('estudioMadre.moveUp')}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30"
                                    >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => estudio.mover(e.id, 'down')}
                                        disabled={i === estudio.elementos.length - 1}
                                        title={t('estudioMadre.moveDown')}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30"
                                    >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => estudio.quitar(e.id)}
                                        title={t('estudioMadre.remove')}
                                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={e.contenido}
                                onChange={(ev) => estudio.cambiarContenido(e.id, ev.target.value)}
                                rows={3}
                                aria-label={t('estudioMadre.contentLabel')}
                                className="w-full text-sm rounded-md border border-border bg-background px-2 py-1.5 resize-y text-foreground"
                            />
                            {necesitaRespaldo && (
                                <RespaldoControl
                                    valido={respaldos >= MIN_RESPALDO_TESTIGOS}
                                    label={t('estudioMadre.support', { count: respaldos, min: MIN_RESPALDO_TESTIGOS })}
                                    testigos={estudio.testigos.map((tg) => ({ id: tg.id, contenido: tg.contenido }))}
                                    seleccionados={e.respaldoTestigos ?? []}
                                    onToggle={(testigoId) => {
                                        const actual = new Set(e.respaldoTestigos ?? []);
                                        if (actual.has(testigoId)) actual.delete(testigoId);
                                        else actual.add(testigoId);
                                        estudio.cambiarRespaldo(e.id, [...actual]);
                                    }}
                                    emptyLabel={t('estudioMadre.noWitnesses')}
                                    pickLabel={t('estudioMadre.supportPick')}
                                />
                            )}
                        </div>
                    );
                })}

                {resultado && resultado.estadoFidelidad !== 'verde' && resultado.testigos && (
                    <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-3">
                        <p className="text-sm font-medium text-foreground">{t('estudioMadre.witnessGateTitle')}</p>
                        {claimsBlockingAbsolutely(resultado.testigos).map((c) => (
                            <div key={c.key} className="space-y-1">
                                <p className="text-xs font-medium text-destructive">⚠ {c.text}</p>
                                {c.verdicts
                                    .filter((v) => v.dissents)
                                    .map((v, i) => (
                                        <p key={i} className="text-xs text-destructive">
                                            {v.reasoning}
                                        </p>
                                    ))}
                                <p className="text-xs text-muted-foreground">{t('estudioMadre.absoluteBlockHelp')}</p>
                            </div>
                        ))}
                        {claimsRequiringResponse(resultado.testigos).map((c) => {
                            const min =
                                c.escalation === 'hard-block'
                                    ? WITNESS_THRESHOLDS.hardBlockResponseMinChars
                                    : WITNESS_THRESHOLDS.softBlockResponseMinChars;
                            const val = estudio.respuestas[c.key] ?? '';
                            return (
                                <div key={c.key} className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">{c.text}</p>
                                    {c.verdicts
                                        .filter((v) => v.dissents)
                                        .map((v, i) => (
                                            <p key={i} className="text-xs text-warning">
                                                {v.reasoning}
                                            </p>
                                        ))}
                                    <textarea
                                        value={val}
                                        onChange={(ev) => estudio.cambiarRespuesta(c.key, ev.target.value)}
                                        rows={2}
                                        placeholder={t('estudioMadre.responsePlaceholder')}
                                        className="w-full text-sm rounded-md border border-border bg-background px-2 py-1.5 resize-y text-foreground"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        {val.trim().length}/{min}
                                    </span>
                                </div>
                            );
                        })}
                        {/* Acción en contexto: tras editar arriba o responder, revalidar
                            sin tener que bajar al pie del panel. */}
                        <Button onClick={cristalizar} disabled={loading} size="sm" className="w-full">
                            {loading ? t('estudioMadre.crystallizing') : t('estudioMadre.revalidate')}
                        </Button>
                    </div>
                )}
            </div>

            <div className="border-t border-border p-3 space-y-2">
                <input
                    value={estudio.referencia}
                    onChange={(ev) => estudio.cambiarReferencia(ev.target.value)}
                    placeholder={t('estudioMadre.referencePlaceholder')}
                    aria-label={t('estudioMadre.reference')}
                    className="w-full text-sm rounded-md border border-border bg-background px-2 py-1.5"
                />
                <input
                    value={estudio.titulo}
                    onChange={(ev) => estudio.cambiarTitulo(ev.target.value)}
                    placeholder={t('estudioMadre.titlePlaceholder')}
                    aria-label={t('estudioMadre.title')}
                    className="w-full text-sm rounded-md border border-border bg-background px-2 py-1.5"
                />
                <Button onClick={cristalizar} disabled={loading} className="w-full">
                    {loading
                        ? t('estudioMadre.crystallizing')
                        : pendiente
                            ? t('estudioMadre.revalidate')
                            : t('estudioMadre.crystallize')}
                </Button>
            </div>
              </>
            )}

            <Dialog open={!!successExtraction} onOpenChange={(o) => { if (!o) setSuccessExtraction(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            <span className="inline-flex items-center gap-2 rounded-md bg-success/10 text-success px-2.5 py-1">
                                <ShieldCheck className="w-4 h-4" />
                                {t('estudioMadre.successTitle')}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="pt-1">
                            {t('estudioMadre.successBody', { pct: resultado?.autoria.docentePct ?? 0 })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSuccessExtraction(null)}>
                            {t('estudioMadre.successStay')}
                        </Button>
                        <Button
                            onClick={() => {
                                if (successExtraction) onOpenBorrador?.(successExtraction);
                                setSuccessExtraction(null);
                            }}
                        >
                            {t('estudioMadre.successView')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RespaldoControl({
    valido,
    label,
    testigos,
    seleccionados,
    onToggle,
    emptyLabel,
    pickLabel,
}: {
    valido: boolean;
    label: string;
    testigos: { id: string; contenido: string }[];
    seleccionados: string[];
    onToggle: (id: string) => void;
    emptyLabel: string;
    pickLabel: string;
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'inline-flex items-center gap-1 text-xs rounded-md px-1.5 py-0.5 transition-colors',
                        valido ? 'text-success hover:bg-success/10' : 'text-warning hover:bg-warning/10',
                    )}
                >
                    {valido ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    {label}
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{pickLabel}</p>
                {testigos.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyLabel}</p>
                ) : (
                    testigos.map((tg) => {
                        const checked = seleccionados.includes(tg.id);
                        return (
                            <button
                                key={tg.id}
                                type="button"
                                onClick={() => onToggle(tg.id)}
                                className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent flex items-start gap-2"
                            >
                                <input type="checkbox" checked={checked} readOnly className="mt-1" />
                                <span className="line-clamp-2">{tg.contenido}</span>
                            </button>
                        );
                    })
                )}
            </PopoverContent>
        </Popover>
    );
}
