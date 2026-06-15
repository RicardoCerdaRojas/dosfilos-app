import { CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft, Loader2, Check, Recycle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TeachingPlan, ValidationResult } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CanvasCandidata, CanvasComponentRow } from '../teachingSuiteService';

interface PlanReviewProps {
  plan: TeachingPlan;
  validacion: ValidationResult;
  generando: boolean;
  creando: boolean;
  claseId: string | null;
  canvasCandidatas?: CanvasCandidata[];
  componentes?: CanvasComponentRow[];
  promoviendo?: string | null;
  onReintentar: () => void;
  onVolver: () => void;
  onAprobar: () => void;
  onEditar: (updater: (p: TeachingPlan) => TeachingPlan) => void;
  onPromover?: (fingerprint: string, nombre: string) => void;
  onInsertarLamina?: (comp: CanvasComponentRow) => void;
}

const INPUT = 'rounded-md border bg-background px-2 py-1 text-sm';

/** Etiqueta legible de una diapositiva (para entender qué es, sin abrir el artefacto). */
function vistaPreviaDiapo(d: Record<string, unknown>): string {
  const texto = (d.texto as string) ?? '';
  return (
    (d.titulo as string) ||
    (d.ref as string) ||
    (d.lema as string) ||
    (d.error as string) ||
    (d.rotulo as string) ||
    (d.kicker as string) ||
    (texto ? texto.slice(0, 80) : '') ||
    '—'
  );
}

