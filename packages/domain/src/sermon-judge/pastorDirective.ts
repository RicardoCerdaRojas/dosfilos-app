import type { HomileticalAnalysis } from '../entities/SermonGenerator';

/**
 * La directiva del pastor sobre un punto del bosquejo.
 *
 * Vive en dominio y es pura a propósito: es el único campo del punto que el
 * agente no escribe nunca, así que su forma es un contrato — y un contrato se
 * testea sin montar la UI ni llamar al modelo.
 */
export interface PastorDirective {
    /** El ÁNGULO desde el cual se expone el punto. Modula toda la exposición. */
    emphasis?: string;
    /** Datos del texto que DEBEN aparecer. Obligan, no modulan. */
    exegeticalNotes?: string[];
}

/**
 * Normaliza una directiva para persistirla.
 *
 * Devuelve `undefined` cuando no queda nada — y las claves vacías se OMITEN en
 * vez de viajar como `''` o `[]`. Firestore rechaza `undefined` en un campo,
 * pero un `''` guardado se lee después como "hay énfasis, y es nada", que es
 * distinto de "todavía no hay énfasis". Esa diferencia decide si el prompt del
 * borrador imprime un bloque de directiva vacío o no lo imprime.
 */
export function normalizePastorDirective(input: PastorDirective | undefined): PastorDirective | undefined {
    if (!input) return undefined;
    const emphasis = (input.emphasis ?? '').trim();
    const exegeticalNotes = (input.exegeticalNotes ?? [])
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
    const out: PastorDirective = {
        ...(emphasis ? { emphasis } : {}),
        ...(exegeticalNotes.length > 0 ? { exegeticalNotes } : {}),
    };
    return Object.keys(out).length > 0 ? out : undefined;
}

/** ¿El pastor escribió algo en este punto? */
export function hasPastorDirective(d: PastorDirective | undefined): boolean {
    return normalizePastorDirective(d) !== undefined;
}

/**
 * Escribe las directivas de VARIOS puntos EN UNA SOLA ESCRITURA.
 *
 * POR QUÉ EXISTE, y no basta con llamar la versión singular en un bucle: en
 * React cada llamada calcularía el nuevo estado desde el `homiletics` del
 * render actual, que todavía no incluye la escritura anterior de la misma
 * tanda. La última gana y las demás desaparecen —sin error, sin aviso—, que es
 * justo lo que le pasó al fundador: guardó énfasis en los puntos 1 y 2 y sólo
 * sobrevivió el 2. Es el mismo motivo por el que `applyPropositionContract`
 * escribe proposición y puntos juntos.
 *
 * Efecto secundario deseado: una sola entrada en el historial por guardado, no
 * una por punto tocado.
 */
export function applyPastorDirectives(
    homiletics: HomileticalAnalysis,
    entries: readonly { index: number; directive: PastorDirective | undefined }[],
): HomileticalAnalysis {
    const prev = homiletics.outline?.mainPoints ?? [];
    if (prev.length === 0 || entries.length === 0) return homiletics;

    const byIndex = new Map<number, PastorDirective | undefined>();
    for (const e of entries) {
        if (e.index >= 0 && e.index < prev.length) byIndex.set(e.index, normalizePastorDirective(e.directive));
    }
    if (byIndex.size === 0) return homiletics;

    const mainPoints = prev.map((p, i) => {
        if (!byIndex.has(i)) return p;
        const normalized = byIndex.get(i);
        const { pastorDirective: _drop, ...rest } = p;
        return normalized ? { ...rest, pastorDirective: normalized } : rest;
    });
    return { ...homiletics, outline: { ...(homiletics.outline ?? {}), mainPoints } };
}

/**
 * Escribe la directiva de UN punto, por índice, sin tocar el resto.
 *
 * Para guardar varios de una vez usa `applyPastorDirectives`: encadenar esta
 * función en un bucle desde React pierde todas las escrituras menos la última.
 *
 * Pasa por `normalizePastorDirective`, así que borrar el texto del énfasis
 * ELIMINA la clave en lugar de dejar un campo vacío persistido. Sin esto, un
 * pastor que escribe una directiva y después la borra dejaría el punto marcado
 * como "tiene directiva" para siempre, y el borrador seguiría imprimiendo el
 * bloque vinculante con nada adentro.
 */
export function applyPastorDirective(
    homiletics: HomileticalAnalysis,
    index: number,
    directive: PastorDirective | undefined,
): HomileticalAnalysis {
    return applyPastorDirectives(homiletics, [{ index, directive }]);
}
