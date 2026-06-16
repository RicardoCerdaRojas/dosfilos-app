import type { ElementoEstudio, Objetivos } from './types';

/**
 * Deriva los objetivos {saber, sentir, hacer} (Gap 1, spec §10) desde los
 * elementos cristalizados del Estudio Madre. PURA y determinista.
 *
 * REGLA (invariante): los objetivos NO los redacta el LLM — se DERIVAN del
 * contenido VERBATIM que el docente ya cristalizó. Si una dimensión no tiene
 * elementos fuente, queda VACÍA (no se inventa).
 *
 * Mapeo (manifiesto de conducción formativa v1.3 §5 — facultad → objetivo):
 *   - saber  ← idea_central + observacion (la verdad establecida).
 *   - sentir ← aplicacion:corazon (la afección, ya validada por el examen del
 *              corazón en la cristalización — esta función es pura y no lo sabe,
 *              pero los objetivos solo se persisten en verde, y un afecto no
 *              validado bloquea verde; por construcción aquí el corazón ya pasó).
 *   - hacer  ← aplicacion:conducta + `aplicacion` legacy SIN subtipo (back-compat
 *              sin_auditar). Una aplicación legacy se sigue tratando como conducta.
 *
 * Asimetría deliberada (manifiesto §5, Opción A del fundador): `aplicacion:mente`
 * NO se enruta a ninguna dimensión — la mente se trabaja en los pasos exegéticos,
 * no necesita un subtipo de aplicación propio. El predicado de `hacer` exige
 * subtipo `'conducta'` o ausente; `'mente'` no es ninguno → queda fuera de los
 * tres mapeos (no se cuela en `hacer`), ignorado a propósito.
 *
 * NOTA: la puerta de medibilidad (T1) NO se aplica aquí todavía — esto solo
 * recolecta.
 */

const esSaber = (e: ElementoEstudio): boolean => e.tipo === 'idea_central' || e.tipo === 'observacion';
const esSentir = (e: ElementoEstudio): boolean => e.tipo === 'aplicacion' && e.subtipo === 'corazon';
const esHacer = (e: ElementoEstudio): boolean =>
    e.tipo === 'aplicacion' && (e.subtipo === 'conducta' || e.subtipo === undefined);

export function derivarObjetivos(elementos: ElementoEstudio[]): Objetivos {
    const recolectar = (pred: (e: ElementoEstudio) => boolean): string[] =>
        elementos
            .filter((e) => pred(e) && e.contenido.trim().length > 0)
            .sort((a, b) => a.orden - b.orden)
            .map((e) => e.contenido.trim());

    return {
        saber: recolectar(esSaber),
        sentir: recolectar(esSentir),
        hacer: recolectar(esHacer),
    };
}
