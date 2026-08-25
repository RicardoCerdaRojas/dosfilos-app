import { hasDecisions, type SermonElement } from './SermonElement';
import type { WalkSection } from './deriveSectionWalk';

/**
 * ¿Esta sección del recorrido ya está lista?
 *
 * DOS CAMINOS, UNA RESPUESTA. Una sección está lista porque el pastor decidió
 * algo en ella, o porque su material ya venía del estudio (`cubierta`) y no
 * hay nada que decidir. Confundir los dos deja secciones marcadas como
 * pendientes que nunca lo estuvieron.
 *
 * ES UNA SOLA DEFINICIÓN A PROPÓSITO. Vivía copiada en el mapa del sermón y en
 * el contador del taller, y esas dos son justamente las que el pastor compara:
 * el mapa le pinta el check y el encabezado le dice "19 de 20". Si divergen,
 * ve una cuenta que no cuadra con lo que tiene al lado.
 */
export function sectionIsReady(section: WalkSection, elements: readonly SermonElement[]): boolean {
    return section.status === 'cubierta' || hasDecisions(elements);
}

/** Cuántas secciones del recorrido están listas. */
export function countReadySections(
    walk: readonly WalkSection[],
    elementsById: Readonly<Record<string, readonly SermonElement[]>>,
): number {
    return walk.filter((s) => sectionIsReady(s, elementsById[s.id] ?? [])).length;
}
