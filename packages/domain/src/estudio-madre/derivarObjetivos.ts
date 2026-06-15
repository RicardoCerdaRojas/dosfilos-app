import type { ElementoEstudio, ElementoTipo, Objetivos } from './types';

/**
 * Deriva los objetivos {saber, sentir, hacer} (Gap 1, spec §10) desde los
 * elementos cristalizados del Estudio Madre. PURA y determinista.
 *
 * REGLA (invariante): los objetivos NO los redacta el LLM — se DERIVAN del
 * contenido VERBATIM que el docente ya cristalizó. Si una dimensión no tiene
 * elementos fuente, queda VACÍA (no se inventa).
 *
 * Mapeo (parche MVP — ver deuda registrada):
 *   - saber  ← idea_central + observacion (la verdad establecida)
 *   - sentir ← error_confrontado (parche: el proceso aún no conduce el afecto
 *              anclado al texto; cuando lo haga, re-derivar desde la aplicación
 *              afectiva validada por su puerta)
 *   - hacer  ← aplicacion (la conducta)
 *
 * NOTA: el orden teológico que hereda (saber→sentir→hacer) y la puerta de
 * medibilidad (T1) NO se aplican aquí todavía — esto solo recolecta.
 */
const SABER_TIPOS: ReadonlySet<ElementoTipo> = new Set<ElementoTipo>(['idea_central', 'observacion']);
const SENTIR_TIPOS: ReadonlySet<ElementoTipo> = new Set<ElementoTipo>(['error_confrontado']);
const HACER_TIPOS: ReadonlySet<ElementoTipo> = new Set<ElementoTipo>(['aplicacion']);

export function derivarObjetivos(elementos: ElementoEstudio[]): Objetivos {
    const recolectar = (tipos: ReadonlySet<ElementoTipo>): string[] =>
        elementos
            .filter((e) => tipos.has(e.tipo) && e.contenido.trim().length > 0)
            .sort((a, b) => a.orden - b.orden)
            .map((e) => e.contenido.trim());

    return {
        saber: recolectar(SABER_TIPOS),
        sentir: recolectar(SENTIR_TIPOS),
        hacer: recolectar(HACER_TIPOS),
    };
}
