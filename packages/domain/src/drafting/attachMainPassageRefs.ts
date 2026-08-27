import type { SermonContent } from '../entities/SermonGenerator';
import { pointPassageRef } from './pointPassageRef';

/**
 * Rellena `mainPassageRef` en cada punto de un borrador GENERADO.
 *
 * ES POST-PROCESO DETERMINISTA, NO PARTE DEL PROMPT. El campo no está en el
 * esquema JSON que se le pide al modelo, y no debe estarlo: la referencia se
 * deriva del título del punto que el pastor mantiene (`pointPassageRef` — el
 * título gana sobre las referencias heredadas del bosquejo). Pedírsela al
 * modelo sería pedir un dato que ya tenemos a quien puede equivocarlo.
 *
 * Sin esto, el punto generado no abría con su versículo mientras el armado
 * desde el taller sí — la diferencia de estructura que el fundador señaló
 * primero al comparar los dos caminos.
 *
 * Un punto cuyo título no trae versículos y sin referencias en el bosquejo
 * queda sin `mainPassageRef`, igual que en el taller: lo que falta, falta.
 */
export function attachMainPassageRefs(
    draft: SermonContent,
    input: {
        sermonPassage?: string;
        points: readonly {
            title?: string;
            scriptureReferences?: readonly string[];
            /** El que escribió el pastor, si lo escribió. Gana sobre todo. */
            passageRef?: string;
        }[];
    },
): SermonContent {
    const body = draft.body.map((punto, i) => {
        if (punto.mainPassageRef?.trim()) return punto;
        const outline = input.points[i];
        const ref = pointPassageRef({
            // El título del BORRADOR puede haberlo reescrito el modelo; el del
            // bosquejo lo mantiene el pastor. Se prefiere el suyo.
            title: outline?.title ?? punto.point,
            sermonPassage: input.sermonPassage,
            scriptureReferences: outline?.scriptureReferences,
            passageRef: outline?.passageRef,
        });
        return ref ? { ...punto, mainPassageRef: ref } : punto;
    });
    return { ...draft, body };
}
