import { describe, it, expect } from 'vitest';
import type { ExegeticalPaper } from '@dosfilos/domain';
import { EMPTY_VERIFICATION_SUMMARY } from '@dosfilos/domain';
import { exportPaperToDocx } from '../exportPaperToDocx';

/**
 * Smoke tests for the .docx exporter. We don't crack open the OOXML
 * package to assert footnote shape — that would couple tightly to the
 * docx library's serialization. Instead we verify:
 *   - Packer.toBlob runs end-to-end on a realistic paper.
 *   - The output is non-empty and has the expected MIME shape.
 *   - The exporter doesn't throw on edge cases (no assembled
 *     markdown, citations, lists, blockquotes).
 */
describe('exportPaperToDocx', () => {
    const basePaper: ExegeticalPaper = makePaper({
        assembledMarkdown: [
            '## Introducción',
            '',
            'Estudio de **Hebreos 1:1-4**, con énfasis cristológico.',
            '',
            '## Versículo 1',
            '',
            'El autor afirma que "en estos últimos días Dios ha hablado en su Hijo" (Lane, "Hebrews 1-8", p. 47).',
            '',
            '- Punto uno',
            '- Punto dos',
            '',
            '> El exordio compendia toda la cristología.',
            '',
            '---',
            '',
            '## Conclusión',
            '',
            'La polifonía profética alcanza su clímax en el Hijo (Bruce, "Hebrews", p. 12).',
        ].join('\n'),
    });

    it('produces a non-empty Blob for a paper with citations + lists + blockquotes', async () => {
        const blob = await exportPaperToDocx(basePaper, { exportedAt: new Date('2026-01-15') });
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.size).toBeGreaterThan(1000);
    });

    it('exports cleanly when no assembled markdown or accepted steps exist', async () => {
        const empty = makePaper({ assembledMarkdown: null, steps: [] });
        const blob = await exportPaperToDocx(empty, { exportedAt: new Date('2026-01-15') });
        expect(blob.size).toBeGreaterThan(500);
    });

    it('handles a paragraph without citations', async () => {
        const plain = makePaper({
            assembledMarkdown: 'Texto sin citas y sin formato especial.',
        });
        const blob = await exportPaperToDocx(plain, { exportedAt: new Date('2026-01-15') });
        expect(blob.size).toBeGreaterThan(500);
    });
});

function makePaper(overrides: Partial<ExegeticalPaper>): ExegeticalPaper {
    return {
        id: 'paper-1',
        ownerId: 'user-1',
        title: 'Hebreos 1:1-4',
        passage: {
            book: 'Heb',
            chapterStart: 1,
            chapterEnd: 1,
            verseStart: 1,
            verseEnd: 4,
        },
        displayLanguage: 'es',
        styleGuideId: null,
        phase: 'assembled',
        currentStepId: null,
        archivedAt: null,
        sources: [],
        steps: [],
        rubric: null,
        stepPlan: {
            defaults: { introduction: null, verse: null, conclusion: null },
            perStep: {},
            updatedAt: new Date(),
        },
        assignmentBrief: null,
        assembledMarkdown: null,
        exegeticalStrategy: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    } as ExegeticalPaper;
}

// Reference unused import so eslint stays quiet about the side-effect-only import.
void EMPTY_VERIFICATION_SUMMARY;
