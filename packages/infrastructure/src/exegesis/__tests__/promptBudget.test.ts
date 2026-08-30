import { describe, expect, it } from 'vitest';
import type { AnalyzeVerseInput, ExegesisGenerationInput } from '@dosfilos/domain';
import { buildAnalyzerPrompt } from '../canonicalAnalyzer/analyzerPrompts';
import { buildPrompt } from '../prompts';
import { MAX_PROMPT_CHARS } from '../../llm/promptBudget';

/**
 * Regresión del bug que trababa la pantalla de exégesis: los constructores
 * presupuestaban 220.000 / 250.000 caracteres de corpus, por encima del tope
 * de `prompt` del callable `runLlmPrompt`. Con cuatro comentarios extraídos
 * completos toda generación moría con `prompt excede 200000 caracteres` y
 * ningún botón del paper funcionaba.
 */

const HUGE = 'λ'.repeat(400_000);

function hugeSource(key: string) {
    return {
        sourceId: key,
        displayLabel: `Comentario ${key}`,
        citationKey: key,
        sourceType: 'commentary-expository' as const,
        priority: 'primary' as const,
        textContent: HUGE,
    };
}

const VERSE_REF = { bookId: 'JON', chapterStart: 1, verseStart: 1, verseEnd: 1 };

describe('presupuesto de prompt de exégesis', () => {
    it('el analizador canónico entra en el tope con corpus enorme', () => {
        const input = {
            verseRef: VERSE_REF,
            paperPassage: { bookId: 'JON', chapterStart: 1, verseStart: 1, verseEnd: 3 },
            language: 'es',
            sources: [hugeSource('a'), hugeSource('b'), hugeSource('c'), hugeSource('d')],
            priorAcceptedAnalyses: [],
            styleGuideContent: HUGE,
            assignmentBrief: null,
            missingSourceTypes: [],
            stepEmphasis: null,
            originalLanguageText: null,
            regenerationHint: null,
        } as unknown as AnalyzeVerseInput;

        const { userMessage } = buildAnalyzerPrompt(input);

        expect(userMessage.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
    });

    it('el orquestador de pasos entra en el tope con corpus enorme', () => {
        const input = {
            kind: 'verse',
            verseRef: VERSE_REF,
            paperPassage: { bookId: 'JON', chapterStart: 1, verseStart: 1, verseEnd: 3 },
            language: 'es',
            sources: [hugeSource('a'), hugeSource('b'), hugeSource('c'), hugeSource('d')],
            priorAcceptedSteps: [],
            styleGuideContent: HUGE,
            assignmentBrief: null,
            missingSourceTypes: [],
            stepEmphasis: null,
            regenerationHint: null,
        } as unknown as ExegesisGenerationInput;

        const { userMessage } = buildPrompt(input);

        expect(userMessage.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
    });

    it('con corpus chico no recorta nada', () => {
        const small = { ...hugeSource('a'), textContent: 'texto corto de fuente' };
        const input = {
            verseRef: VERSE_REF,
            paperPassage: { bookId: 'JON', chapterStart: 1, verseStart: 1, verseEnd: 3 },
            language: 'es',
            sources: [small],
            priorAcceptedAnalyses: [],
            styleGuideContent: '',
            assignmentBrief: null,
            missingSourceTypes: [],
            stepEmphasis: null,
            originalLanguageText: null,
            regenerationHint: null,
        } as unknown as AnalyzeVerseInput;

        const { userMessage } = buildAnalyzerPrompt(input);

        expect(userMessage).toContain('texto corto de fuente');
        expect(userMessage).not.toContain('contenido truncado');
    });
});
