import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronUp, ChevronDown, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { facultyService } from '@dosfilos/application';
import {
    aplicarVerificacionCitasMvp,
    esAfirmacionDePeso,
    serializarEstudio,
    MIN_RESPALDO_TESTIGOS,
    type ElementoTipo,
    type EstudioMadre,
    type Extraction,
} from '@dosfilos/domain';
import { useEstudioEnConstruccion } from '@/features/estudio-madre/useEstudioEnConstruccion';
import { useValidarEstudioMadre } from '@/hooks/useValidarEstudioMadre';
import { EstadoFidelidadBadge } from './EstadoFidelidadBadge';

const TIPOS_FORMATIVOS: ElementoTipo[] = [
    'idea_central',
    'observacion',
    'testigo',
    'testigo_historico',
    'error_confrontado',
    'aplicacion',
];

interface UltimoResultado {
    estado: EstudioMadre['estadoFidelidad'];
    bloqueos: string[];
    autoriaPct: number;
}

export function EstudioEnConstruccionPanel({
    sessionId,
    userId,
    onCreated,
}: {
    sessionId: string;
    userId: string;
    onCreated?: (extraction: Extraction) => void;
}) {
    const { t } = useTranslation('faculty');
    const estudio = useEstudioEnConstruccion(sessionId);
    const { validar, loading } = useValidarEstudioMadre();
    const [ultimo, setUltimo] = useState<UltimoResultado | null>(null);

    const cristalizar = async () => {
        if (estudio.elementos.length === 0) {
            toast.error(t('estudioMadre.needElements'));
            return;
        }
        if (!estudio.referencia.trim()) {
            toast.error(t('estudioMadre.needReference'));
            return;
        }
        const result = await validar({
            estudioId: sessionId,
            referencia: estudio.referencia.trim(),
            elementos: estudio.elementos,
        });
        if (!result) {
            toast.error(t('estudioMadre.error'));
            return;
        }
        // El sobre persiste elementos con la puerta 4 ya aplicada (sin mensajeId,
        // que es solo metadato del borrador).
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
        try {
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
            setUltimo({
                estado: result.estadoFidelidad,
                bloqueos: result.bloqueos,
                autoriaPct: result.autoria.docentePct,
            });
            // No se limpia el borrador: el docente ve qué construyó + el resultado,
            // e itera o arranca uno nuevo con "Nuevo estudio".
            toast.success(t('estudioMadre.created'), {
                action: { label: t('estudioMadre.view'), onClick: () => onCreated?.(extraction) },
            });
            onCreated?.(extraction);
        } catch {
            toast.error(t('estudioMadre.error'));
        }
    };

    return (
        <div className="flex flex-col h-full">
            {ultimo && (
                <div className="border-b border-border p-3 space-y-2">
                    <EstadoFidelidadBadge estado={ultimo.estado} bloqueos={ultimo.bloqueos} autoriaPct={ultimo.autoriaPct} />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            estudio.limpiar();
                            setUltimo(null);
                        }}
                        className="w-full"
                    >
                        {t('estudioMadre.newStudy')}
                    </Button>
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
                                    {TIPOS_FORMATIVOS.map((tipo) => (
                                        <option key={tipo} value={tipo}>
                                            {t(`estudioMadre.tipos.${tipo}`)}
                                        </option>
                                    ))}
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
                    {loading ? t('estudioMadre.crystallizing') : t('estudioMadre.crystallize')}
                </Button>
            </div>
              </>
            )}
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
