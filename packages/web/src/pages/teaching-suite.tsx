import { Presentation, Plus, RefreshCw, FileText, MonitorPlay, ClipboardList } from 'lucide-react';
import type { Artefacto } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { useTeachingClases } from '@/features/teaching-suite/useTeachingClases';

const ARTEFACTO_META: Record<Artefacto, { label: string; Icon: typeof Presentation }> = {
  presentacion: { label: 'Presentación', Icon: Presentation },
  notas: { label: 'Notas', Icon: MonitorPlay },
  hoja: { label: 'Hoja', Icon: ClipboardList },
  guia_sesion: { label: 'Guía', Icon: FileText },
};

/**
 * Suite de Enseñanza — F1 (sin IA aún).
 * Lista las clases del usuario y permite sembrar una clase demo y abrir su
 * presentación (render client-side desde el plan; el HTML es un derivado
 * desechable, no se almacena).
 */
export function TeachingSuitePage(): JSX.Element {
  const { clases, loading, seeding, error, refresh, sembrarDemo, verArtefacto } =
    useTeachingClases();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-start gap-3">
        <Presentation className="w-6 h-6 text-primary mt-0.5" />
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Suite de Enseñanza</h1>
          <p className="text-sm text-muted-foreground">
            Genera los artefactos de una clase (presentación sincronizada, consola, hoja) desde su
            plan. La identidad visual la aporta la marca de la institución.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={() => void sembrarDemo()} disabled={seeding}>
          <Plus className="w-4 h-4 mr-2" />
          {seeding ? 'Sembrando…' : 'Sembrar clase demo'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Crea una clase de ejemplo (marca SEBEX) para probar el render.
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando clases…</p>
      ) : clases.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Aún no tienes clases. Siembra la clase demo para empezar.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {clases.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 bg-background"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {[c.serie, c.genero, c.estado].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.artefactos.map((a) => {
                  const meta = ARTEFACTO_META[a];
                  if (!meta) return null;
                  const { label, Icon } = meta;
                  return (
                    <Button
                      key={a}
                      size="sm"
                      variant="secondary"
                      onClick={() => void verArtefacto(c.planId, a)}
                      disabled={!c.planId}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {label}
                    </Button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
