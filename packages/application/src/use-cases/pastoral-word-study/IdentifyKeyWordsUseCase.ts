import type {
    IPastoralWordStudyService,
    KeyWordCandidate,
    WordStudyLanguage,
} from '@dosfilos/domain';

export interface IdentifyKeyWordsArgs {
    passage: string;
    language: WordStudyLanguage;
    /** Original-language passage text (SBLGNT / MorphHB). Optional but improves quality. */
    originalText?: string;
    translationName?: string;
}

/**
 * Pastoral Fidelity Phase 1.5 — orchestrates the LLM identification of
 * 5-8 theologically loaded words in a passage. Per ADR-018, the
 * production implementation of `IPastoralWordStudyService` applies the
 * curated boost; the use case itself stays declarative.
 *
 * Trim guard: any LLM that returns fewer than 3 or more than 10
 * candidates is treated as malformed — the consumer surfaces a generic
 * retry banner rather than rendering a degenerate picker.
 */
export class IdentifyKeyWordsUseCase {
    constructor(private readonly service: IPastoralWordStudyService) {}

    async execute(args: IdentifyKeyWordsArgs): Promise<KeyWordCandidate[]> {
        const candidates = await this.service.identifyKeyWords(args);

        if (!Array.isArray(candidates) || candidates.length < 3 || candidates.length > 10) {
            throw new Error(
                `IdentifyKeyWords devolvió ${Array.isArray(candidates) ? candidates.length : 'una respuesta no-array'} candidatos. ` +
                'Esperamos entre 3 y 10. Reintenta el análisis.',
            );
        }

        // Defensive sort by theologicalWeight desc — the boost may have
        // shifted the ranking and the LLM doesn't guarantee order.
        return [...candidates].sort((a, b) => b.theologicalWeight - a.theologicalWeight);
    }
}
