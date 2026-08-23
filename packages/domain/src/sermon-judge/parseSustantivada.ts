import type { PropositionDraft } from './propositionContract';

/**
 * Lee los elementos de una proposición sustantivada YA ESCRITA.
 *
 * `confrontProposition` sabe juzgar un `PropositionDraft` con sus 8 elementos
 * separados, pero lo que existe en un sermón real es una FRASE. Sin este
 * puente, el contrato solo se puede verificar mientras se construye la
 * proposición, y no sobre la que el pastor ya tiene delante — que es
 * justamente cuando quiere corregirla.
 *
 * BEST-EFFORT Y HONESTO: devuelve solo lo que reconoce. Un elemento que no
 * calza queda ausente, y aguas abajo se reporta como faltante — nunca se
 * adivina. Una proposición libre (legítima, ver ADR-027) simplemente rinde
 * pocos elementos, y eso es información correcta, no un error.
 */

/** Los numerales que el corpus del fundador usa, más los vecinos razonables. */
const NUMERALES: Record<string, number> = {
    un: 1, una: 1, dos: 2, tres: 3, cuatro: 4,
    cinco: 5, seis: 6, siete: 7,
};

/** Verbos de descubrimiento en 1ª plural — la voz del corpus. */
const VERBOS_1PL = ['veremos', 'aprenderemos', 'descubriremos', 'consideraremos', 'encontraremos', 'estudiaremos', 'analizaremos', 'recibiremos'];

/**
 * Verbos en 2ª singular. NO son parte del patrón —el predicador se incluye con
 * la congregación— pero se reconocen para poder DECIRLO, en vez de reportar
 * "falta el verbo" cuando lo que pasa es que está en la persona equivocada.
 */
const VERBOS_2SG = ['verás', 'aprenderás', 'descubrirás', 'considerarás', 'encontrarás', 'estudiarás', 'recibirás'];

export interface SustantivadaParse {
    draft: PropositionDraft;
    /** El verbo está en 2ª singular en vez de 1ª plural. */
    verboEnSegundaPersona: boolean;
    /** El verbo hallado, sea cual sea su persona. */
    verbo?: string;
}

function normalizar(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Lee la proposición. `puntos` se pasa aparte porque no viven en la frase: son
 * el bosquejo, la otra mitad del contrato.
 */
export function parseSustantivada(
    texto: string,
    puntos: readonly string[] = [],
): SustantivadaParse {
    const draft: PropositionDraft = {};
    const t = (texto ?? '').trim();
    if (puntos.length) draft.puntos = [...puntos];
    if (!t) return { draft, verboEnSegundaPersona: false };

    // 1. PASAJE — "En Jonás 1:1-3," al abrir. Tolera markdown y emojis que la
    // UI inyecta alrededor de la referencia.
    const mPasaje = t.match(/^\s*[*_\s]*En\s+[^\p{L}\d]*([\p{L}\d][^,.]{2,60}?\d+:\d+(?:-\d+)?)/u);
    if (mPasaje?.[1]) draft.pasaje = mPasaje[1].replace(/[*_]/g, '').trim();

    // 2. VERBO + 3. NUMERAL + 4. SUSTANTIVO, que viajan juntos.
    const norm = normalizar(t);
    let verbo: string | undefined;
    let verboEnSegundaPersona = false;
    for (const v of VERBOS_1PL) {
        if (norm.includes(normalizar(v))) { verbo = v; break; }
    }
    if (!verbo) {
        for (const v of VERBOS_2SG) {
            if (norm.includes(normalizar(v))) { verbo = v; verboEnSegundaPersona = true; break; }
        }
    }

    if (verbo) {
        const rx = new RegExp(
            `${normalizar(verbo)}\\s+\\*{0,2}(${Object.keys(NUMERALES).join('|')})\\*{0,2}\\s+\\*{0,2}([a-z]+)`,
            'i',
        );
        const m = norm.match(rx);
        if (m) {
            draft.cantidadDePuntos = NUMERALES[m[1]!];
            // El sustantivo se devuelve del texto ORIGINAL, con sus tildes: es
            // lo que el pastor lee, no la forma normalizada para buscar.
            const idx = norm.indexOf(m[2]!, norm.indexOf(m[1]!));
            if (idx >= 0) draft.sustantivo = t.slice(idx, idx + m[2]!.length);
        }
    }

    // 5. NEXO proposicional.
    const mNexo = norm.match(/\b(por las que|por los que|a fin de|para que|para|que)\b/);
    if (mNexo?.[1]) draft.elementoProposicional = mNexo[1];

    // 6. LLAMADO A LA ACCIÓN + 7. IDEA CENTRAL — los dos viven DESPUÉS del nexo.
    //
    // "…tres verdades **que deben modelar nuestra confianza en Dios**"
    // "…dos realidades **que deben guiarnos a la obediencia**"
    //
    // No se intenta separarlos con precisión gramatical: el llamado y la idea
    // central se enredan en la misma cláusula y partirlos a la fuerza produce
    // recortes falsos. Se toma la cola entera como llamado, y la misma cola
    // como idea central. Lo que importa acá es SI ESTÁN, no dónde termina uno.
    if (mNexo?.index !== undefined) {
        const resto = t.slice(mNexo.index + mNexo[1]!.length).replace(/^[\s,]+/, '').replace(/[.\s]+$/, '');
        if (resto.length > 10) {
            draft.llamadoALaAccion = resto;
            draft.ideaCentral = resto;
        }
    }

    return { draft, verboEnSegundaPersona, ...(verbo ? { verbo } : {}) };
}
