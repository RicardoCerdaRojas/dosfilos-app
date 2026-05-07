import {
    Document,
    Footer,
    FootnoteReferenceRun,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun,
} from 'docx';
import {
    exportPaperToMarkdown,
    formatPassageReference,
    type ExegeticalPaper,
} from '@dosfilos/domain';

/**
 * Renders an `ExegeticalPaper` to a Word `.docx` Blob with NATIVE
 * footnotes — the killer-feature gap vs the markdown export.
 *
 * Source-of-truth precedence mirrors `exportPaperToMarkdown`:
 *   1. `paper.assembledMarkdown` if present (post-assembly canonical).
 *   2. Fall back to the same routine the markdown exporter uses, so
 *      any partial state is consistent across the two formats.
 *
 * Pipeline:
 *   1. Take the assembled markdown (calling the existing exporter so
 *      header/title/passage/brief render identically).
 *   2. Parse blocks (headings / paragraphs / lists / blockquotes).
 *   3. For each paragraph, walk the inline content; convert every
 *      `(Author, "Title", p. N)` parenthetical into a real Word
 *      footnote that contains the same citation text. Preserves
 *      `**bold**` and `*italic*` runs.
 *   4. Assemble a Document with the registered footnotes and Pack it
 *      to a Blob the caller can hand to a download anchor.
 *
 * Why footnotes from the parenthetical (vs full TMS rendering): the
 * `DeterministicStyleFormatter` already produces TMS-shape strings at
 * generation time (first/subsequent/ibid). The exporter just needs to
 * relocate them from inline parentheticals to native footnote bodies
 * — which is the academic export the seminary actually wants.
 */
export async function exportPaperToDocx(
    paper: ExegeticalPaper,
    options: { exportedAt?: Date } = {},
): Promise<Blob> {
    const exportedAt = options.exportedAt ?? new Date();
    const markdown = exportPaperToMarkdown(paper, { exportedAt });
    const titleDisplay = paper.title?.trim()
        || formatPassageReference(paper.passage, paper.displayLanguage);

    const blocks = parseMarkdownBlocks(markdown);
    const footnotes: Record<number, { children: Paragraph[] }> = {};
    let footnoteCounter = 0;

    const paragraphs: Paragraph[] = [];
    for (const block of blocks) {
        switch (block.type) {
            case 'heading':
                paragraphs.push(new Paragraph({
                    heading: HEADING_LEVELS[Math.min(block.level, 3) as 1 | 2 | 3],
                    children: [new TextRun({ text: block.text })],
                }));
                break;
            case 'paragraph':
                paragraphs.push(new Paragraph({
                    children: buildInlineRuns(block.text, registerFootnote),
                    spacing: { after: 160 },
                }));
                break;
            case 'list-item':
                paragraphs.push(new Paragraph({
                    children: buildInlineRuns(block.text, registerFootnote),
                    bullet: { level: 0 },
                }));
                break;
            case 'blockquote':
                paragraphs.push(new Paragraph({
                    children: buildInlineRuns(block.text, registerFootnote),
                    indent: { left: 720 },
                    spacing: { after: 160 },
                }));
                break;
            case 'rule':
                paragraphs.push(new Paragraph({
                    children: [new TextRun({ text: '___', color: '999999' })],
                    spacing: { after: 240 },
                }));
                break;
        }
    }

    const doc = new Document({
        title: titleDisplay,
        creator: 'Dosfilos · Exegesis',
        footnotes,
        sections: [
            {
                properties: {},
                footers: {
                    default: new Footer({
                        children: [new Paragraph({ children: [new TextRun({ text: titleDisplay, size: 18, color: '999999' })] })],
                    }),
                },
                children: paragraphs,
            },
        ],
    });

    return await Packer.toBlob(doc);

    function registerFootnote(citationText: string): number {
        footnoteCounter += 1;
        footnotes[footnoteCounter] = {
            children: [
                new Paragraph({
                    children: [new TextRun({ text: citationText })],
                }),
            ],
        };
        return footnoteCounter;
    }
}

const HEADING_LEVELS = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
} as const;

// ── Markdown parsing (block level) ──────────────────────────────────

type Block =
    | { type: 'heading'; level: 1 | 2 | 3; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'list-item'; text: string }
    | { type: 'blockquote'; text: string }
    | { type: 'rule' };

/**
 * Tiny block-level parser tailored to exegetical paper output.
 * Handles `#` `##` `###` headings, `-`/`*` lists, `>` blockquotes,
 * `---` rules, and paragraph blocks separated by blank lines. Inline
 * formatting is left in the text and parsed at run-render time.
 */
