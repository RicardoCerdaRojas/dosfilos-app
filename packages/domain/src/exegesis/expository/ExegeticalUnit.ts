import type { SyntacticUnit } from '../../entities/SermonSeries';

/**
 * Output of Pase 3 (microestructura) of the expository assistant pipeline.
 *
 * An ExegeticalUnit is a small block of the text whose boundaries the
 * AUTHOR appears to have set — by syntax (Greek participial chains,
 * Hebrew waw-consecutive shifts), by literary device (inclusio,
 * paralelismo), or by genre-specific markers (oracle formulas,
 * narrative scene changes). It is NOT the same as a sermon — a single
 * sermon may combine several exegetical units, and a single
 * exegetical unit may be too small (a salutation) or too dense (a
 * long Pauline period) to preach on its own.
 *
 * The conversion to a preachable unit happens in Pase 4. This entity
 * is the raw exegetical material the pastor sees in the wizard
 * before the conversion; it carries enough provenance so the pastor
 * can audit WHY a boundary was drawn where it was.
 */
export interface ExegeticalUnit {
    /** Stable id within the assistant run; referenced by PreachableUnit.sourcedExegeticalUnitIds. */
    id: string;
    /** FK to the MacroSection this unit belongs to. */
    macroSectionId: string;
    /**
     * Passage boundaries + original-language hint. Mirrors the
     * `SyntacticUnit` shape that already lives on `PlannedSermon`
     * (see commit 1.1) so that mapping into the planned-sermon shape
     * later is a straight assignment, not a transformation.
     */
    syntacticUnit: SyntacticUnit;
    /** Short preachable-feeling title the assistant proposes. */
    suggestedTitle: string;
    /**
     * What the author IS DOING in this unit (not just the topic). E.g.
     * "fundamenta la exhortación posterior con la base teológica de
     * la elección" rather than "habla de elección".
     */
    functionInArgument: string;
    /** Single-sentence summary of what the unit affirms or accomplishes. */
    centralIdea: string;
    /**
     * Concrete syntactic / lexical / literary signals the assistant
     * cited to justify the boundary. Each entry should reference a
     * specific marker (e.g. "cadena participial en 1:5-8", "inclusio
     * formada por 'fe' en 1:1 y 1:21", "fórmula מ wayyiqtol").
     * Surfaced in the wizard so the pastor can audit the exegesis.
     */
    literarySignals: string[];
    /** Stable order in the book; preserved when the user reorders. */
    order: number;
}
