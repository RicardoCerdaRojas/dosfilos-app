/**
 * Markdown pipeline integration tests.
 *
 * Why this exists: the assistant-message renderer composes four
 * transforms in a fixed order (normalize → callouts → scripture →
 * language). Each step has implicit contracts with the next — if one
 * step normalizes a pattern the next step depends on, downstream
 * rendering breaks silently. We've shipped at least three such
 * regressions:
 *
 *   1. Empty `>\n` lines broke `transformCallouts` block detection,
 *      stranding bullets outside the callout div.
 *   2. A defensive `**X**` → `<strong>X</strong>` rewrite (added to
 *      cure literal asterisks in table cells) consumed the
 *      `> **Ejemplo:**` labels that `transformCallouts` relied on,
 *      degrading callouts to plain blockquotes.
 *   3. Inline `" > "` runs from a flattened multi-line blockquote
 *      rendered as raw `>` characters in the bubble.
 *
 * Each was a downstream contract violation. This suite codifies the
 * contracts as black-box DOM assertions on a corpus of representative
 * tutor outputs. Adding a new pipeline step or editing an existing
 * one must keep this suite green.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// LocalBibleService loads the local Bible corpus on demand. In the
// test runtime we don't need to validate against the actual book
// catalog — we only care that the pipeline calls parseReference and
// wraps successful matches. A stub mock returns a non-null parsed
// shape for every well-formed candidate the regex produces.
vi.mock('@/services/LocalBibleService', () => ({
    LocalBibleService: {
        parseReference: (ref: string) => ({ raw: ref, book: 'Test', chapter: 1, verseStart: 1, verseEnd: 1 }),
        getVerses: () => ({ verses: [], rawText: '' }),
    },
}));

import {
    normalizeAssistantMarkdown,
    transformCallouts,
    wrapScriptureRefs,
    wrapLanguageRuns,
    Callout,
    ScriptureRef,
} from '../citations';

// Vite raw-import for fixture files — keeps the corpus as readable
// .md instead of escaped JS strings.
import tableBoldCells from '../__fixtures__/tutor-table-bold-cells.md?raw';
import calloutEjemplo from '../__fixtures__/tutor-callout-ejemplo.md?raw';
import calloutNota from '../__fixtures__/tutor-callout-nota.md?raw';
import calloutMultiParagraph from '../__fixtures__/tutor-callout-multi-paragraph.md?raw';
import scriptureRefs from '../__fixtures__/tutor-scripture-refs.md?raw';
import mixedGreekHebrew from '../__fixtures__/tutor-mixed-greek-hebrew.md?raw';
import malformedInlineBlockquote from '../__fixtures__/tutor-malformed-inline-blockquote.md?raw';
import borderlessTable from '../__fixtures__/tutor-borderless-table.md?raw';

/**
 * Runs the exact pipeline `AssistantMessageContent` uses, minus the
 * citations step (which requires a sources array and isn't relevant
 * to formatting fidelity).
 */
function renderTutorMarkdown(content: string) {
    const step0 = normalizeAssistantMarkdown(content);
    const step1 = wrapScriptureRefs(step0);
    const step2 = transformCallouts(step1);
    const step3 = wrapLanguageRuns(step2);
    return render(
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
                div: (props: any) => {
                    if (props['data-callout']) return <Callout {...props} />;
                    return <div {...props} />;
                },
                span: (props: any) => {
                    if (props['data-scripture']) return <ScriptureRef {...props} />;
                    return <span {...props} />;
                },
            }}
        >
            {step3}
        </ReactMarkdown>
    );
}

describe('tutor markdown pipeline — table cells', () => {
    it('renders **X** inside pipe-style table cells as <strong>', () => {
        const { container } = renderTutorMarkdown(tableBoldCells);
        const table = container.querySelector('table');
        expect(table).toBeTruthy();
        // Every first-column entry was wrapped in `**`. None should
        // leak through as literal asterisks.
        expect(container.textContent).not.toMatch(/\*\*[A-Za-zÁÉÍÓÚÑáéíóúñ]/);
        const strongs = container.querySelectorAll('table strong');
        // 5 bold labels: Raíz, Binyan, Aspecto, Persona, Significado…
        expect(strongs.length).toBeGreaterThanOrEqual(5);
        const labels = Array.from(strongs).map(s => s.textContent);
        expect(labels).toContain('Raíz');
        expect(labels).toContain('Binyan');
    });

    it('renders **X** inside borderless table cells as <strong>', () => {
        const { container } = renderTutorMarkdown(borderlessTable);
        // No literal asterisks in the rendered text.
        expect(container.textContent).not.toMatch(/\*\*[A-Za-zÁÉÍÓÚÑáéíóúñ]/);
        const strongs = container.querySelectorAll('strong');
        const labels = Array.from(strongs).map(s => s.textContent);
        expect(labels).toContain('Morfología');
        expect(labels).toContain('Sintaxis');
        expect(labels).toContain('Semántica');
    });
});