function parseMarkdownBlocks(markdown: string): Block[] {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const blocks: Block[] = [];
    let buffer: string[] = [];

    const flushParagraph = () => {
        if (buffer.length === 0) return;
        const text = buffer.join(' ').trim();
        if (text) blocks.push({ type: 'paragraph', text });
        buffer = [];
    };

    for (const raw of lines) {
        const line = raw.trimEnd();
        if (line.trim() === '') {
            flushParagraph();
            continue;
        }
        if (/^---+$/.test(line.trim())) {
            flushParagraph();
            blocks.push({ type: 'rule' });
            continue;
        }
        const heading = line.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
            flushParagraph();
            blocks.push({
                type: 'heading',
                level: heading[1]!.length as 1 | 2 | 3,
                text: heading[2]!.trim(),
            });
            continue;
        }
        const list = line.match(/^[-*]\s+(.+)$/);
        if (list) {
            flushParagraph();
            blocks.push({ type: 'list-item', text: list[1]!.trim() });
            continue;
        }
        const quote = line.match(/^>\s?(.*)$/);
        if (quote) {
            flushParagraph();
            blocks.push({ type: 'blockquote', text: quote[1]!.trim() });
            continue;
        }
        buffer.push(line);
    }
    flushParagraph();
    return blocks;
}

// ── Inline run rendering ────────────────────────────────────────────

const CITATION_PATTERN =
    /\(\s*([^,()]+?)\s*,\s*"([^"]+)"(?:\s*,\s*(?:pp?\.\s*)?([\d–\-—,\s]+))?\s*\)/g;
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;
const ITALIC_PATTERN = /(?<!\*)\*([^*]+)\*(?!\*)/g;

/**
 * Walks a paragraph's text, emitting Word runs:
 *   - Inline citations `(...)` are stripped and registered as
 *     footnotes; a `FootnoteReferenceRun` is inserted at the citation
 *     position.
 *   - `**bold**` and `*italic*` markers become run-level formatting.
 *
 * Conservative: anything the regexes don't match falls through as
 * plain text. The orchestrator's output stays predictable, so a small
 * matcher is enough — we don't need a full markdown AST.
 */
function buildInlineRuns(
    paragraphText: string,
    registerFootnote: (citationText: string) => number,
): Array<TextRun | FootnoteReferenceRun> {
    interface Marker {
        kind: 'citation' | 'bold' | 'italic';
        start: number;
        end: number;
        body: string;
    }
    const markers: Marker[] = [];

    CITATION_PATTERN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CITATION_PATTERN.exec(paragraphText)) !== null) {
        const fullMatch = m[0];
        const innerText = fullMatch.replace(/^\(\s*/, '').replace(/\s*\)$/, '');
        markers.push({
            kind: 'citation',
            start: m.index,
            end: m.index + fullMatch.length,
            body: innerText,
        });
    }
    BOLD_PATTERN.lastIndex = 0;
    while ((m = BOLD_PATTERN.exec(paragraphText)) !== null) {
        if (overlapsExisting(m.index, m.index + m[0].length, markers)) continue;
        markers.push({
            kind: 'bold',
            start: m.index,
            end: m.index + m[0].length,
            body: m[1] ?? '',
        });
    }
    ITALIC_PATTERN.lastIndex = 0;
    while ((m = ITALIC_PATTERN.exec(paragraphText)) !== null) {
        if (overlapsExisting(m.index, m.index + m[0].length, markers)) continue;
        markers.push({
            kind: 'italic',
            start: m.index,
            end: m.index + m[0].length,
            body: m[1] ?? '',
        });
    }
    markers.sort((a, b) => a.start - b.start);

    const runs: Array<TextRun | FootnoteReferenceRun> = [];
    let cursor = 0;
    for (const mk of markers) {
        if (mk.start > cursor) {
            runs.push(new TextRun({ text: paragraphText.slice(cursor, mk.start) }));
        }
        if (mk.kind === 'citation') {
            const id = registerFootnote(mk.body);
            runs.push(new FootnoteReferenceRun(id));
        } else if (mk.kind === 'bold') {
            runs.push(new TextRun({ text: mk.body, bold: true }));
        } else {
            runs.push(new TextRun({ text: mk.body, italics: true }));
        }
        cursor = mk.end;
    }
    if (cursor < paragraphText.length) {
        runs.push(new TextRun({ text: paragraphText.slice(cursor) }));
    }
    return runs.length > 0 ? runs : [new TextRun({ text: paragraphText })];
}

function overlapsExisting(
    start: number,
    end: number,
    markers: Array<{ start: number; end: number }>,
): boolean {
    return markers.some(mk => start < mk.end && end > mk.start);
}
