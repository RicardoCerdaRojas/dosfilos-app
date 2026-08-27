/**
 * Estructuras retóricas del versículo: quiasmo, inclusión, paralelismo.
 *
 * ────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTE MÓDULO ES DESCONFIADO POR DISEÑO
 *
 * El quiasmo es el hallazgo más SOBRE-DIAGNOSTICADO de los estudios
 * bíblicos: a un modelo al que se le pregunta "¿hay un quiasmo?" siempre le
 * encontrará uno. Y a diferencia de la morfología —que viene de un dataset
 * revisado— esto es INTERPRETACIÓN. Un quiasmo falso presentado como hecho
 * le da al pastor una estructura que predicará con confianza y que su
 * profesor desmontará en clase.
 *
 * Las salvaguardas son ESTRUCTURALES, no de redacción del prompt:
 *
 *  1. TIPOS CERRADOS. Sólo quiasmo, inclusión y paralelismo. Sin "estructura
 *     concéntrica", "anillo" ni etiquetas nuevas.
 *  2. ÍNDICES REALES, NO PROSA. Cada elemento nombra las palabras del
 *     versículo por su posición. Obliga a ser concreto y nos deja verificar.
 *  3. SIMETRÍA VERIFICADA EN CÓDIGO. Un quiasmo necesita al menos dos pares
 *     (A B B' A'): las etiquetas deben venir emparejadas y el orden de los
 *     índices debe INVERTIRSE de verdad. Si no invierte, no es quiasmo — se
 *     descarta aunque el modelo insista.
 *  4. SE MUESTRA COMO PROPUESTA, no como dato. La UI lo rotula así.
 * ────────────────────────────────────────────────────────────────────────
 */

export type RhetoricalType = 'chiasm' | 'inclusio' | 'parallelism';

export interface RhetoricalElement {
    /** "A", "B", "B'", "A'" — el rótulo del miembro. */
    readonly label: string;
    /** Posiciones (0-based) de las palabras del versículo que lo forman. */
    readonly wordIndices: readonly number[];
    /** Qué aporta este miembro, en una línea. */
    readonly note: string;
}

export interface RhetoricalStructure {
    readonly type: RhetoricalType;
    readonly elements: readonly RhetoricalElement[];
    /** Qué revela la estructura — el "¿y qué?" de la forma. */
    readonly note: string;
}

const TIPOS: readonly RhetoricalType[] = ['chiasm', 'inclusio', 'parallelism'];

/** "A'" y "A" son el mismo miembro: uno es el eco del otro. */
function base(label: string): string {
    return label.replace(/['’]+$/u, '').trim().toUpperCase();
}

/**
 * ¿La estructura propuesta se sostiene? Devuelve la estructura validada o
 * `null` — y `null` es un resultado correcto y frecuente.
 */
export function validateRhetoricalStructure(
    raw: unknown,
    wordCount: number,
): RhetoricalStructure | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Record<string, unknown>;

    const type = TIPOS.find((t) => t === r.type);
    if (!type) return null;

    const note = typeof r.note === 'string' ? r.note.trim() : '';
    if (!note || !Array.isArray(r.elements)) return null;

    const elements: RhetoricalElement[] = [];
    for (const crudo of r.elements) {
        const e = crudo as Record<string, unknown>;
        const label = typeof e.label === 'string' ? e.label.trim() : '';
        const nota = typeof e.note === 'string' ? e.note.trim() : '';
        const indices = Array.isArray(e.wordIndices)
            ? e.wordIndices.filter(
                  (i): i is number => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < wordCount,
              )
            : [];
        // Un miembro sin palabras REALES del versículo no es un miembro:
        // es prosa disfrazada de estructura.
        if (!label || !nota || indices.length === 0) return null;
        elements.push({ label, wordIndices: indices, note: nota });
    }

    // Al menos dos miembros: uno solo no es una estructura.
    if (elements.length < 2) return null;

    if (type === 'chiasm' || type === 'inclusio') {
        // Los rótulos deben venir EMPAREJADOS (A…A', B…B').
        const porBase = new Map<string, RhetoricalElement[]>();
        for (const el of elements) {
            const b = base(el.label);
            porBase.set(b, [...(porBase.get(b) ?? []), el]);
        }
        const pares = [...porBase.values()].filter((g) => g.length === 2);
        if (pares.length === 0 || pares.length !== porBase.size) return null;
        // Un quiasmo necesita DOS pares (A B B' A'); la inclusión, uno basta.
        if (type === 'chiasm' && pares.length < 2) return null;

        // LA SIMETRÍA SE VERIFICA: el orden de aparición de los pares debe
        // INVERTIRSE. Si los miembros van A B A' B', es paralelismo, no
        // quiasmo — y decirle quiasmo a un paralelismo es el abuso típico.
        const primeros = pares.map((g) => Math.min(...g[0]!.wordIndices));
        const segundos = pares.map((g) => Math.min(...g[1]!.wordIndices));
        const ordenApertura = [...primeros].sort((a, b) => a - b);
        const ordenCierre = [...segundos].sort((a, b) => a - b);
        const aperturaOk = primeros.every((v, i) => v === ordenApertura[i]);
        const cierreInvertido = segundos.every((v, i) => v === ordenCierre[segundos.length - 1 - i]);
        if (!aperturaOk || !cierreInvertido) return null;
    }

    return { type, elements, note };
}


/** Relación entre DOS palabras del versículo. Vocabulario cerrado. */
export type WordRelationType = 'apposition' | 'agreement' | 'governs' | 'modifies';

export interface WordRelation {
    readonly from: number;
    readonly to: number;
    readonly type: WordRelationType;
    readonly note: string;
}

const RELACIONES: readonly WordRelationType[] = ['apposition', 'agreement', 'governs', 'modifies'];

/**
 * Valida las relaciones propuestas contra la MORFOLOGÍA REAL.
 *
 * La aposición y la concordancia EXIGEN mismo caso — es gramática, no
 * opinión: si el modelo dice que un nominativo está en aposición con un
 * dativo, se descarta. Tener el dato determinista al lado nos deja auditar
 * lo generado, que es la ventaja de haber separado las dos capas.
 *
 * Cada relación mala se cae SOLA; las buenas sobreviven.
 */
export function validateWordRelations(
    raw: unknown,
    cases: readonly (string | undefined)[],
): WordRelation[] {
    if (!Array.isArray(raw)) return [];
    const out: WordRelation[] = [];
    const vistas = new Set<string>();
    for (const crudo of raw) {
        const r = crudo as Record<string, unknown>;
        const from = typeof r.from === 'number' ? r.from : -1;
        const to = typeof r.to === 'number' ? r.to : -1;
        const type = RELACIONES.find((t) => t === r.type);
        const note = typeof r.note === 'string' ? r.note.trim() : '';
        if (!type || !note) continue;
        if (from === to || from < 0 || to < 0 || from >= cases.length || to >= cases.length) continue;
        if ((type === 'apposition' || type === 'agreement') && cases[from] !== cases[to]) continue;
        // Una relación es simétrica para nuestro uso: no se duplica.
        const clave = [Math.min(from, to), Math.max(from, to), type].join('|');
        if (vistas.has(clave)) continue;
        vistas.add(clave);
        out.push({ from, to, type, note });
    }
    return out;
}