describe('tutor markdown pipeline — callouts', () => {
    it('Ejemplo callout renders as a styled div with nested bullets', () => {
        const { container } = renderTutorMarkdown(calloutEjemplo);
        const callout = container.querySelector('[data-callout="example"]');
        expect(callout).toBeTruthy();
        // The body must contain the bullet list — NOT split into a
        // sibling rendered outside the box.
        expect(callout!.querySelector('ul')).toBeTruthy();
        // Greek runs inside the callout should still be wrapped with
        // the language span.
        expect(callout!.querySelector('span[lang="el"]')).toBeTruthy();
        // Bold labels inside the callout body remain bold.
        expect(callout!.querySelector('strong')).toBeTruthy();
    });

    it('Nota callout renders as a styled div', () => {
        const { container } = renderTutorMarkdown(calloutNota);
        expect(container.querySelector('[data-callout="note"]')).toBeTruthy();
    });

    it('Atención callout with multi-paragraph body keeps the body inside the box', () => {
        const { container } = renderTutorMarkdown(calloutMultiParagraph);
        const callout = container.querySelector('[data-callout="warning"]');
        expect(callout).toBeTruthy();
        // Multi-paragraph body — both paragraphs (separated by `>\n`)
        // must end up inside the callout container.
        const paragraphs = callout!.querySelectorAll('p');
        expect(paragraphs.length).toBeGreaterThanOrEqual(2);
        // The closing sentence about "exégesis precisa" should also
        // be inside the callout, not orphaned in a sibling node.
        expect(callout!.textContent).toMatch(/exégesis precisa/);
    });

    it('malformed inline-blockquote run is repaired into a structured callout', () => {
        const { container } = renderTutorMarkdown(malformedInlineBlockquote);
        const callout = container.querySelector('[data-callout="note"]');
        expect(callout).toBeTruthy();
        // The literal " > " runs must be gone — no raw `>` character
        // should appear inside the callout text.
        const body = callout!.textContent ?? '';
        expect(body).not.toMatch(/\s>\s/);
        // The bullets should be a real list, not inline asterisks.
        expect(callout!.querySelector('ul')).toBeTruthy();
    });
});

describe('tutor markdown pipeline — scripture references', () => {
    it('wrapScriptureRefs annotates Bible references with data-scripture markers', () => {
        // Unit-test the wrap step directly. The rendered ScriptureRef
        // component is a Popover that swallows the data-scripture attr
        // into a button child, so DOM querying for the marker doesn't
        // work end-to-end. Asserting the wrapper output ensures the
        // pipeline contract — "scripture refs leave the wrap step as
        // <span data-scripture="...">REF</span>" — is preserved.
        const wrapped = wrapScriptureRefs(scriptureRefs);
        const markers = wrapped.match(/data-scripture="[^"]+"/g) ?? [];
        // Jer 49:10, Núm 22:31, Isa 16:3, Eze 23:18, Juan 3:16, 1 Corintios 13:4-7
        expect(markers.length).toBeGreaterThanOrEqual(5);
        expect(wrapped).toMatch(/data-scripture="[^"]*Juan%203%3A16/);
        expect(wrapped).toMatch(/data-scripture="[^"]*Corintios%2013%3A4-7/);
    });
});

describe('tutor markdown pipeline — language tagging', () => {
    it('wraps Greek runs with lang="el"', () => {
        const { container } = renderTutorMarkdown(mixedGreekHebrew);
        const greekSpans = container.querySelectorAll('span[lang="el"]');
        expect(greekSpans.length).toBeGreaterThan(0);
        expect(greekSpans[0].textContent).toMatch(/[Α-Ωα-ωἀ-ᾼ]/);
    });

    it('wraps Hebrew runs with lang="he" and RTL direction', () => {
        const { container } = renderTutorMarkdown(mixedGreekHebrew);
        const hebrewSpans = container.querySelectorAll('span[lang="he"][dir="rtl"]');
        expect(hebrewSpans.length).toBeGreaterThan(0);
        expect(hebrewSpans[0].textContent).toMatch(/[֐-׿]/);
    });
});

describe('tutor markdown pipeline — idempotence', () => {
    it('well-formed prose is unchanged after the normalize step', () => {
        const wellFormed = '## Title\n\nA paragraph with **bold** and *italic*.\n\n- One\n- Two\n';
        // Normalize is the step most likely to over-reach. Outside of
        // tables and blockquotes its only job is the `> > *` repair
        // (no-op on well-formed content).
        const out = normalizeAssistantMarkdown(wellFormed);
        // Bold survives — either as `**bold**` or `<strong>bold</strong>`.
        expect(out).toMatch(/bold/);
        // No spurious blockquote markers introduced.
        expect(out.split('\n').filter(l => l.startsWith('>')).length).toBe(0);
    });

    it('does not double-bold lines that already use <strong>', () => {
        const alreadyHtml = 'Row with <strong>X</strong> already done.';
        const out = normalizeAssistantMarkdown(alreadyHtml);
        // No nested <strong> introduced.
        expect(out).not.toMatch(/<strong>\s*<strong>/);
    });

    it('preserves code-fence content verbatim', () => {
        const withCode = '```\nuse `**bold**` for emphasis\n```';
        const out = normalizeAssistantMarkdown(withCode);
        // The literal `**bold**` inside the code fence must survive
        // for didactic display.
        expect(out).toContain('**bold**');
    });
});
