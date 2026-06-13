import { useNavigate } from 'react-router-dom';
import { Presentation, Plus, RefreshCw, FileText, Sparkles, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTeachingClases } from '@/features/teaching-suite/useTeachingClases';
import { ClasesPanel } from '@/features/teaching-suite/hub/ClasesPanel';
import { RecursosPanel } from '@/features/teaching-suite/hub/RecursosPanel';

/**
 * Suite de Enseñanza — hub del docente. Adopta el shell del sistema (contenedor
 * ancho `max-w-7xl` + header editorial, como Biblioteca/Exégesis) con un layout
 * de dos paneles: izquierda las clases por curso (grid de cards), derecha los
 * recursos reutilizables (marcas + láminas). El render de los artefactos es
 * client-side desde el plan; el HTML es un derivado desechable, no se almacena.
 */
export function TeachingSuitePage(): JSX.Element {
  const navigate = useNavigate();
  const {
    clases,
    brands,
    componentes,
    loading,
    seeding,
    error,
    refresh,
    sembrarDemo,
    verArtefacto,
    verMarca,
    eliminarMarca,
    eliminarLamina,
  } = useTeachingClases();

  const go = (ruta: string) => navigate(`/dashboard/teaching-suite${ruta}`);

  const meta = [
    `${clases.length} ${clases.length === 1 ? 'clase' : 'clases'}`,
    `${brands.length} ${brands.length === 1 ? 'marca' : 'marcas'}`,
  ].join(' · ');

  return (
    <div className="w-full max-w-7xl mx-auto px-6 lg:px-10 py-5 lg:py-6 space-y-6">
      {/* Header editorial (idioma del sistema) */}
      <div className="pb-3 border-b border-border/60 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-medium text-primary">
          <Presentation className="h-3 w-3" />
          <span>Tu entorno · Suite de Enseñanza</span>
        </div>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-3">
            <h1 className="font-reading text-[24px] md:text-[28px] leading-tight tracking-[-0.01em] text-foreground">
              Suite de Enseñanza
            </h1>
            <p className="text-[13px] leading-snug text-muted-foreground">{meta}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => go('/generar')}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generar clase
            </Button>
            <Button size="sm" variant="outline" onClick={() => go('/curso')}>
              <Library className="w-4 h-4 mr-2" />
              Generar curso
            </Button>
            <Button size="icon" variant="ghost" onClick={() => void refresh()} disabled={loading} title="Actualizar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Panel principal — clases */}
        <main className="min-w-0 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando clases…</p>
          ) : clases.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center space-y-3">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Aún no tienes clases. Genera una desde un estudio o siembra la clase de ejemplo.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={() => go('/generar')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generar clase
                </Button>
                <Button variant="outline" onClick={() => void sembrarDemo()} disabled={seeding}>
                  <Plus className="w-4 h-4 mr-2" />
                  {seeding ? 'Sembrando…' : 'Sembrar clase demo'}
                </Button>
              </div>
            </div>
          ) : (
            <ClasesPanel clases={clases} onVerArtefacto={verArtefacto} />
          )}
        </main>

        {/* Panel lateral — recursos */}
        <RecursosPanel
          brands={brands}
          componentes={componentes}
          onVerMarca={verMarca}
          onEditarMarca={(id) => go(`/marca/${id}`)}
          onCrearMarca={() => go('/marca')}
          onEliminarMarca={(b) => {
            if (window.confirm(`¿Eliminar la marca «${b.nombre}»?`)) void eliminarMarca(b.id);
          }}
          onEliminarLamina={(c) => {
            if (window.confirm(`¿Eliminar la lámina guardada «${c.nombre}»?`)) void eliminarLamina(c.id);
          }}
        />
      </div>
    </div>
  );
}
