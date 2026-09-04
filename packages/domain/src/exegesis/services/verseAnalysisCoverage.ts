import { formatPassageReference } from '../../bible/canon/passage-reference';
import type { CanonicalVerseAnalysis } from '../entities/CanonicalVerseAnalysis';

/**
 * Qué del análisis tiene que aparecer publicado, y cómo se comprueba.
 *
 * El análisis de un verso produce dieciocho campos y el compositor es
 * un modelo que escribe prosa: puede quedarse con cuatro secciones y
 * no declarar que descartó las otras. Medido sobre un trabajo real de
 * Santiago 1:1-5, los dieciocho campos estaban completos y el paper
 * publicaba tres —sintaxis, crítica textual, contexto histórico y las
 * opciones de traducción se perdían enteros—.
 *
 * Este módulo convierte el análisis en una lista de ÍTEMS con lo que
 * cada uno afirma, para poder preguntarle al texto publicado si lo
 * dice. No opina sobre estilo ni reescribe nada: sólo mide.
 *
 * La comprobación es por SOLAPAMIENTO DE PALABRAS DE CONTENIDO, no
 * por subcadena: el compositor parafrasea, y exigir literalidad
 * marcaría como perdido lo que sí publicó con otras palabras.
 *
 * Deliberadamente NO se usa el griego como ancla. El fragmento
 * «δέ» o «πᾶσαν χαρὰν» aparece en la cita del texto del verso, así
 * que encontrarlo no prueba que la discusión de esa partícula o de
 * esa crux se haya publicado — probaría sólo que el verso está citado.
 */
export type CoverageItemKind =
    | 'translation'
    | 'argumentative-role'
    | 'textual-criticism'
    | 'variant'
    | 'syntax'
    | 'particle'
    | 'lexeme'
    | 'historical'
    | 'ot-link'
    | 'commentator'
    | 'crux'
    | 'footnote'
    | 'thesis';

export interface CoverageItem {
    /** Estable dentro de un verso: `{verseKey}:{kind}:{n}`. */
    id: string;
    kind: CoverageItemKind;
    /** Rótulo corto para decirle al usuario qué quedó afuera. */
    label: string;
    /**
     * La afirmación del análisis. Se considera publicada cuando la
     * prosa reutiliza al menos `COVERAGE_OVERLAP_THRESHOLD` de sus
     * palabras de contenido.
     */
    phrase: string;
}

/**
 * Fracción de las palabras de contenido del ítem que la prosa tiene
 * que reutilizar para darlo por publicado.
 *
 * 0,5 y no más alto porque el compositor traduce, sustantiva y
 * reordena: exigir más marcaría como perdido lo que está dicho de
 * otro modo. Y no más bajo porque las palabras de contenido de dos
 * ítems del mismo verso se parecen entre sí —hablan del mismo texto—
 * y un umbral flojo daría por publicado cualquier párrafo vecino.
 */
export const COVERAGE_OVERLAP_THRESHOLD = 0.5;

/**
 * Mínimo de palabras de contenido para que un ítem sea medible.
 *
 * Bajo esto el solapamiento es ruido: dos palabras coinciden o no por
 * azar. Un ítem no medible cuenta como publicado — el compositor no
 * debería perder el paper entero por una nota de tres palabras.
 */
const MIN_MEASURABLE_TOKENS = 4;

/**
 * Clave del verso dentro del paper. Se usa como prefijo de los ids y
 * como rótulo de la sección; `renderVerseAnalysisProse` y el
 * troceador del markdown compuesto leen la misma función, para que el
 * encabezado que el compositor debe emitir y el que se busca después
 * no puedan divergir.
 */
export function verseSectionKey(
    analysis: CanonicalVerseAnalysis,
    language: 'es' | 'en',
): string {
    return formatPassageReference(analysis.reference, language);
}

