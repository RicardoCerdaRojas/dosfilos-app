import { useNavigate } from 'react-router-dom';
import { Presentation, Plus, RefreshCw, FileText, MonitorPlay, ClipboardList, Palette, Pencil, Trash2 } from 'lucide-react';
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
  const navigate = useNavigate();
  const {
    clases,
    brands,
    loading,
    seeding,
    error,
    refresh,
    sembrarDemo,
    verArtefacto,
    verMarca,
    eliminarMarca,
  } = useTeachingClases();

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/teaching-suite/marca')}
          >
            <Palette className="w-4 h-4 mr-2" />
            Crear marca
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
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
                      onClick={() => void verArtefacto(c, a)}
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

      {/* Marcas */}
      <section className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Marcas</h2>
        </div>
        {brands.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aún no hay marcas. Siembra la clase demo (trae SEBEX e Iglesia) o crea una marca nueva.
          </p>
        ) : (
          <ul className="space-y-2">
            {brands.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-lg border px-4 py-2.5 bg-background"
              >
                <div className="flex gap-1">
                  {['oscuro', 'acento', 'escritura'].map((t) => (
                    <span
                      key={t}
                      className="inline-block h-5 w-5 rounded border"
                      style={{ backgroundColor: b.tokens[t] }}
                      title={`${t}: ${b.tokens[t] ?? ''}`}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{b.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.source === 'user' ? 'creada por ti' : 'semilla'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="secondary" onClick={() => void verMarca(b.id)}>
                    <Presentation className="w-4 h-4 mr-2" />
                    Vista previa
                  </Button>
                  {b.source === 'user' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/dashboard/teaching-suite/marca/${b.id}`)}
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar la marca «${b.nombre}»?`)) void eliminarMarca(b.id);
                    }}
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
