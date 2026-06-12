import { CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft, Loader2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TeachingPlan, ValidationResult } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';

interface PlanReviewProps {
  plan: TeachingPlan;
  validacion: ValidationResult;
  generando: boolean;
  creando: boolean;
  claseId: string | null;
  onReintentar: () => void;
  onVolver: () => void;
  onAprobar: () => void;
}

/** Etiqueta corta de una diapositiva para la lista de revisión. */
function etiquetaDiapo(d: Record<string, unknown>): string {
  return (
    (d.rotulo as string) ||
    (d.kicker as string) ||
    (d.titulo as string) ||
    (d.ref as string) ||
    (d.lema as string) ||
    ''
  );
}

export function PlanReview({
  plan,
  validacion,
  generando,
  creando,
  claseId,
  onReintentar,
  onVolver,
  onAprobar,
}: PlanReviewProps): JSX.Element {
  const navigate = useNavigate();

  if (claseId) {
    return (
      <div className="rounded-lg border border-success/30 bg-success-subtle p-6 text-center space-y-3">
        <Check className="w-8 h-8 text-success mx-auto" />
        <p className="text-sm text-success-subtle-foreground">
          Clase creada. Ya puedes abrir sus artefactos desde la lista.
        </p>
        <Button onClick={() => navigate('/dashboard/teaching-suite')}>Ir a mis clases</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cabecera del plan */}
      <div>
        <h2 className="text-lg font-semibold">{plan.titulo}</h2>
        <p className="text-xs text-muted-foreground">
          {[plan.serie, plan.genero, `${plan.diapositivas.length} diapositivas`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {/* Estado de validación */}
      {validacion.ok ? (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-subtle px-3 py-2 text-sm text-success-subtle-foreground">
          <CheckCircle2 className="w-4 h-4 text-success" />
          El plan cumple el contrato. Revísalo y apruébalo.
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

      {/* Bloques + minutos */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Bloques</h3>
        <ul className="space-y-1">
          {plan.bloques.map((b, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded border px-3 py-1.5 text-sm bg-background"
            >
              <span className="flex-1 truncate">{b.nombre}</span>
              <span className="text-xs text-muted-foreground">
                diap. {b.diapo_ini}–{b.diapo_fin}
              </span>
              <span className="text-xs font-medium">{b.min} min</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Diapositivas */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Diapositivas</h3>
        <ul className="space-y-1">
          {plan.diapositivas.map((d) => {
            const etq = etiquetaDiapo(d as unknown as Record<string, unknown>);
            return (
              <li
                key={d.n}
                className="flex items-center gap-3 rounded border px-3 py-1.5 text-sm bg-background"
              >
                <span className="w-6 text-right text-xs text-muted-foreground">{d.n}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{d.tipo}</span>
                <span className="flex-1 truncate text-muted-foreground">{etq}</span>
              </li>
            );
          })}
        </ul>
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
