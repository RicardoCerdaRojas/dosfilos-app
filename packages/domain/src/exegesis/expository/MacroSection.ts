/**
 * Output of Pase 2 (macroestructura) of the expository assistant pipeline.
 *
 * Each macro-section is a large block of the book that performs a
 * single function in the author's overall argument or narrative
 * (introduction, thesis, climax, application, etc.). Sermons live
 * INSIDE macro-sections, not across them — knowing the macro-section
 * a sermon belongs to lets the pastor frame each preachable unit
 * within the larger movement of the book.
 *
 * 3-7 macro-sections per book is the target range. Fewer hides the
 * structure; more loses the distinction from microestructura.
 */
export interface MacroSection {
    /** Stable id within the assistant run; used as foreign key by ExegeticalUnit. */
    id: string;
    /** Short label the wizard renders as the section heading. */
    title: string;
    /** Inclusive lower boundary of the section. */
    chapterStart: number;
    verseStart: number;
    /** Inclusive upper boundary. */
    chapterEnd: number;
    verseEnd: number;
    /** What this section is ABOUT. 1-2 sentences. */
    theme: string;
    /** What this section DOES in the book's argument. */
    functionInBook: MacroFunction;
    /** Stable order in the book; preserved when the user reorders. */
    order: number;
    /**
     * v1.6 — optional reference to the parent `SuperMacroSection` when
     * the wizard ran in two-tier mode. Undefined for flat (single-tier)
     * runs and for books short enough to skip Pase 2a. Used by the UI
     * to render macros under their super-macro accordion group; the
     * downstream micro / preachable / fidelity passes don't read it.
     */
    parentSuperMacroId?: string;
}

/**
 * Function a macro-section performs within the book's overall flow.
 *
 * Curated set (not free text) so the wizard can render section badges
 * with consistent semantics across runs and translations. The
 * assistant maps freeform function descriptions onto this set during
 * Pase 2; the pastor can edit the function inline if they disagree.
 */
export type MacroFunction =
    | 'introduction'         // saludo, prólogo, presentación de autor/destinatarios
    | 'thesis'               // afirmación teológica que el resto del libro desarrolla
    | 'argument-development' // bloques de exposición que sostienen la tesis
    | 'narrative-arc'        // tramo narrativo con tensión propia (apertura/desarrollo/clímax)
    | 'climax'               // punto culminante de la argumentación o narración
    | 'application'          // exhortaciones, mandatos, consecuencias éticas
    | 'closing'              // saludos finales, doxología, despedida
    | 'transition'           // bisagra entre dos secciones grandes
    | 'digression';          // paréntesis explicativo o ilustrativo
