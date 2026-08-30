import type { SheetRange } from '../entities/ProjectSource';

/**
 * Qué entra al prompt de un paso, entre todo lo que el corpus podría aportar.
 *
 * El corpus curado de doce fuentes son ~514.000 caracteres: dos veces y media el
 * tope del prompt. Mandarlo entero es lo que hace hoy el módulo, y es la razón
 * por la que un estudio serio no entra. Acá se decide qué parte viaja.
 *
 * Dos clases de material, con reglas distintas a propósito:
 *
 *   - **Fijado** (`pinned`). Entra siempre, sin competir. Es el material que el
 *     usuario eligió con intención y que ningún ranking traería: la
 *     introducción al libro no menciona el versículo, así que por cercanía
 *     pierde contra cualquier párrafo que sí lo mencione. Si el usuario la
 *     marcó, es porque la quiere.
 *   - **Rankeado**. Compite por lo que sobre, de mayor a menor cercanía.
 *
 * El orden de esa competencia importa: si lo fijado se cargara al final, un
 * corpus grande lo dejaría afuera justo cuando más material hay para elegir —
 * que es cuando el usuario más se tomó el trabajo de marcarlo.
 */

/**
 * Un fragmento del corpus curado, candidato a entrar al prompt.
 *
 * Distinto del `RetrievedChunk` del verificador de citas, que describe un
 * fragmento suelto para comparar contra una cita. Este lleva PROCEDENCIA
 * —`resourceId` y `chunkIndex`— porque hace falta para deduplicar entre lo
 * fijado y lo rankeado, y para devolver todo en orden de documento.
 */
export interface CorpusChunk {
    resourceId: string;
    chunkIndex: number;
    text: string;
    /** Hoja física del PDF, para el ancla de citación y el orden. */
    sheet: number | null;
    section: string | null;
    /** Cercanía a la consulta, en [0,1]. Los fijados no la usan. */
    score: number;
}

export interface SelectForPromptInput {
    /** Candidatos del ranking, en cualquier orden. */
    ranked: ReadonlyArray<CorpusChunk>;
    /** Fragmentos de los tramos fijados. Entran completos. */
    pinned: ReadonlyArray<CorpusChunk>;
    /** Caracteres disponibles para el corpus en este paso. */
    budgetChars: number;
}

export interface PromptSelection {
    /** Lo que va al prompt, en orden de documento. */
    chunks: CorpusChunk[];
    pinnedChars: number;
    rankedChars: number;
    /** Candidatos del ranking que no entraron por presupuesto. */
    droppedRanked: number;
    /**
     * `true` cuando lo fijado solo ya consume todo el presupuesto. La interfaz
     * lo necesita para decir POR QUÉ no entró nada del ranking, en vez de
     * mostrar un paso pobre sin explicación.
     */
    pinnedExhaustedBudget: boolean;
}

/**
 * Arma la selección de un paso.
 *
 * Devuelve los fragmentos en ORDEN DE DOCUMENTO —por fuente, por hoja, por
 * índice— y no por puntaje. Un comentario se lee corrido: entregar los párrafos
 * ordenados por cercanía descendente le da al modelo el material barajado, y
 * eso se nota en la prosa que produce.
 */
export function selectForPrompt(input: SelectForPromptInput): PromptSelection {
    const budget = Math.max(0, input.budgetChars);

    const taken: CorpusChunk[] = [];
    const seen = new Set<string>();
    let used = 0;

    // 1. Lo fijado, completo y primero.
    for (const chunk of input.pinned) {
        const key = chunkKey(chunk);
        if (seen.has(key)) continue;
        seen.add(key);
        taken.push(chunk);
        used += chunk.text.length;
    }
    const pinnedChars = used;
    const pinnedExhaustedBudget = pinnedChars >= budget && input.ranked.length > 0;

    // 2. Lo rankeado, de mayor a menor cercanía, mientras quepa.
    const byScore = [...input.ranked].sort((a, b) => b.score - a.score);
    let dropped = 0;
    for (const chunk of byScore) {
        const key = chunkKey(chunk);
        // Un fragmento fijado que además ganó el ranking no se cuenta dos veces.
        if (seen.has(key)) continue;
        if (used + chunk.text.length > budget) { dropped++; continue; }
        seen.add(key);
        taken.push(chunk);
        used += chunk.text.length;
    }

    return {
        chunks: taken.sort(documentOrder),
        pinnedChars,
        rankedChars: used - pinnedChars,
        droppedRanked: dropped,
        pinnedExhaustedBudget,
    };
}

function chunkKey(chunk: CorpusChunk): string {
    return `${chunk.resourceId}#${chunk.chunkIndex}`;
}

/** Por fuente, después por hoja, después por índice dentro de la hoja. */
function documentOrder(a: CorpusChunk, b: CorpusChunk): number {
    if (a.resourceId !== b.resourceId) return a.resourceId < b.resourceId ? -1 : 1;
    const sheetA = a.sheet ?? Number.MAX_SAFE_INTEGER;
    const sheetB = b.sheet ?? Number.MAX_SAFE_INTEGER;
    if (sheetA !== sheetB) return sheetA - sheetB;
    return a.chunkIndex - b.chunkIndex;
}

/**
 * ¿Cae esta hoja dentro de alguno de los tramos?
 *
 * Es el filtro que hace que la curadura mande sobre el ranking: Firestore
 * devuelve lo más cercano de TODO el libro, y de ahí solo sirve lo que el
 * usuario admitió. Sin este filtro, el modelo recibiría páginas que el usuario
 * decidió dejar afuera.
 */
export function sheetWithinRanges(
    sheet: number | null,
    ranges: ReadonlyArray<SheetRange>,
): boolean {
    if (sheet === null) return false;
    return ranges.some(r => sheet >= r.start && sheet <= r.end);
}
