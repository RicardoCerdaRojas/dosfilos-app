import { useState } from 'react';
import {
  Presentation,
  MonitorPlay,
  ClipboardList,
  FileText,
  ChevronDown,
  Library,
} from 'lucide-react';
import type { Artefacto } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { TeachingClaseRow } from '../teachingSuiteService';
import { agruparPorSerie } from './agrupar';

const ARTEFACTO_META: Record<Artefacto, { label: string; Icon: typeof Presentation }> = {
  presentacion: { label: 'Presentación', Icon: Presentation },
  notas: { label: 'Notas', Icon: MonitorPlay },
  hoja: { label: 'Hoja', Icon: ClipboardList },
  guia_sesion: { label: 'Guía', Icon: FileText },
};

const GENERO_LABEL: Record<string, string> = {
  exegesis: 'Exégesis',
  doctrina: 'Doctrina',
  consejeria: 'Consejería',
};

const ESTADO_BADGE: Record<string, { label: string; variant: 'success' | 'secondary' | 'info' }> = {
  aprobado: { label: 'Aprobado', variant: 'success' },
  generado: { label: 'Generado', variant: 'info' },
  borrador: { label: 'Borrador', variant: 'secondary' },
};

interface ClasesPanelProps {
  clases: TeachingClaseRow[];
  onVerArtefacto: (clase: TeachingClaseRow, artefacto: Artefacto) => void;
}

function ClaseCard({
  clase,
  conOrden,
  onVerArtefacto,
}: {
  clase: TeachingClaseRow;
  conOrden: boolean;
  onVerArtefacto: ClasesPanelProps['onVerArtefacto'];
}): JSX.Element {
  const estado = ESTADO_BADGE[clase.estado] ?? { label: clase.estado, variant: 'secondary' as const };
  return (
    <Card className="gap-2 py-4 px-4">
      <div className="flex items-start gap-2">
        {conOrden && clase.orden != null && (
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-xs font-medium flex items-center justify-center text-muted-foreground">
            {clase.orden}
          </span>
        )}
        <p className="font-medium text-sm leading-snug flex-1 min-w-0">{clase.titulo}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {GENERO_LABEL[clase.genero] && (
          <span className="text-xs text-muted-foreground">{GENERO_LABEL[clase.genero]}</span>
        )}
        <Badge variant={estado.variant} className="text-[10px] px-1.5 py-0">
          {estado.label}
        </Badge>
      </div>
      <div className="flex items-center gap-1 pt-1 border-t mt-1">
        {clase.artefactos.map((a) => {
          const meta = ARTEFACTO_META[a];
          if (!meta) return null;
          const { label, Icon } = meta;
          return (
            <Button
              key={a}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onVerArtefacto(clase, a)}
              disabled={!clase.planId}
              title={`Abrir ${label}`}
            >
              <Icon className="w-4 h-4" />
              <span className="sr-only">{label}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}

function CursoGroup({
  serie,
  clases,
  onVerArtefacto,
}: {
  serie: string | null;
  clases: TeachingClaseRow[];
  onVerArtefacto: ClasesPanelProps['onVerArtefacto'];
}): JSX.Element {
  const [abierto, setAbierto] = useState(true);
  const grid = 'grid gap-3 sm:grid-cols-2 2xl:grid-cols-3';

  // Las clases sueltas (sin serie) no necesitan cabecera de curso.
  if (!serie) {
    return (
      <div className={grid}>
        {clases.map((c) => (
          <ClaseCard key={c.id} clase={c} conOrden={false} onVerArtefacto={onVerArtefacto} />
        ))}
      </div>
    );
  }

  return (
    <Collapsible open={abierto} onOpenChange={setAbierto} className="space-y-3">
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-left">
        <ChevronDown
          className={cn('w-4 h-4 text-muted-foreground transition-transform', !abierto && '-rotate-90')}
        />
        <Library className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold flex-1 truncate">{serie}</h3>
        <span className="text-xs text-muted-foreground">{clases.length} sesiones</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={grid}>
          {clases.map((c) => (
            <ClaseCard key={c.id} clase={c} conOrden onVerArtefacto={onVerArtefacto} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Panel principal del hub: clases agrupadas por curso (grid de cards), colapsables. */
export function ClasesPanel({ clases, onVerArtefacto }: ClasesPanelProps): JSX.Element {
  return (
    <div className="space-y-5">
      {agruparPorSerie(clases).map((grupo) => (
        <CursoGroup
          key={grupo.serie ?? '__sueltas__'}
          serie={grupo.serie}
          clases={grupo.clases}
          onVerArtefacto={onVerArtefacto}
        />
      ))}
    </div>
  );
}