export function PlanReview({
  plan,
  validacion,
  generando,
  creando,
  claseId,
  canvasCandidatas = [],
  componentes = [],
  promoviendo = null,
  onReintentar,
  onVolver,
  onAprobar,
  onEditar,
  onPromover,
  onInsertarLamina,
}: PlanReviewProps): JSX.Element {
  const navigate = useNavigate();

  if (claseId) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-success/30 bg-success-subtle p-6 text-center space-y-3">
          <Check className="w-8 h-8 text-success mx-auto" />
          <p className="text-sm text-success-subtle-foreground">
            Clase creada. Ya puedes abrir sus artefactos desde la lista.
          </p>
          <Button onClick={() => navigate('/dashboard/teaching-suite')}>Ir a mis clases</Button>
        </div>

        {canvasCandidatas.length > 0 && (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm space-y-1.5">
            <div className="flex items-center gap-2 font-medium text-primary">
              <Recycle className="w-4 h-4" />
              {canvasCandidatas.length === 1
                ? 'Reutilizas una lámina de diseño libre'
                : `Reutilizas ${canvasCandidatas.length} láminas de diseño libre`}
            </div>
            <p className="text-muted-foreground">
              Esta{canvasCandidatas.length === 1 ? '' : 's'} lámina
              {canvasCandidatas.length === 1 ? '' : 's'} ya aparece
              {canvasCandidatas.length === 1 ? '' : 'n'} en otra clase tuya. Considera convertirla
              {canvasCandidatas.length === 1 ? '' : 's'} en un componente reutilizable para mantener
              un diseño consistente.
            </p>
            <ul className="space-y-1.5 pt-1">
              {canvasCandidatas.map((c) => {
                const etiqueta = c.titulo || c.alt || 'Lámina de diseño libre';
                const yaGuardada = componentes.some((comp) => comp.fingerprint === c.fingerprint);
                return (
                  <li key={c.fingerprint} className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 truncate text-muted-foreground">
                      {etiqueta} <span className="text-xs opacity-70">· usada en {c.vecesUsada} clases</span>
                    </span>
                    {yaGuardada ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <Check className="w-3.5 h-3.5" /> Guardada
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!onPromover || promoviendo === c.fingerprint}
                        onClick={() => {
                          const nombre = window.prompt(
                            'Nombre para guardar esta lámina en tu biblioteca:',
                            etiqueta,
                          );
                          if (nombre?.trim()) onPromover?.(c.fingerprint, nombre.trim());
                        }}
                      >
                        {promoviendo === c.fingerprint ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Recycle className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Guardar para reusar
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const setBloque = (i: number, patch: Partial<{ nombre: string; min: number }>) =>
    onEditar((p) => ({ ...p, bloques: p.bloques.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));

  return (
    <div className="space-y-5">
      {/* Cabecera editable */}
      <div className="space-y-2">
        <input
          value={plan.titulo}
          onChange={(e) => onEditar((p) => ({ ...p, titulo: e.target.value }))}
          className={`${INPUT} w-full text-lg font-semibold`}
          aria-label="Título de la clase"
        />
        <div className="flex items-center gap-2">
          <input
            value={plan.serie ?? ''}
            onChange={(e) => onEditar((p) => ({ ...p, serie: e.target.value || undefined }))}
            placeholder="Serie (opcional)"
            className={`${INPUT} flex-1`}
            aria-label="Serie"
          />
          <Badge variant="secondary" className="whitespace-nowrap capitalize">
            {plan.genero}
          </Badge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {plan.diapositivas.length} diapositivas
          </span>
        </div>
      </div>

      {/* Estado de validación */}
      {validacion.ok ? (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-subtle px-3 py-2 text-sm text-success-subtle-foreground">
          <CheckCircle2 className="w-4 h-4 text-success" />
          El plan cumple el contrato. Revísalo, ajústalo y apruébalo.
        </div>
      ) : (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle className="w-4 h-4" />
            El plan necesita ajustes ({validacion.errores.length})
          </div>
          <ul className="mt-1 list-disc pl-6 text-destructive/90 space-y-0.5">
            {validacion.errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {validacion.avisos.length > 0 && (
        <div className="rounded-md border border-warning/30 bg-warning-subtle px-3 py-2 text-sm text-warning-subtle-foreground">
          <ul className="list-disc pl-6 space-y-0.5">
            {validacion.avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Objetivos derivados del estudio (Gap 1). Read-only: salen de los
          elementos que el docente cristalizó, no se editan aquí. */}
      {plan.objetivos &&
        (plan.objetivos.saber.length > 0 ||
          plan.objetivos.sentir.length > 0 ||
          plan.objetivos.hacer.length > 0) && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Objetivos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { label: 'Saber', items: plan.objetivos.saber },
              { label: 'Sentir', items: plan.objetivos.sentir },
              { label: 'Hacer', items: plan.objetivos.hacer },
            ] as { label: string; items: string[] }[]).map((dim) => (
              <div key={dim.label} className="rounded-md border border-border bg-card p-2">
                <p className="text-xs font-semibold text-foreground mb-1">{dim.label}</p>
                {dim.items.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-0.5 text-xs text-muted-foreground">
                    {dim.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground/60 italic">—</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bloques + minutos (editables) */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Bloques</h3>
        <ul className="space-y-1">
          {plan.bloques.map((b, i) => (
            <li key={i} className="flex items-center gap-2 rounded border px-3 py-1.5 bg-background">
              <input
                value={b.nombre}
                onChange={(e) => setBloque(i, { nombre: e.target.value })}
                className={`${INPUT} flex-1`}
                aria-label={`Nombre del bloque ${i + 1}`}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                diap. {b.diapo_ini}–{b.diapo_fin}
              </span>
              <input
                type="number"
                min={1}
                value={b.min}
                onChange={(e) => setBloque(i, { min: Number(e.target.value) || 0 })}
                className={`${INPUT} w-16`}
                aria-label={`Minutos del bloque ${i + 1}`}
              />
              <span className="text-xs text-muted-foreground">min</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Diapositivas (vista previa — el contenido completo va en los artefactos) */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Diapositivas</h3>
        <p className="text-xs text-muted-foreground">
          Vista general del plan. El contenido completo de cada lámina se ve en los artefactos
          (presentación, notas, hoja) al aprobar.
        </p>
        <ul className="space-y-1">
          {plan.diapositivas.map((d) => (
            <li key={d.n} className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm bg-background">
              <span className="w-6 text-right text-xs text-muted-foreground">{d.n}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{d.tipo}</Badge>
              <span className="flex-1 truncate">
                {vistaPreviaDiapo(d as unknown as Record<string, unknown>)}
              </span>
            </li>
          ))}
        </ul>

        {/* Insertar una lámina de diseño libre guardada (F4 «trinquete»). */}
        {onInsertarLamina && componentes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Plus className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Insertar lámina guardada:</span>
            <select
              className={INPUT}
              aria-label="Insertar lámina guardada"
              value=""
              onChange={(e) => {
                const comp = componentes.find((c) => c.id === e.target.value);
                if (comp) onInsertarLamina(comp);
                e.currentTarget.value = '';
              }}
            >
              <option value="">Elige una lámina…</option>
              {componentes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button onClick={onAprobar} disabled={!validacion.ok || creando}>
          {creando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          {creando ? 'Creando…' : 'Aprobar y crear clase'}
        </Button>
        <Button variant="outline" onClick={onReintentar} disabled={generando || creando}>
          <RefreshCw className={`w-4 h-4 mr-2 ${generando ? 'animate-spin' : ''}`} />
          {validacion.ok ? 'Proponer otra versión' : 'Reintentar'}
        </Button>
        <Button variant="ghost" onClick={onVolver} disabled={generando || creando}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cambiar estudio
        </Button>
      </div>
    </div>
  );
}
