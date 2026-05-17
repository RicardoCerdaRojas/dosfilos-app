import type { BookPanorama } from '../expository/BookPanorama';
import type { ExegeticalUnit } from '../expository/ExegeticalUnit';
import type { FidelityReview } from '../expository/FidelityReview';
import type { MacroSection } from '../expository/MacroSection';
import type { PreachableUnit } from '../expository/PreachableUnit';
import type { SuperMacroSection } from '../expository/SuperMacroSection';

/**
 * Port for the v1.5 expository assistant — a 5-pass pipeline that
 * walks a biblical book through the classical homiletics methodology
 * (panorama → macroestructura → microestructura → conversión
 * predicable → evaluación de fidelidad).
 *
 * Why 5 separate methods (not one `runAll(input)` call):
 *   - Each pass takes 15-30s; staging the UI requires the wizard to
 *     observe each pass complete before starting the next.
 *   - Cancellability matters: if Pase 1 returns a panorama the pastor
 *     disagrees with, they should adjust + restart from Pase 2 without
 *     paying for Pases 3-5.
 *   - Each pass has its own structured output schema and its own
 *     prompt; collapsing them into one call would force a giant
 *     monolithic prompt the model would compromise on.
 *
 * Each method is PURE: it consumes the prior passes' outputs (when
 * applicable) and the verse-by-verse text, and returns the new pass
 * output. No internal fetch — the application use case loads the
 * text and threads it through each call.
 *
 * Implementations live in infrastructure (Gemini Pro 2.5 + thinking
 * for v1.5).
 */
export interface IExpositoryAssistant {
    /**
     * Pase 1 — Panorama. Reads the whole book and identifies genre,
     * purpose, pastoral problem, central theme, movements, key terms.
     * The genre detected here drives the prompt branching in Pase 3.
     */
    runPanorama(input: PanoramaInput): Promise<PassResult<BookPanorama>>;

    /**
     * Pase 2a — Super-macro estructura (OPTIONAL, two-tier mode only).
     * For long books (Génesis, Hechos, Isaías, etc.), divides the book
     * into 2-5 broad super-sections before the regular macro pass
     * runs. Wizard activates this for books where a flat 5-7 macro
     * list would collapse 100+ verses per macro. Skipped for short
     * books (the wizard goes straight to `runMacroStructure`).
     */
    runSuperMacroStructure(input: SuperMacroInput): Promise<PassResult<SuperMacroSection[]>>;

    /**
     * Pase 2 — Macroestructura. Receives panorama + text, divides
     * the book into 3-7 macro-sections, each with function. The
     * panorama's `movements` is a hint, not a constraint. When the
     * wizard ran in two-tier mode, `superMacroSections` arrives
     * populated and the assistant nests each macro under one
     * (stamping `parentSuperMacroId`).
     */
    runMacroStructure(input: MacroInput): Promise<PassResult<MacroSection[]>>;

    /**
     * Pase 3 — Microestructura. For each macro-section, identifies
     * the exegetical units (syntactically-justified blocks). Branches
     * on `panorama.genre`: epistles use participial chains and
     * connectors, narratives use scene markers, poetry uses
     * parallelism, etc. (See genre-specific criteria in the
     * methodology prompt §3-4.)
     */
    runMicroStructure(input: MicroInput): Promise<PassResult<ExegeticalUnit[]>>;

    /**
     * Pase 4 — Conversión predicable. Decides which exegetical units
     * become standalone sermons, which combine, and which split. For
     * each preachable unit, produces an exegetical proposition + a
     * homiletical proposition + a pastoral objective + an optional
     * special-case treatment. This is the heart of the methodology;
     * the prompt for this pass is the user's expert prompt verbatim.
     */
    runPreachableConversion(input: PreachableInput): Promise<PassResult<PreachableUnit[]>>;

    /**
     * Pase 5 — Evaluación de fidelidad. Audits the preachable units
     * against the methodology's anti-patterns (separating exhortation
     * from grounds, breaking parallelisms, splitting climaxes, etc.).
     * Output is ADVISORY — issues with severity + recommendation; the
     * wizard surfaces them as warnings, never silently overwrites the
     * Pase 4 output.
     */
    runFidelityReview(input: FidelityInput): Promise<PassResult<FidelityReview>>;
}

