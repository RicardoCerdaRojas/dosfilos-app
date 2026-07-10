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
