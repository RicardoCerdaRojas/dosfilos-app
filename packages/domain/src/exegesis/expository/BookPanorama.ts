/**
 * Output of Pase 1 (panorama) of the expository assistant pipeline.
 *
 * Captures the high-level identity of the book before any structural
 * division happens — author intent, audience, genre, and the
 * argumentative/narrative motion the book performs as a whole. Every
 * downstream pass (macroestructura, microestructura, predicable,
 * review) reads this so the pipeline keeps a single coherent reading
 * of the book instead of contradicting itself between passes.
 *
 * Why a dedicated entity (not just `string` fields on the run): the
 * panorama is the FIRST thing a homiletician produces in the
 * Robinson/Chapell/Greidanus methodology, and it gates everything
 * after. Persisting it as a structured shape lets the wizard render
 * it editable (the pastor may want to refine the propósito or the
 * problema pastoral before continuing) without losing the structure
 * the LLM produced.
 */
export interface BookPanorama {
    /**
     * Literary genre detected by the assistant. Drives Pase 3
     * (microestructura) prompt branching — narrative criteria differ
     * sharply from poetry, prophecy, wisdom, and epistolary criteria.
     */
    genre: LiteraryGenre;
    /** What the author appears to be doing with this book. 1-2 sentences. */
    purpose: string;
    /**
     * Pastoral or theological problem the book addresses (false
     * teaching, suffering church, idolatry, lack of wisdom, etc.).
     * Sermons should land back here.
     */
    pastoralProblem: string;
    /** Single dominant theme. Distinguished from `purpose` (function vs. content). */
    centralTheme: string;
    /**
     * High-level argumentative or narrative movements the author
     * performs across the book. 3-7 entries; each is a short label
     * the macro pass uses as a starting point for division.
     */
    movements: string[];
    /**
     * Repeated terms / motifs that signal cohesion across sections.
     * Used by the micro pass to detect inclusio and leitwort.
     */
    keyTerms: string[];
    /**
     * Where the book sits in redemptive history (Old Covenant /
     * pre-exilic prophecy / apostolic instruction / etc.). Optional —
     * the assistant may omit if the book is unambiguous.
     */
    redemptiveHistoryNote?: string;
}

/**
 * Literary genres recognized by the expository assistant.
 *
 * Genre is the FIRST branching axis (not the original language) — within
 * Hebrew alone, narrative (Genesis), poetry (Psalms), prophecy (Isaiah)
 * and wisdom (Proverbs) need radically different syntactic markers and
 * preachable-unit criteria.
 *
 * `mixed` is reserved for books whose primary genre is contested or
 * shifts mid-book (e.g. Daniel: narrative + apocalyptic; Lamentations:
 * lament + acrostic poetry). The pipeline downgrades to a generic
 * branch in that case rather than refusing to run.
 */
export type LiteraryGenre =
    | 'epistle'
    | 'narrative'
    // Redacción v2 §11.0 — parábola es perfil PREDICABLE propio (no sub-tipo de
    // narrativa). Añadido al enum en 0a; su contenido de criterio lo autora el
    // fundador. `gospel` NO se disuelve a nivel enum: sigue como centinela que
    // rutea al override socrático por perícopa (relato/parábola/argumentativo).
    | 'parable'
    | 'poetry'
    | 'prophecy'
    | 'wisdom'
    | 'gospel'
    | 'apocalypse'
    | 'law'
    | 'mixed';

/**
 * Partición sellada del enum `LiteraryGenre` (Redacción v2 §11.0) — SSOT único.
 *
 * Tres clases mutuamente exclusivas cuya unión ≡ el enum completo (garantizado
 * por el test de partición, que rompe CI ante drift):
 *
 *  - SELECTABLE_GENRES  — predicables AUTORADOS: el pastor los elige y gobiernan
 *                         el análisis estructural aguas abajo.
 *  - SENTINEL_GENRES    — marcadores de ruteo, NO géneros predicables: `gospel`
 *                         se disuelve por perícopa, `mixed` dispara override.
 *                         Sin estructura derivable (markers []).
 *  - PENDING_AUTHOR_GENRES — stub temporal a la espera de que el fundador autore
 *                         su criterio (`parable`). AUTO-REMOVIBLE: al autorarse
 *                         sale de aquí y le vuelven a aplicar las aserciones
 *                         no-vacías de los catálogos.
 *
 * Antes vivían duplicados en los tests de 0a (structuralSufficiency /
 * genreDiscernmentCriteria); promovidos aquí para un solo hogar.
 */
export const SENTINEL_GENRES = ['gospel', 'mixed'] as const;

export type SentinelGenre = (typeof SENTINEL_GENRES)[number];

export const PENDING_AUTHOR_GENRES = ['parable'] as const;

export type PendingAuthorGenre = (typeof PENDING_AUTHOR_GENRES)[number];

/**
 * SSOT de géneros elegibles por el pastor. La UI (selector del paso 2) lo consume
 * — NO las keys crudas del enum, que incluyen centinelas y stubs pendientes.
 * Complemento de SENTINEL_GENRES ∪ PENDING_AUTHOR_GENRES.
 */
export const SELECTABLE_GENRES = [
    'epistle',
    'narrative',
    'poetry',
    'prophecy',
    'wisdom',
    'apocalypse',
    'law',
] as const;

export type SelectableGenre = (typeof SELECTABLE_GENRES)[number];

/** Guard: ¿`g` es un género predicable que el pastor puede elegir? */
export function isSelectableGenre(g: string): g is SelectableGenre {
    return (SELECTABLE_GENRES as readonly string[]).includes(g);
}

/**
 * Guard: ¿`g` es un centinela de ruteo (gospel/mixed)? S3 lo keyea para
 * suprimir chips Y el botón acceptProposed — cubre gospel + mixed-Daniel +
 * mixed-fallback con un solo mecanismo.
 */
export function isSentinelGenre(g: string): boolean {
    return (SENTINEL_GENRES as readonly string[]).includes(g);
}

/**
 * Cobertura de la partición a NIVEL DE TIPO (fundación inerte) — SSOT de cobertura.
 *
 * Liga las tres listas directo al union `LiteraryGenre`, sin depender del mirror
 * runtime `ALL_GENRES` (que puede quedar stale → falso-verde) ni de los `Record<
 * LiteraryGenre,…>` de 0a (desacoplados de estas listas). Un valor nuevo del enum
 * sin categorizar en selectable/sentinel/pending rompe tsc AQUÍ.
 *
 * TUPLE-WRAP obligatorio (`[T] extends [U]`, no `T extends U`): sin los `[]` el
 * condicional distribuye sobre el union y colapsa a `true` — falso-verde en el
 * propio guard.
 */
type PartitionedGenre = SelectableGenre | SentinelGenre | PendingAuthorGenre;

type AssertPartitionExhaustive = [LiteraryGenre] extends [PartitionedGenre]
    ? [PartitionedGenre] extends [LiteraryGenre]
        ? true
        : ['género en una lista de partición que no está en el enum LiteraryGenre']
    : ['género del enum LiteraryGenre sin categorizar en selectable/sentinel/pending'];

const _partitionExhaustive: AssertPartitionExhaustive = true;
void _partitionExhaustive;