// ── Input shapes ────────────────────────────────────────────────────────

export interface AssistantBookContext {
    /** Display name in the active language ("2 Pedro" / "2 Peter"). */
    book: string;
    /** Output language; same value the wizard uses. */
    displayLanguage: 'es' | 'en';
    /**
     * Verse-by-verse text the wizard loaded from the bible repository.
     * The assistant never fetches text on its own — keeps the
     * implementation testable and infrastructure-portable.
     */
    verses: AssistantVerseInput[];
    /**
     * v1.6: where the verses came from. The prompts use this to
     * frame the model's expectations honestly — original Greek/Hebrew
     * supports direct syntactic citation, translation surrogate
     * requires the model to approximate the original markers from
     * the translation. Optional and back-compatible: omitting it
     * preserves legacy v1.5 behaviour where the prompt is silent
     * about the source.
     */
    sourceLanguage?: 'greek' | 'hebrew' | 'translation';
    /**
     * v1.7 sub-book scope marker. When present, signals that `verses`
     * is a sub-book fragment (single chapter, chapter range, or verse
     * range) — used by the cached assistant wrapper to bypass the
     * whole-book cache (otherwise a Mateo 10 run would return the
     * Mateo 1-28 panorama cached previously). Omit for whole-book
     * runs to keep cache hits. Recommended value: the formatted
     * passage reference ("Mateo 10", "Romanos 1:18-3:20").
     */
    scopeKey?: string;
}

export interface AssistantVerseInput {
    chapter: number;
    verse: number;
    text: string;
}

export interface PanoramaInput extends AssistantBookContext {
    /** Soft hint passed by the wizard's setup form (optional). */
    targetPreachableCount?: number;
}

export interface SuperMacroInput extends AssistantBookContext {
    panorama: BookPanorama;
}

export interface MacroInput extends AssistantBookContext {
    panorama: BookPanorama;
    /**
     * v1.6 two-tier mode. When present, the assistant must produce
     * macros that fit within these super-macro ranges and stamp each
     * macro's `parentSuperMacroId` to the enclosing super-macro id.
     * Absent for single-tier (legacy) runs.
     */
    superMacroSections?: SuperMacroSection[];
}

export interface MicroInput extends AssistantBookContext {
    panorama: BookPanorama;
    macroSections: MacroSection[];
}

export interface PreachableInput extends AssistantBookContext {
    panorama: BookPanorama;
    macroSections: MacroSection[];
    exegeticalUnits: ExegeticalUnit[];
    /** Soft hint, same as in panorama input. */
    targetPreachableCount?: number;
    /**
     * Optional regeneration hint produced by the wizard's "Refinar con
     * feedback" affordance. When the user has already seen a fidelity
     * review (Pase 5) and wants to fold the reviewer's issues +
     * recommendations back into Pase 4, the wizard serializes those
     * into a free-text hint and re-runs preachable conversion with it.
     * The prompt builder appends the hint as authoritative guidance —
     * the reviewer's concerns must be addressed in the new output.
     */
    regenerationHint?: string;
    /**
     * v1.6 strict mode. When true the pastor has confirmed that every
     * exegetical unit has an accepted exegetical paper backing it —
     * the prompt swaps its "panoramic hypothesis" framing for
     * "exegetically validated proposition" and the wizard hides the
     * "preliminary, pending validation" disclaimer. Affects prompt
     * wording only — the input shape is otherwise unchanged.
     */
    strictMode?: boolean;
}

export interface FidelityInput extends AssistantBookContext {
    panorama: BookPanorama;
    macroSections: MacroSection[];
    exegeticalUnits: ExegeticalUnit[];
    preachableUnits: PreachableUnit[];
}

// ── Common output envelope ──────────────────────────────────────────────

/**
 * Each pass returns its payload plus model metadata so the wizard can
 * render token cost / model id per pass and the application can
 * fingerprint the run.
 */
export interface PassResult<T> {
    payload: T;
    modelId: string;
    /** Total tokens consumed (prompt + completion). Null if unreported. */
    tokensUsed: number | null;
    /**
     * Stable signature of the model + prompt + input. The use case
     * combines these across passes to compute the run's overall
     * version stored on `series.metadata.expository.pericopeAssistantVersion`.
     */
    passVersion: string;
}
