import { useMutation } from '@tanstack/react-query';
import { seriesService } from '@dosfilos/application';
import type {
    BibleBookId,
    BookPanorama,
    ExegeticalUnit,
    FidelityReview,
    MacroSection,
    PassResult,
    PreachableUnit,
    AssistantVerseInput,
} from '@dosfilos/domain';

/**
 * Hook that exposes the v1.5 expository assistant pipeline as 5
 * staged React Query mutations. The wizard owns the workflow state
 * (loaded verses + accumulated pass outputs) and calls these
 * mutations sequentially, observing each completion before
 * launching the next.
 *
 * Verse loading is exposed as a synchronous helper (NOT a mutation)
 * because it's pure JSON lookup with no I/O latency — wrapping it
 * in useMutation would just add a render cycle for no benefit.
 */
export function useExpositoryAssistant() {
    const loadVerses = (input: { bookId: BibleBookId; displayLanguage: 'es' | 'en' }) =>
        seriesService.loadBookVersesForExpository(input);

    const runPanorama = useMutation({
        mutationFn: async (input: PanoramaInput): Promise<PassResult<BookPanorama>> => {
            const payload: Parameters<typeof seriesService.expositoryPasses.runPanorama>[0] = {
                book: input.book,
                displayLanguage: input.displayLanguage,
                verses: input.verses,
            };
            if (input.targetPreachableCount !== undefined) {
                payload.targetPreachableCount = input.targetPreachableCount;
            }
            return seriesService.expositoryPasses.runPanorama(payload);
        },
    });

    const runMacro = useMutation({
        mutationFn: async (input: MacroInput): Promise<PassResult<MacroSection[]>> => {
            return seriesService.expositoryPasses.runMacroStructure({
                book: input.book,
                displayLanguage: input.displayLanguage,
                verses: input.verses,
                panorama: input.panorama,
            });
        },
    });

    const runMicro = useMutation({
        mutationFn: async (input: MicroInput): Promise<PassResult<ExegeticalUnit[]>> => {
            return seriesService.expositoryPasses.runMicroStructure({
                book: input.book,
                displayLanguage: input.displayLanguage,
                verses: input.verses,
                panorama: input.panorama,
                macroSections: input.macroSections,
            });
        },
    });

    const runPreachable = useMutation({
        mutationFn: async (input: PreachableInput): Promise<PassResult<PreachableUnit[]>> => {
            const payload: Parameters<typeof seriesService.expositoryPasses.runPreachableConversion>[0] = {
                book: input.book,
                displayLanguage: input.displayLanguage,
                verses: input.verses,
                panorama: input.panorama,
                macroSections: input.macroSections,
                exegeticalUnits: input.exegeticalUnits,
            };
            if (input.targetPreachableCount !== undefined) {
                payload.targetPreachableCount = input.targetPreachableCount;
            }
            return seriesService.expositoryPasses.runPreachableConversion(payload);
        },
    });

    const runFidelity = useMutation({
        mutationFn: async (input: FidelityInput): Promise<PassResult<FidelityReview>> => {
            return seriesService.expositoryPasses.runFidelityReview({
                book: input.book,
                displayLanguage: input.displayLanguage,
                verses: input.verses,
                panorama: input.panorama,
                macroSections: input.macroSections,
                exegeticalUnits: input.exegeticalUnits,
                preachableUnits: input.preachableUnits,
            });
        },
    });

    return {
        loadVerses,
        runPanorama,
        runMacro,
        runMicro,
        runPreachable,
        runFidelity,
    };
}

interface BaseInput {
    book: string;
    displayLanguage: 'es' | 'en';
    verses: AssistantVerseInput[];
}

interface PanoramaInput extends BaseInput {
    targetPreachableCount?: number;
}

interface MacroInput extends BaseInput {
    panorama: BookPanorama;
}

interface MicroInput extends BaseInput {
    panorama: BookPanorama;
    macroSections: MacroSection[];
}

interface PreachableInput extends BaseInput {
    panorama: BookPanorama;
    macroSections: MacroSection[];
    exegeticalUnits: ExegeticalUnit[];
    targetPreachableCount?: number;
}

interface FidelityInput extends BaseInput {
    panorama: BookPanorama;
    macroSections: MacroSection[];
    exegeticalUnits: ExegeticalUnit[];
    preachableUnits: PreachableUnit[];
}
