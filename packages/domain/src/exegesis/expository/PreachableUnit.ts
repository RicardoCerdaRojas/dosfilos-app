/**
 * Output of Pase 4 (conversión predicable) of the expository assistant pipeline.
 *
 * A PreachableUnit is what the pastor will actually preach. It may:
 *   - map 1:1 to a single ExegeticalUnit (most common)
 *   - combine several small ExegeticalUnits (e.g. a salutation +
 *     opening thanksgiving treated as one introductory sermon)
 *   - split a large ExegeticalUnit (e.g. a long Pauline period broken
 *     into its internal movements: foundation / purpose / climax)
 *
 * The combine/split decision is the heart of the methodology: a
 * preachable unit must respect the author's logic AND be communicable
 * to a congregation in a single sitting.
 *
 * Each PreachableUnit carries TWO propositions:
 *   - exegetical: what the AUTHOR did
 *   - homiletical: how the CHURCH receives it
 * This separation is the standard Robinson/Chapell/Greidanus
 * distinction; collapsing them is the most common way sermons end up
 * disconnected from the text.
 *
 * When the pastor accepts the run and creates a series, each
 * PreachableUnit becomes a `PlannedSermon` (see SermonSeries) with
 * the propositions threaded into the planned sermon's metadata.
 */
export interface PreachableUnit {
    /** Stable id within the assistant run. */
    id: string;
    /** Sermon-ready title (5-10 words, preachable, NOT academic). */
    title: string;
    /** Display passage label, e.g. "2 Pedro 1:1-11". */
    passage: string;
    /** Inclusive passage boundaries. */
    chapterStart: number;
    verseStart: number;
    chapterEnd: number;
    verseEnd: number;
    /**
     * Which ExegeticalUnit ids feed this preachable unit. May be a
     * single id (1:1 mapping), several (combine), or a single one
     * tagged repeatedly (split — different preachable units cite the
     * same exegetical unit at different boundaries).
     */
    sourcedExegeticalUnitIds: string[];
    /**
     * "What the author affirms or does in this unit." Anchored on the
     * text, NOT on the application. The pastor would read this aloud
     * and recognize it as exegesis.
     */
    exegeticalProposition: string;
    /**
     * "How the congregation should receive and respond to this truth."
     * Faithful to the text, but framed for the listener. The pastor
     * would read this aloud and recognize it as the preaching point.
     */
    homileticalProposition: string;
    /**
     * Single sentence stating what the sermon should accomplish in the
     * listener — heart change, behavior change, doctrinal grounding,
     * comfort, conviction, etc. Drives the closing application.
     */
    pastoralObjective: string;
    /**
     * Special-case treatment applied when this unit is a salutation,
     * doxology, list, narrative scene, etc. — null when the unit is
     * a "normal" argumentative block that needed no special handling.
     */
    caseTreatment?: SpecialCase;
    /**
     * Notes from the Pase 5 fidelity reviewer. Empty when the review
     * passed without comments; populated when the reviewer flagged
     * issues (boundary cuts a climax, exhortation separated from its
     * fundamento, paralelismo broken, etc.). Surfaced as warnings in
     * the wizard so the pastor can adjust before creating the series.
     */
    fidelityNotes?: string;
    /** Stable order across the book. */
    order: number;
    /**
     * True when the pastor manually edited the structure of this unit
     * (merged with a neighbor, split off from a larger unit). Plain
     * text edits to title/propositions/objective do NOT flip this flag —
     * those are expected refinements. Used by the wizard to surface
     * "N unidades modificadas" badge and prompt the pastor to re-run
     * the fidelity review with a hint that the regroup was manual.
     */
    modifiedByPastor?: boolean;
}

/**
 * Categories the assistant uses to flag units that needed
 * special-case reasoning during Pase 4. Curated set so the wizard
 * can render badges with consistent semantics. Mirrors the
 * "Casos especiales" section of the methodology prompt.
 */
export type SpecialCase =
    | 'salutation'        // saludo apostólico — usado como introducción si no sostiene sermón propio
    | 'doxology'          // doxología — agrupada con la unidad que la cierra
    | 'long-prayer'       // oración larga — dividida en sus movimientos internos
    | 'virtue-list'       // catálogo de virtudes/vicios — agrupado por progresión teológica
    | 'narrative-scene'   // escena con tensión-clímax-resolución — preservada como unidad
    | 'ot-citation'       // cita del AT — predicada con la afirmación que explica
    | 'genealogy'         // genealogía — predicada por su función teológica, no nombre por nombre
    | 'law-code'          // código legal — explicado dentro del pacto, no aislado
    | 'parable'           // parábola — preservada como unidad narrativa con su interpretación
    | 'oracle';           // oráculo profético — predicado con su acusación + sentencia + promesa
