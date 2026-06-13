import { useMemo, useState } from 'react';
import {
  Presentation,
  MonitorPlay,
  ClipboardList,
  FileText,
  ChevronDown,
  Library,
  Search,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react';
import type { Artefacto } from '@dosfilos/domain';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

/** Con más cursos que esto, el hub arranca todo colapsado (lista escaneable). */
const COLLAPSE_THRESHOLD = 3;
const GRID = 'grid gap-3 sm:grid-cols-2 2xl:grid-cols-3';

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
  open,
  onOpenChange,
  onVerArtefacto,
}: {
  serie: string;
  clases: TeachingClaseRow[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onVerArtefacto: ClasesPanelProps['onVerArtefacto'];
}): JSX.Element {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="space-y-3">
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-left">
        <ChevronDown
          className={cn('w-4 h-4 text-muted-foreground transition-transform', !open && '-rotate-90')}
        />
        <Library className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold flex-1 truncate">{serie}</h3>
        <span className="text-xs text-muted-foreground">
          {clases.length} {clases.length === 1 ? 'sesión' : 'sesiones'}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={GRID}>
          {clases.map((c) => (
            <ClaseCard key={c.id} clase={c} conOrden onVerArtefacto={onVerArtefacto} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Panel principal del hub: clases por curso (grid de cards), con búsqueda y colapso. */
export function ClasesPanel({ clases, onVerArtefacto }: ClasesPanelProps): JSX.Element {
  const [query, setQuery] = useState('');
  // Override manual del estado de cada curso; si no hay override, manda el default.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();
  const buscando = q.length > 0;

  const filtradas = useMemo(() => {
    if (!buscando) return clases;
    return clases.filter(
      (c) =>
        c.titulo.toLowerCase().includes(q) ||
        (c.serie ?? '').toLowerCase().includes(q) ||
        (GENERO_LABEL[c.genero] ?? '').toLowerCase().includes(q),
    );
  }, [clases, q, buscando]);

  const grupos = useMemo(() => agruparPorSerie(filtradas), [filtradas]);
  const cursoKeys = grupos.map((g) => g.serie).filter((s): s is string => !!s);

  // Con muchos cursos, todo colapsado por defecto. Buscar fuerza la apertura.
  const defaultOpen = cursoKeys.length <= COLLAPSE_THRESHOLD;
  const isOpen = (key: string) => (buscando ? true : (openMap[key] ?? defaultOpen));
  const todoAbierto = cursoKeys.length > 0 && cursoKeys.every((k) => isOpen(k));

  const setAll = (abrir: boolean) =>
    setOpenMap(Object.fromEntries(cursoKeys.map((k) => [k, abrir])));

  return (
    <div className="space-y-4">
      {/* Toolbar: búsqueda + expandir/colapsar todo */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar clase o curso…"
            className="pl-8"
            aria-label="Buscar clase o curso"
          />
        </div>
        {cursoKeys.length > 1 && !buscando && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAll(!todoAbierto)}
            title={todoAbierto ? 'Colapsar todo' : 'Expandir todo'}
          >
            {todoAbierto ? (
              <ChevronsDownUp className="w-4 h-4 mr-2" />
            ) : (
              <ChevronsUpDown className="w-4 h-4 mr-2" />
            )}
            {todoAbierto ? 'Colapsar todo' : 'Expandir todo'}
          </Button>
        )}
      </div>

      {grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Sin resultados para «{query.trim()}».
        </p>
      ) : (
        <div className="space-y-5">
          {grupos.map((grupo) =>
            grupo.serie ? (
              <CursoGroup
                key={grupo.serie}
                serie={grupo.serie}
                clases={grupo.clases}
                open={isOpen(grupo.serie)}
                onOpenChange={(v) => setOpenMap((m) => ({ ...m, [grupo.serie as string]: v }))}
                onVerArtefacto={onVerArtefacto}
              />
            ) : (
              // Clases sueltas (sin curso): siempre visibles.
              <div key="__sueltas__" className={GRID}>
                {grupo.clases.map((c) => (
                  <ClaseCard key={c.id} clase={c} conOrden={false} onVerArtefacto={onVerArtefacto} />
                ))}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
