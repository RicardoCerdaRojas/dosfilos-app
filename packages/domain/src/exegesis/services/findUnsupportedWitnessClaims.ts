import type { ParsedCitation } from '../entities/CitationVerification';

/**
 * Afirmaciones sobre evidencia manuscrita que ninguna cita respalda.
 *
 * **Por qué existe.** El corpus de crítica textual de un trabajo suele
 * ser parcial: Metzger —el comentario del aparato— sólo discute las
 * variantes que el comité del UBS juzgó importantes, y en la mayoría de
 * los versículos no dice nada. Cuando el análisis toca uno de esos
 * versículos, la tentación del modelo es rellenar de memoria: nombrar
 * códices y papiros que suenan bien y que ninguna fuente del trabajo
 * respalda.
 *
 * Eso es lo más difícil de detectar leyendo, porque una lista de
 * testigos tiene forma de erudición. Y es de lo más grave que puede
 * pasar: un trabajo de seminario que atribuye una lectura al Sinaítico
 * sin haberlo comprobado afirma sobre manuscritos que nunca vio.
 *
 * **Qué cuenta como afirmación de testigos.** Sólo el vocabulario que
 * nombra la EVIDENCIA: manuscritos, códices, papiros, testigos, o un
 * códice por su nombre. Deliberadamente NO cuentan «variante» ni
 * «lectura» sueltas: la nota obligatoria de crítica textual dice cosas
 * como «el aparato no registra variantes significativas», que es una
 * afirmación correcta y sin testigos que citar. Marcarla sería castigar
 * justo la disciplina que el esquema exige.
 *
 * **Qué la respalda.** Una cita detectada dentro de la misma oración.
 * No basta con que el párrafo cite en algún lado: la evidencia
 * manuscrita se atribuye frase por frase.
 */
export interface UnsupportedWitnessClaim {
    /** La oración completa, para que el usuario la localice y la juzgue. */
    sentence: string;
    /** Qué disparó la detección: los términos de evidencia encontrados. */
    matched: string[];
    /** Posición en el markdown, para resaltar. */
    offset: number;
}

/**
 * Vocabulario que nombra evidencia manuscrita. En español e inglés,
 * más los nombres propios de los códices mayores y la sigla de papiro.
 */
const TERMINOS_DE_EVIDENCIA: ReadonlyArray<RegExp> = [
    /\bmanuscrito(s)?\b/i,
    /\bmanuscript(s)?\b/i,
    /\bcódice(s)?\b/i,
    /\bcodex\b/i,
    /\bcodices\b/i,
    /\bpapiro(s)?\b/i,
    /\bpapyr(us|i)\b/i,
    /\btestigo(s)?\b/i,
    /\bwitness(es)?\b/i,
    /\bsinaític[oa]\b|\bsinaiticus\b/i,
    /\bvaticano\b|\bvaticanus\b/i,
    /\balejandrino\b|\balexandrinus\b/i,
    /\bbezae?\b/i,
    /\bmayoritario\b|\bmajority text\b/i,
    /\u{1D513}/u,   // 𝔓 — sigla de papiro
    /ℵ/u,      // ℵ — Sinaítico
];

export function findUnsupportedWitnessClaims(
    markdown: string,
    citations: ReadonlyArray<Pick<ParsedCitation, 'offset'>>,
): UnsupportedWitnessClaim[] {
    if (!markdown.trim()) return [];

    const claims: UnsupportedWitnessClaim[] = [];
    for (const { text, start, end } of splitSentences(markdown)) {
        const matched = TERMINOS_DE_EVIDENCIA
            .map(re => text.match(re)?.[0])
            .filter((m): m is string => !!m);
        if (matched.length === 0) continue;

        const respaldada = citations.some(c => c.offset >= start && c.offset <= end);
        if (respaldada) continue;

        claims.push({ sentence: text.trim(), matched, offset: start });
    }
    return claims;
}

/**
 * Corta el texto en oraciones con su posición.
 *
 * El corte es por punto/interrogación/exclamación seguidos de espacio, y
 * por línea en blanco. Basta para localizar la afirmación: no se busca
 * análisis gramatical, sino la unidad dentro de la cual una cita cuenta
 * como respaldo.
 */
function splitSentences(text: string): Array<{ text: string; start: number; end: number }> {
    const out: Array<{ text: string; start: number; end: number }> = [];
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text[i]!;
        const next = text[i + 1];
        const finDeOracion = (c === '.' || c === '!' || c === '?') && (next === undefined || next === ' ' || next === '\n');
        const finDeParrafo = c === '\n' && next === '\n';
        if (finDeOracion || finDeParrafo) {
            const fragment = text.slice(start, i + 1);
            if (fragment.trim()) out.push({ text: fragment, start, end: i + 1 });
            start = i + 1;
        }
    }
    const resto = text.slice(start);
    if (resto.trim()) out.push({ text: resto, start, end: text.length });
    return out;
}
