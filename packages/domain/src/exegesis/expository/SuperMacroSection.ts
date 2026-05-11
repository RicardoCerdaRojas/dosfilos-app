/**
 * Output of Pase 2a (super-macro estructura) of the expository
 * assistant pipeline. Optional tier above the regular `MacroSection`,
 * activated by the wizard for long books (Génesis, Hechos, Isaías,
 * Jeremías, Salmos) where a flat 5-7 macro list collapses too many
 * verses into one block.
 *
 * Each super-macro is a broad division of the book that performs
 * one large function — "Primeros relatos (Gn 1-11)" vs "Ciclos
 * patriarcales (Gn 12-50)". Regular `MacroSection`s then nest UNDER
 * a super-macro via `MacroSection.parentSuperMacroId`, so the
 * wizard's accordion shows: super-macro → macros → micros.
 *
 * 2-5 super-macros per book is the target range. Books that fit the
 * regular flat tier (<300 verses, no super-macros needed) skip this
 * pass entirely — the pipeline runs Pase 2 directly.
 */
export interface SuperMacroSection {
    /** Stable id within the assistant run; foreign key for MacroSection.parentSuperMacroId. */
    id: string;
    /** Short label the wizard renders as the accordion group heading. */
    title: string;
    /** Inclusive lower boundary. */
    chapterStart: number;
    verseStart: number;
    /** Inclusive upper boundary. */
    chapterEnd: number;
    verseEnd: number;
    /** What this super-macro is ABOUT and how it functions in the book. 1-3 sentences. */
    theme: string;
    /** Stable order in the book; preserved when the user reorders. */
    order: number;
}
