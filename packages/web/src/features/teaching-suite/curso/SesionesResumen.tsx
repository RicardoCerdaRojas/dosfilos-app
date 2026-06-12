import { Loader2, CheckCircle2, AlertTriangle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { CursoPaso, SesionEstado } from '../useGenerarCurso';

interface SesionesResumenProps {
  paso: CursoPaso;
  serieNombre: string;
  sesiones: SesionEstado[];
  validas: number;
  creadas: number;
  creando: boolean;
  onCrearClases: () => void;
}

function EstadoBadge({ s }: { s: SesionEstado }): JSX.Element {
  if (s.claseId) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <Check className="w-3.5 h-3.5" /> creada
      </span>
    );
  }
  if (s.estado === 'generando') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> generando…
      </span>
    );
  }
  if (s.estado === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <AlertTriangle className="w-3.5 h-3.5" /> error
      </span>
    );
  }
  if (s.validacion?.ok) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <CheckCircle2 className="w-3.5 h-3.5" /> lista
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-destructive">
      <AlertTriangle className="w-3.5 h-3.5" /> necesita ajustes
    </span>
  );
}

export function SesionesResumen({
  paso,
  serieNombre,
  sesiones,
  validas,
  creadas,
  creando,
  onCrearClases,
}: SesionesResumenProps): JSX.Element {
  const navigate = useNavigate();
  const todasCreadas = creadas > 0 && creadas === validas;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{serieNombre}</h2>
        <p className="text-xs text-muted-foreground">
          {paso === 'generando'
            ? `Generando ${sesiones.length} sesiones…`
            : `${validas} de ${sesiones.length} sesiones listas`}
        </p>
      </div>

      <ul className="space-y-2">
        {sesiones.map((s, i) => (
          <li key={i} className="rounded-lg border px-4 py-3 bg-background space-y-1">
            <div className="flex items-center gap-3">
              <span className="w-6 text-xs text-muted-foreground text-right">{i + 1}</span>
              <span className="flex-1 truncate font-medium">{s.plan?.titulo ?? s.titulo}</span>
              <EstadoBadge s={s} />
            </div>
            {s.plan && (
              <p className="text-xs text-muted-foreground pl-9">
                {s.plan.diapositivas.length} diapositivas · {s.plan.bloques.length} bloques
              </p>
            )}
            {s.estado === 'error' && s.error && (
              <p className="text-xs text-destructive pl-9">{s.error}</p>
            )}
            {s.validacion && !s.validacion.ok && (
              <p className="text-xs text-destructive pl-9">
                {s.validacion.errores.length} error(es) de validación
              </p>
            )}
          </li>
        ))}
      </ul>

      {paso === 'resumen' && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {todasCreadas ? (
            <Button onClick={() => navigate('/dashboard/teaching-suite')}>Ir a mis clases</Button>
          ) : (
            <Button onClick={onCrearClases} disabled={creando || validas === 0}>
              {creando ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {creando ? 'Creando…' : `Crear ${validas} clase(s)`}
            </Button>
          )}
          {creadas > 0 && (
            <span className="text-xs text-muted-foreground">{creadas} clase(s) creada(s)</span>
          )}
        </div>
      )}
    </div>
  );
}
