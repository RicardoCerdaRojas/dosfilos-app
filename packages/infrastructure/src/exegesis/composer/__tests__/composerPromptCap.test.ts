import { describe, it, expect } from 'vitest';
import { buildComposerPrompt } from '../composerPrompts';
import { MAX_PROMPT_CHARS } from '../../../llm/promptBudget';
import { buildEmptyCanonicalVerseAnalysis } from '@dosfilos/domain';
import type { ComposeAcademicPaperInput, PassageReference } from '@dosfilos/domain';

const PASSAGE: PassageReference = {
    bookId: 'JAS', chapterStart: 1, chapterEnd: 1, verseStart: 1, verseEnd: 5,
};

function analysisFor(verse: number) {
    return {
        ...buildEmptyCanonicalVerseAnalysis({
            ...PASSAGE, verseStart: verse, verseEnd: verse,
        }),
        argumentativeRole: 'r'.repeat(4_000),
    };
}

function inputWith(pinnedSources: number, contentChars: number): ComposeAcademicPaperInput {
    return {
        paperPassage: PASSAGE,
        paperTitle: 'Santiago 1:1-5',
        language: 'es',
        assignmentBrief: null,
        styleGuideContent: null,
        styleGuideManifest: null,
        paperRubric: null,
        exegeticalStrategy: null,
        verseAnalyses: [1, 2, 3, 4, 5].map(analysisFor),
        pinnedSourceKeys: [],
        sources: Array.from({ length: pinnedSources }, (_, i) => ({
            citationKey: `Fuente${i}`,
            author: `Autor${i}`,
            title: `Obra ${i}`,
            isPinned: true,
            textContent: 'x'.repeat(contentChars),
        })),
    } as unknown as ComposeAcademicPaperInput;
}

describe('buildComposerPrompt — tope del proxy', () => {
    it('no pasa el tope aunque varias fuentes fijadas traigan libros enteros', () => {
        // El caso real: dos fuentes fijadas a 80.000 cada una y el
        // servidor rechazando con "prompt excede 200000 caracteres".
        const { userMessage } = buildComposerPrompt(inputWith(3, 200_000));

        expect(userMessage.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
    });

    it('conserva los briefings de los versos al recortar', () => {
        const { userMessage } = buildComposerPrompt(inputWith(3, 200_000));

        // Se recorta el contenido de las fuentes, nunca el análisis que
        // el alumno ya aceptó.
        for (const verse of [1, 2, 3, 4, 5]) {
            expect(userMessage).toContain(`Santiago 1:${verse}`);
        }
    });

    it('deja pasar el contenido completo cuando cabe', () => {
        const { userMessage } = buildComposerPrompt(inputWith(1, 500));

        expect(userMessage).toContain('x'.repeat(500));
    });
});
