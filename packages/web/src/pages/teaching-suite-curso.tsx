import { useNavigate } from 'react-router-dom';
import { Library, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGenerarCurso } from '@/features/teaching-suite/useGenerarCurso';
import { CursoConfig } from '@/features/teaching-suite/curso/CursoConfig';
import { OutlineReview } from '@/features/teaching-suite/curso/OutlineReview';
import { SesionesResumen } from '@/features/teaching-suite/curso/SesionesResumen';

/**
 * Suite de Enseñanza — F3 (Eje 2): generar un CURSO de varias sesiones.
 *
 * Estudio → outline de N sesiones (editable) → genera cada sesión como job
 * (reusa Slice B) → resumen con validación por sesión → crear las clases válidas
 * bajo una misma serie. Cada sesión es una clase acotada (~45 min).
 */
export function TeachingSuiteCursoPage(): JSX.Element {
  const navigate = useNavigate();
  const c = useGenerarCurso();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-start gap-3">
        <Library className="w-6 h-6 text-primary mt-0.5" />
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Generar curso desde un estudio</h1>
          <p className="text-sm text-muted-foreground">
            El asistente divide tu estudio en sesiones de ~45 min. Revisas el esquema, generas y
            apruebas; cada sesión queda como una clase de la serie.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/teaching-suite')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </header>

      {c.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {c.error}
        </div>
      )}

      {c.loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : c.paso === 'config' ? (
        <CursoConfig
          estudios={c.estudios}
          brands={c.brands}
          estudioId={c.estudioId}
          setEstudioId={c.setEstudioId}
          genero={c.genero}
          setGenero={c.setGenero}
          marcaId={c.marcaId}
          setMarcaId={c.setMarcaId}
          sesionesSugeridas={c.sesionesSugeridas}
          setSesionesSugeridas={c.setSesionesSugeridas}
          proponiendo={c.proponiendo}
          onProponer={() => void c.proponerOutline()}
        />
      ) : c.paso === 'outline' ? (
        <OutlineReview
          serieNombre={c.serieNombre}
          setSerieNombre={c.setSerieNombre}
          outline={c.outline}
          setOutline={c.setOutline}
          onGenerar={() => void c.generarCurso()}
          onVolver={c.volverAConfig}
        />
      ) : (
        <SesionesResumen
          paso={c.paso}
          serieNombre={c.serieNombre}
          sesiones={c.sesiones}
          validas={c.validas}
          creadas={c.creadas}
          creando={c.creando}
          onCrearClases={() => void c.crearClases()}
        />
      )}
    </div>
  );
}
