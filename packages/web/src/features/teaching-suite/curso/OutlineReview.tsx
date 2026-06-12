import { Plus, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SesionOutline } from '../teachingSuiteService';

interface OutlineReviewProps {
  serieNombre: string;
  setSerieNombre: (v: string) => void;
  outline: SesionOutline[];
  setOutline: (v: SesionOutline[]) => void;
  onGenerar: () => void;
  onVolver: () => void;
}

const INPUT_CLS = 'w-full rounded-md border bg-background px-2 py-1.5 text-sm';

export function OutlineReview({
  serieNombre,
  setSerieNombre,
  outline,
  setOutline,
  onGenerar,
  onVolver,
}: OutlineReviewProps): JSX.Element {
  const update = (i: number, patch: Partial<SesionOutline>) =>
    setOutline(outline.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => setOutline(outline.filter((_, j) => j !== i));
  const add = () =>
    setOutline([...outline, { titulo: `Sesión ${outline.length + 1}`, alcance: '', min: 45 }]);

  const puede = outline.length > 0 && outline.every((s) => s.alcance.trim()) && serieNombre.trim();

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <label htmlFor="cs-serie" className="text-sm font-medium">
          Nombre del curso (serie)
        </label>
        <input
          id="cs-serie"
          value={serieNombre}
          onChange={(e) => setSerieNombre(e.target.value)}
          className={`${INPUT_CLS} max-w-md`}
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">
          Sesiones ({outline.length}){' '}
          <span className="font-normal text-muted-foreground">— ajusta antes de generar</span>
        </p>
        {outline.map((s, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2 bg-background">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
              <input
                value={s.titulo}
                onChange={(e) => update(i, { titulo: e.target.value })}
                placeholder="Título de la sesión"
                className={`${INPUT_CLS} flex-1`}
              />
              <input
                type="number"
                min={10}
                max={120}
                value={s.min}
                onChange={(e) => update(i, { min: Number(e.target.value) || 45 })}
                className={`${INPUT_CLS} w-20`}
                title="Minutos"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(i)}
                title="Quitar sesión"
                disabled={outline.length <= 1}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
            <textarea
              value={s.alcance}
              onChange={(e) => update(i, { alcance: e.target.value })}
              placeholder="Alcance: qué parte/subtema del estudio cubre esta sesión"
              rows={2}
              className={`${INPUT_CLS} resize-y`}
            />
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar sesión
        </Button>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={onGenerar} disabled={!puede}>
          <Sparkles className="w-4 h-4 mr-2" />
          Generar curso ({outline.length})
        </Button>
        <Button variant="ghost" onClick={onVolver}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cambiar estudio
        </Button>
      </div>
    </div>
  );
}
