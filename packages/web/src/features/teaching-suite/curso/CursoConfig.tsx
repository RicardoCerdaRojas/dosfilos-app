import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EstudioRow, BrandRow } from '../teachingSuiteService';
import type { GeneroSoportado } from '../useGenerarCurso';

const GENERO_OPCIONES: { value: GeneroSoportado; label: string }[] = [
  { value: 'exegesis', label: 'Exégesis (estudio de un pasaje)' },
  { value: 'doctrina', label: 'Doctrina (tema con varios pasajes)' },
];

interface CursoConfigProps {
  estudios: EstudioRow[];
  brands: BrandRow[];
  estudioId: string;
  setEstudioId: (v: string) => void;
  genero: GeneroSoportado;
  setGenero: (v: GeneroSoportado) => void;
  marcaId: string;
  setMarcaId: (v: string) => void;
  sesionesSugeridas: string;
  setSesionesSugeridas: (v: string) => void;
  proponiendo: boolean;
  onProponer: () => void;
}

const SELECT_CLS = 'w-full rounded-md border bg-background px-2 py-2 text-sm';

export function CursoConfig(props: CursoConfigProps): JSX.Element {
  const {
    estudios,
    brands,
    estudioId,
    setEstudioId,
    genero,
    setGenero,
    marcaId,
    setMarcaId,
    sesionesSugeridas,
    setSesionesSugeridas,
    proponiendo,
    onProponer,
  } = props;
  const puede = !!estudioId && !!marcaId && !proponiendo;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <label htmlFor="cs-estudio" className="text-sm font-medium">
          Estudio
        </label>
        {estudios.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aún no tienes estudios. Crea uno en el módulo de trabajo y vuelve aquí.
          </p>
        ) : (
          <select
            id="cs-estudio"
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
        <label htmlFor="cs-genero" className="text-sm font-medium">
          Tipo de clase
        </label>
        <select
          id="cs-genero"
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
        <label htmlFor="cs-marca" className="text-sm font-medium">
          Marca
        </label>
        {brands.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aún no hay marcas. Crea una o siembra la clase demo.
          </p>
        ) : (
          <select
            id="cs-marca"
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

      <div className="space-y-1">
        <label htmlFor="cs-n" className="text-sm font-medium">
          Número de sesiones <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <input
          id="cs-n"
          type="number"
          min={1}
          max={12}
          value={sesionesSugeridas}
          onChange={(e) => setSesionesSugeridas(e.target.value)}
          placeholder="Lo decide el asistente"
          className={`${SELECT_CLS} max-w-[220px]`}
        />
      </div>

      <Button onClick={onProponer} disabled={!puede}>
        {proponiendo ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {proponiendo ? 'Preparando el curso…' : 'Proponer curso'}
      </Button>
    </div>
  );
}
