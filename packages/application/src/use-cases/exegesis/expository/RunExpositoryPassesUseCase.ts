import type {
    AssistantVerseInput,
    BookPanorama,
    ExegeticalUnit,
    FidelityReview,
    IExpositoryAssistant,
    MacroSection,
    PreachableUnit,
    PassResult,
} from '@dosfilos/domain';

/**
 * Single use case orchestrating the 5 passes of the expository
 * assistant pipeline. The wizard calls one method per pass, in
 * sequence, accumulating results in component state.
 *
 * We expose 5 methods (instead of 5 separate use case classes)
 * because every method shares the same dependency (the
 * IExpositoryAssistant) and the same concern (running ONE pass) —
 * splitting would force the wizard to wire 5 imports for what is
 * conceptually one workflow.
 *
 * Each method is a thin pass-through to the assistant: load no text,
 * persist nothing, just invoke the corresponding assistant method
 * and return the result. The wizard is responsible for:
 *   - Loading verses ONCE via `loadBookVerses` (helper module).
 *   - Threading the verses + accumulated outputs into each call.
 *   - Persisting the final SermonSeries when the pastor accepts.
 */
export class RunExpositoryPassesUseCase {
    constructor(private assistant: IExpositoryAssistant) {}

    async runPanorama(input: PanoramaCallInput): Promise<PassResult<BookPanorama>> {
        return this.assistant.runPanorama({
            book: input.book,
            displayLanguage: input.displayLanguage,
            verses: input.verses,
            ...(input.targetPreachableCount !== undefined ? { targetPreachableCount: input.targetPreachableCount } : {}),
            ...(input.sourceLanguage !== undefined ? { sourceLanguage: input.sourceLanguage } : {}),
        });
    }

    async runMacroStructure(input: MacroCallInput): Promise<PassResult<MacroSection[]>> {
        return this.assistant.runMacroStructure({
            book: input.book,
            displayLanguage: input.displayLanguage,
            verses: input.verses,
            panorama: input.panorama,
            ...(input.sourceLanguage !== undefined ? { sourceLanguage: input.sourceLanguage } : {}),
        });
    }

    async runMicroStructure(input: MicroCallInput): Promise<PassResult<ExegeticalUnit[]>> {
        return this.assistant.runMicroStructure({
            book: input.book,
            displayLanguage: input.displayLanguage,
            verses: input.verses,
            panorama: input.panorama,
            macroSections: input.macroSections,
            ...(input.sourceLanguage !== undefined ? { sourceLanguage: input.sourceLanguage } : {}),
        });
    }

    async runPreachableConversion(input: PreachableCallInput): Promise<PassResult<PreachableUnit[]>> {
        return this.assistant.runPreachableConversion({
            book: input.book,
            displayLanguage: input.displayLanguage,
            verses: input.verses,
            panorama: input.panorama,
            macroSections: input.macroSections,
            exegeticalUnits: input.exegeticalUnits,
            ...(input.targetPreachableCount !== undefined ? { targetPreachableCount: input.targetPreachableCount } : {}),
            ...(input.sourceLanguage !== undefined ? { sourceLanguage: input.sourceLanguage } : {}),
        });
    }

    async runFidelityReview(input: FidelityCallInput): Promise<PassResult<FidelityReview>> {
        return this.assistant.runFidelityReview({
            book: input.book,
            displayLanguage: input.displayLanguage,
            verses: input.verses,
            panorama: input.panorama,
            macroSections: input.macroSections,
            exegeticalUnits: input.exegeticalUnits,
            preachableUnits: input.preachableUnits,
            ...(input.sourceLanguage !== undefined ? { sourceLanguage: input.sourceLanguage } : {}),
        });
    }
}

// ── Per-pass call inputs ────────────────────────────────────────────────

interface BaseCallInput {
    book: string;
    displayLanguage: 'es' | 'en';
    verses: AssistantVerseInput[];
    /** v1.6: original-language source tag forwarded into prompts. */
    sourceLanguage?: 'greek' | 'hebrew' | 'translation';
}

export interface PanoramaCallInput extends BaseCallInput {
    targetPreachableCount?: number;
}

export interface MacroCallInput extends BaseCallInput {
    panorama: BookPanorama;
}

export interface MicroCallInput extends BaseCallInput {
    panorama: BookPanorama;
    macroSections: MacroSection[];
}

export interface PreachableCallInput extends BaseCallInput {
    panorama: BookPanorama;
    macroSections: MacroSection[];
    exegeticalUnits: ExegeticalUnit[];
    targetPreachableCount?: number;
}

export interface FidelityCallInput extends BaseCallInput {
    panorama: BookPanorama;
    macroSections: MacroSection[];
    exegeticalUnits: ExegeticalUnit[];
    preachableUnits: PreachableUnit[];
}
