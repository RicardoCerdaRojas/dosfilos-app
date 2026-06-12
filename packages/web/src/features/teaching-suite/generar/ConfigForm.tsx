import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EstudioRow, BrandRow } from '../teachingSuiteService';
import type { GeneroSoportado } from '../useGenerarPlan';

const GENERO_OPCIONES: { value: GeneroSoportado; label: string }[] = [
  { value: 'exegesis', label: 'Exégesis (estudio de un pasaje)' },
  { value: 'doctrina', label: 'Doctrina (tema con varios pasajes)' },
];

interface ConfigFormProps {
  estudios: EstudioRow[];
  brands: BrandRow[];
  estudioId: string;
  setEstudioId: (v: string) => void;
  genero: GeneroSoportado;
  setGenero: (v: GeneroSoportado) => void;
  marcaId: string;
  setMarcaId: (v: string) => void;
  generando: boolean;
  onProponer: () => void;
}

const SELECT_CLS = 'w-full rounded-md border bg-background px-2 py-2 text-sm';

export function ConfigForm({
  estudios,
  brands,
  estudioId,
  setEstudioId,
  genero,
  setGenero,
  marcaId,
  setMarcaId,
  generando,
  onProponer,
}: ConfigFormProps): JSX.Element {
  const sinEstudios = estudios.length === 0;
  const sinMarcas = brands.length === 0;
  const puede = !!estudioId && !!marcaId && !generando;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <label htmlFor="ts-estudio" className="text-sm font-medium">
          Estudio
        </label>
        {sinEstudios ? (
          <p className="text-xs text-muted-foreground">
            Aún no tienes estudios. Crea uno en el módulo de trabajo y vuelve aquí.
          </p>
        ) : (
          <select
            id="ts-estudio"
            value={estudioId}
            onChange={(e) => setEstudioId(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Elige un estudio…</option>
            {estudios.map((e) => (
              <option key={e.id} value={e.id}>
                {e.titulo}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="ts-genero" className="text-sm font-medium">
          Tipo de clase
        </label>
        <select
          id="ts-genero"
          value={genero}
          onChange={(e) => setGenero(e.target.value as GeneroSoportado)}
          className={SELECT_CLS}
        >
          {GENERO_OPCIONES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="ts-marca" className="text-sm font-medium">
          Marca
        </label>
        {sinMarcas ? (
          <p className="text-xs text-muted-foreground">
            Aún no hay marcas. Crea una marca o siembra la clase demo (trae SEBEX e Iglesia).
          </p>
        ) : (
          <select
            id="ts-marca"
            value={marcaId}
            onChange={(e) => setMarcaId(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Elige una marca…</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre} {b.source === 'user' ? '(tuya)' : '(semilla)'}
              </option>
            ))}
          </select>
        )}
      </div>

      <Button onClick={onProponer} disabled={!puede}>
        {generando ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {generando ? 'Preparando el plan…' : 'Proponer plan'}
      </Button>
    </div>
  );
}