export function buildVerseCoverageContract(
    analysis: CanonicalVerseAnalysis,
    language: 'es' | 'en',
): CoverageItem[] {
    const key = verseSectionKey(analysis, language);
    const items: CoverageItem[] = [];
    const push = (kind: CoverageItemKind, n: number, label: string, phrase: string | undefined | null) => {
        const text = (phrase ?? '').trim();
        if (!text) return;
        items.push({ id: `${key}:${kind}:${n}`, kind, label, phrase: text });
    };
    const L = (es: string, en: string) => (language === 'en' ? en : es);

    push('translation', 0, L('traducción final', 'final translation'), analysis.finalTranslation);
    push('argumentative-role', 0, L('función argumentativa', 'argumentative role'), analysis.argumentativeRole);

    push('textual-criticism', 0, L('crítica textual', 'textual criticism'), analysis.textualCriticism.note);
    analysis.textualCriticism.variants.forEach((v, i) => {
        push('variant', i, L(`variante ${v.lemma}`, `variant ${v.lemma}`), v.rationale);
    });

    const syntacticElements = [
        ...(analysis.syntacticAnalysis.mainVerb ? [analysis.syntacticAnalysis.mainVerb] : []),
        ...analysis.syntacticAnalysis.keyConstructions,
    ];
    syntacticElements.forEach((el, i) => {
        push('syntax', i, L(`sintaxis: ${el.text}`, `syntax: ${el.text}`), el.interpretiveSignificance);
    });
    if (!analysis.syntacticAnalysis.mainVerb && analysis.syntacticAnalysis.mainVerbNote) {
        push('syntax', syntacticElements.length, L('verbo principal', 'main verb'), analysis.syntacticAnalysis.mainVerbNote);
    }

    analysis.syntacticAnalysis.discourseParticles.forEach((p, i) => {
        push('particle', i, L(`partícula ${p.particle}`, `particle ${p.particle}`), `${p.function}. ${p.note}`);
    });

    analysis.lexicalAnalyses.forEach((lex, i) => {
        push('lexeme', i, L(`léxico: ${lex.term}`, `lexis: ${lex.term}`), lex.verseSpecificLoading);
    });

    analysis.historicalContext.forEach((h, i) => {
        push('historical', i, L(`contexto histórico: ${h.aspect}`, `historical context: ${h.aspect}`), `${h.aspect}. ${h.relevance}`);
    });

    analysis.oldTestamentLinks.forEach((l, i) => {
        push('ot-link', i, L(`AT: ${l.sourcePassage}`, `OT: ${l.sourcePassage}`), l.interpretiveBearing);
    });

    analysis.commentatorEngagement.forEach((c, i) => {
        push('commentator', i, L(`${c.sourceKey} sobre el verso`, `${c.sourceKey} on the verse`), c.position);
    });

    analysis.translationCruxes.forEach((cx, i) => {
        // La crux se mide por su discusión Y su compromiso: un paper
        // que adopta una traducción sin decir contra qué la adoptó
        // publicó la conclusión y se quedó el trabajo.
        push('crux', i, L(`crux: ${cx.phrase}`, `crux: ${cx.phrase}`),
            `${cx.description} ${cx.commitment.chosen}. ${cx.commitment.rationale}`);
    });

    analysis.footnoteExtensions.forEach((fn, i) => {
        push('footnote', i, L(`nota: ${fn.anchorPhrase}`, `footnote: ${fn.anchorPhrase}`), fn.text);
    });

    push('thesis', 0, L('tesis del verso', 'verse thesis'), analysis.verseThesis);

    return items;
}

/**
 * Los ítems que la prosa NO publica. Función pura.
 */
export function findUncoveredItems(
    prose: string,
    items: readonly CoverageItem[],
): CoverageItem[] {
    const proseTokens = new Set(contentTokens(prose));
    return items.filter(item => !isCovered(item, proseTokens));
}

function isCovered(item: CoverageItem, proseTokens: ReadonlySet<string>): boolean {
    const tokens = new Set(contentTokens(item.phrase));
    if (tokens.size < MIN_MEASURABLE_TOKENS) return true;
    let hits = 0;
    for (const t of tokens) if (proseTokens.has(t)) hits++;
    return hits / tokens.size >= COVERAGE_OVERLAP_THRESHOLD;
}

/**
 * Palabras de contenido normalizadas.
 *
 * Se bajan acentos latinos —el compositor escribe «análisis» donde el
 * análisis escribió «analisis» y son la misma palabra— pero NO los
 * diacríticos griegos: en griego el acento y el espíritu distinguen
 * palabras, y aplanarlos haría coincidir términos distintos.
 */
function contentTokens(text: string): string[] {
    const out: string[] = [];
    for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
        if (!raw) continue;
        const token = isGreek(raw) ? raw.normalize('NFC') : stripLatinDiacritics(raw);
        if (token.length < 4) continue;
        if (STOPWORDS.has(token)) continue;
        out.push(token);
    }
    return out;
}

function isGreek(token: string): boolean {
    return /\p{Script=Greek}/u.test(token);
}

function stripLatinDiacritics(token: string): string {
    return token.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Palabras vacías de cuatro letras o más, español e inglés. Las más
 * cortas ya las descarta el filtro de longitud.
 */
const STOPWORDS = new Set([
    'para', 'como', 'pero', 'este', 'esta', 'esto', 'esos', 'esas', 'aqui',
    'porque', 'cuando', 'donde', 'entre', 'sobre', 'desde', 'hasta', 'segun',
    'tambien', 'aunque', 'mientras', 'mismo', 'misma', 'cual', 'cuales', 'sino',
    'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros', 'otras',
    'estan', 'hace', 'hacer', 'puede', 'pueden', 'debe', 'deben', 'sera',
    'seria', 'solo', 'solamente', 'decir', 'dice',
    'that', 'this', 'these', 'those', 'with', 'from', 'which', 'while', 'when',
    'where', 'their', 'there', 'them', 'they', 'have', 'been', 'being',
    'into', 'than', 'then', 'also', 'such', 'because', 'about', 'would', 'could',
    'should', 'must', 'does', 'each', 'other', 'more', 'most', 'only', 'very',
]);
