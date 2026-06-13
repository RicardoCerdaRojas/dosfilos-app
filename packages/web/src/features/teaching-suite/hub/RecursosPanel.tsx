import { Palette, Pencil, Trash2, Recycle, Presentation, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BrandRow, CanvasComponentRow } from '../teachingSuiteService';

interface RecursosPanelProps {
  brands: BrandRow[];
  componentes: CanvasComponentRow[];
  onVerMarca: (marcaId: string) => void;
  onEditarMarca: (marcaId: string) => void;
  onEliminarMarca: (marca: BrandRow) => void;
  onCrearMarca: () => void;
  onEliminarLamina: (comp: CanvasComponentRow) => void;
}

/** Panel lateral del hub: recursos reutilizables (marcas + láminas guardadas). */
export function RecursosPanel({
  brands,
  componentes,
  onVerMarca,
  onEditarMarca,
  onEliminarMarca,
  onCrearMarca,
  onEliminarLamina,
}: RecursosPanelProps): JSX.Element {
  return (
    <aside className="space-y-6 lg:sticky lg:top-4">
      {/* Marcas */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Marcas</h2>
          </div>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCrearMarca} title="Crear marca">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {brands.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aún no hay marcas. Siembra la clase demo (trae SEBEX e Iglesia) o crea una.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {brands.map((b) => (
              <li
                key={b.id}
                className="group flex items-center gap-2 rounded-lg border px-2.5 py-2 bg-background"
              >
                <div className="flex gap-1 flex-shrink-0">
                  {['oscuro', 'acento', 'escritura'].map((t) => (
                    <span
                      key={t}
                      className="inline-block h-4 w-4 rounded border"
                      style={{ backgroundColor: b.tokens[t] }}
                      title={`${t}: ${b.tokens[t] ?? ''}`}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{b.nombre}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.source === 'user' ? 'creada por ti' : 'semilla'}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => onVerMarca(b.id)}
                    title="Vista previa"
                  >
                    <Presentation className="w-3.5 h-3.5" />
                  </Button>
                  {b.source === 'user' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onEditarMarca(b.id)}
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => onEliminarMarca(b)}
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Láminas guardadas (F4 «trinquete») */}
      {componentes.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Recycle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Láminas guardadas</h2>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Láminas de diseño libre que reutilizas. Insértalas al revisar el plan de una clase nueva.
          </p>
          <ul className="space-y-1.5">
            {componentes.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-lg border px-2.5 py-2 bg-background"
              >
                <Recycle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.nombre}</p>
                  {c.alt && <p className="text-[10px] text-muted-foreground truncate">{c.alt}</p>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onEliminarLamina(c)}
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
