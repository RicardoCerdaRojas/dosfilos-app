import { useState } from 'react';
import { ChevronRight, Check, Circle, CircleDot } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { sectionIsReady, type SermonElement, type WalkSection } from '@dosfilos/domain';

interface Props {
    walk: readonly WalkSection[];
    elements: Record<string, SermonElement[]>;
    activeId: string;
    onSelect: (sectionId: string) => void;
}

/**
 * El mapa del sermón: estructura a la izquierda, expandible por punto.
 *
 * EXPANDIBLE Y NO PLANO, a pedido del fundador: quiere poder entrar a un punto
 * y ver qué elementos están listos, cuáles faltan y en cuál está trabajando.
 * Una lista plana de doce secciones pierde de vista a qué punto pertenece cada
 * una, que es la unidad en la que un predicador piensa.
 *
 * COMPLETITUD SÍ, AUTORÍA NO. El mapa cuenta cuántas secciones están decididas
 * —eso es progreso y ayuda a orientarse— pero NO muestra ningún número de
 * autoría. Un porcentaje de autoría visible en todo momento se convierte en la
 * meta, y la meta pasa a ser el número en vez del sermón. Mismo precedente
 * anti-gamificación que `StudyDepthBadge`.
 */
export function SermonMap({ walk, elements, activeId, onSelect }: Props) {
    const { t } = useTranslation('generator');
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    /**
     * ¿Esta sección le pide algo al pastor?
     *
     * COMPLETITUD, no autoría: una directiva también es una decisión. Medirlo
     * con la autoría dejaba en círculo una sección donde acababa de trabajar,
     * sólo porque lo que escribió era un tema y no una idea.
     *
     * La transición cuenta como lista porque SU TEXTO YA EXISTE —se compone
     * desde el bosquejo— y llega como `cubierta`, no por una excepción de
     * estado. Marcarla resuelta sin mostrar el texto sería un "listo" mudo.
     */
    const isDone = (s: WalkSection) => sectionIsReady(s, elements[s.id] ?? []);


    // Agrupa por punto conservando el orden del recorrido. Las secciones sin
    // punto (conclusión, introducción, título) van en su propio grupo suelto.
    const grupos: { id: string; label?: string; secciones: WalkSection[] }[] = [];
    for (const s of walk) {
        const gid = s.parentId ?? '__sueltas__';
        const ultimo = grupos[grupos.length - 1];
        if (ultimo?.id === gid) ultimo.secciones.push(s);
        else grupos.push({ id: gid, label: s.parentLabel, secciones: [s] });
    }

    const toggle = (id: string) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const fila = (s: WalkSection) => {
        const activo = s.id === activeId;
        const listo = isDone(s);
        const Icono = listo ? Check : activo ? CircleDot : Circle;
        return (
            <li key={s.id}>
                <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    aria-current={activo ? 'step' : undefined}
                    className={`w-full text-left flex items-start gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                        activo ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/60'
                    }`}
                >
                    <Icono className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${listo ? 'text-primary' : ''}`} />
                    <span className="min-w-0">{t(s.labelKey, s.labelParams)}</span>
                </button>
            </li>
        );
    };

    return (
        <nav className="h-full w-full p-3 overflow-y-auto" aria-label={t('drafting.sections.mapTitle')}>
            {grupos.map((g) => {
                if (g.id === '__sueltas__') {
                    return (
                        <ul key={g.id} className="space-y-0.5 mb-2">
                            {g.secciones.map(fila)}
                        </ul>
                    );
                }
                const plegado = collapsed.has(g.id);
                const listasEnGrupo = g.secciones.filter(isDone).length;
                return (
                    <div key={g.id} className="mb-2">
                        <button
                            type="button"
                            onClick={() => toggle(g.id)}
                            aria-expanded={!plegado}
                            className="w-full text-left flex items-start gap-1.5 rounded px-2 py-1.5 hover:bg-muted/60"
                        >
                            <ChevronRight
                                className={`h-3.5 w-3.5 mt-0.5 shrink-0 transition-transform ${plegado ? '' : 'rotate-90'}`}
                            />
                            <span className="min-w-0 text-sm font-medium">{g.label ?? g.id}</span>
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                                {listasEnGrupo}/{g.secciones.length}
                            </span>
                        </button>
                        {!plegado && <ul className="space-y-0.5 pl-4">{g.secciones.map(fila)}</ul>}
                    </div>
                );
            })}
        </nav>
    );
}
