import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGenerarPlan } from '@/features/teaching-suite/useGenerarPlan';
import { ConfigForm } from '@/features/teaching-suite/generar/ConfigForm';
import { PlanReview } from '@/features/teaching-suite/generar/PlanReview';

/**
 * Suite de Enseñanza — F3 (Slice A): generar una clase desde un estudio.
 *
 * Elige estudio → tipo de clase → marca → «Proponer plan». El asistente redacta
 * el plan; la pantalla de revisión es el control editorial (bloques, minutos,
 * diapositivas, estado de validación). Aprobar crea la clase; el render de los
 * artefactos ya existe (doc-driven por marca).
 */
export function TeachingSuiteGenerarPage(): JSX.Element {
  const navigate = useNavigate();
  const g = useGenerarPlan();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-start gap-3">
        <Sparkles className="w-6 h-6 text-primary mt-0.5" />
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Generar clase desde un estudio</h1>
          <p className="text-sm text-muted-foreground">
            El asistente propone el plan de la clase a partir de tu estudio. Tú revisas y apruebas
            antes de generar los artefactos.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/teaching-suite')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </header>

      {g.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {g.error}
        </div>
      )}

      {g.loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : g.paso === 'config' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configura la clase</CardTitle>
          </CardHeader>
          <CardContent>
            <ConfigForm
              estudios={g.estudios}
              brands={g.brands}
              estudioId={g.estudioId}
              setEstudioId={g.setEstudioId}
              genero={g.genero}
              setGenero={g.setGenero}
              modalidad={g.modalidad}
              setModalidad={g.setModalidad}
              marcaId={g.marcaId}
              setMarcaId={g.setMarcaId}
              generando={g.generando}
              onProponer={() => void g.proponer()}
            />
          </CardContent>
        </Card>
      ) : g.generando || !g.plan || !g.validacion ? (
        <div className="rounded-lg border border-dashed p-10 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
          <p className="text-sm text-muted-foreground">
            {g.intento > 0
              ? `Corrigiendo el plan (intento ${g.intento + 1})…`
              : 'Preparando el plan de la clase. Esto puede tardar un momento; puedes dejar la pestaña abierta.'}
          </p>
        </div>
      ) : (
        <PlanReview
          plan={g.plan}
          validacion={g.validacion}
          generando={g.generando}
          creando={g.creando}
          claseId={g.claseId}
          canvasCandidatas={g.canvasCandidatas}
          componentes={g.componentes}
          promoviendo={g.promoviendo}
          onReintentar={g.reintentar}
          onVolver={g.volverAConfig}
          onAprobar={() => void g.aprobar()}
          onEditar={g.editarPlan}
          onPromover={(fp, nombre) => void g.promover(fp, nombre)}
          onInsertarLamina={g.insertarLamina}
        />
      )}
    </div>
  );
}
