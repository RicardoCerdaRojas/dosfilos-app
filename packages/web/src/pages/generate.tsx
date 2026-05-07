import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function GeneratePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Generar Sermón</h2>
        <p className="text-muted-foreground">
          Crea sermones personalizados con tu asistente de redacción
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generador de Sermones</CardTitle>
          <CardDescription>
            Crea sermones personalizados a partir de tus pasajes y notas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-secondary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              El generador de sermones estará disponible próximamente
            </p>
            <Button disabled className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generar Sermón
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
