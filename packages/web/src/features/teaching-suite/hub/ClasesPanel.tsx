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

function ClaseRow({
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
    <li className="flex items-center gap-3 rounded-lg border px-3 py-2 bg-background">
      {conOrden && clase.orden != null && (
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-xs font-medium flex items-center justify-center text-muted-foreground">
          {clase.orden}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{clase.titulo}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {GENERO_LABEL[clase.genero] && (
            <span className="text-xs text-muted-foreground">{GENERO_LABEL[clase.genero]}</span>
          )}
          <Badge variant={estado.variant} className="text-[10px] px-1.5 py-0">
            {estado.label}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-1">
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
    </li>
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

  // Las clases sueltas (sin serie) no necesitan cabecera de curso.
  if (!serie) {
    return (
      <ul className="space-y-2">
        {clases.map((c) => (
          <ClaseRow key={c.id} clase={c} conOrden={false} onVerArtefacto={onVerArtefacto} />
        ))}
      </ul>
    );
  }

  return (
    <Collapsible open={abierto} onOpenChange={setAbierto} className="space-y-2">
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-left">
        <ChevronDown
          className={cn('w-4 h-4 text-muted-foreground transition-transform', !abierto && '-rotate-90')}
        />
        <Library className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold flex-1 truncate">{serie}</h3>
        <span className="text-xs text-muted-foreground">{clases.length} sesiones</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-2 pl-6">
          {clases.map((c) => (
            <ClaseRow key={c.id} clase={c} conOrden onVerArtefacto={onVerArtefacto} />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Panel principal del hub: clases agrupadas por curso, colapsables. */
export function ClasesPanel({ clases, onVerArtefacto }: ClasesPanelProps): JSX.Element {
  return (
    <div className="space-y-4">
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
