import {
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun,
} from 'docx';
import type { CitationManifest, RAGSource, Sermon } from '@dosfilos/domain';

/**
 * Renders a `Sermon` to a Word `.docx` Blob, preserving the inline
 * `[N]` citation markers as visible footnote-style references and
 * appending a "Fuentes consultadas" section that matches their
 * numbering.
 *
 * Numbering precedence mirrors `SermonBibliographySection`:
 *   1. `sermon.citationManifest.entries` — Phase B authoritative source.
 *      Bibliography numbered to line up 1:1 with prose markers.
 *   2. `sermon.bibliography` (legacy ragSources) — numbered in order
 *      the sermon was published with.
 *
 * Out of scope for v1 (acceptable since pastors hand the file off as a
 * read-only handout, not a Word document they edit further):
 *   - True Word footnotes (parens stay inline as `[1]`).
 *   - Markdown formatting beyond headings/paragraphs (no bold/italic
 *     run extraction — the raw markdown reads clearly enough).
 *   - Blockquotes / lists (rendered as plain paragraphs).
 */
export async function exportSermonToDocx(sermon: Sermon): Promise<Blob> {
    const paragraphs: Paragraph[] = [];

    // Title block.
    paragraphs.push(new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: sermon.title })],
    }));

    // Metadata line (date + bible references).
    const meta: string[] = [];
    if (sermon.createdAt) {
        meta.push(new Date(sermon.createdAt).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }));
    }
    if (sermon.bibleReferences && sermon.bibleReferences.length > 0) {
        meta.push(`Referencias: ${sermon.bibleReferences.join(', ')}`);
    }
    if (meta.length > 0) {
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: meta.join(' • '), italics: true, color: '666666' })],
            spacing: { after: 240 },
        }));
    }

    // Content body. Split on blank lines for paragraph breaks; treat
    // heading-leading lines (`#`, `##`, `###`) as Heading2/3/4.
    const blocks = sermon.content.split(/\n+/);
    for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = headingMatch[2];
            paragraphs.push(new Paragraph({
                heading:
                    level === 1 ? HeadingLevel.HEADING_1
                    : level === 2 ? HeadingLevel.HEADING_2
                    : level === 3 ? HeadingLevel.HEADING_3
                    : HeadingLevel.HEADING_4,
                children: [new TextRun({ text: stripMarkdownEmphasis(text) })],
            }));
            continue;
        }

        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: stripMarkdownEmphasis(trimmed) })],
            spacing: { after: 160 },
        }));
    }

    // Bibliography section. Same logic as PDF + the on-screen
    // SermonBibliographySection: manifest is authoritative when
    // present, ragSources is the legacy fallback.
    const entries = buildBibliographyEntries(sermon.citationManifest, sermon.bibliography);
    if (entries.length > 0) {
        paragraphs.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Fuentes consultadas' })],
            spacing: { before: 480, after: 120 },
        }));
        paragraphs.push(new Paragraph({
            children: [new TextRun({
                text: 'Recursos de la biblioteca usados para construir el sermón.',
                italics: true,
                color: '666666',
            })],
            spacing: { after: 160 },
        }));
        entries.forEach((entry, idx) => {
            const ordinal = idx + 1;
            const author = entry.author?.trim() ? ` — ${entry.author}` : '';
            const page = entry.page?.trim() ? ` (p. ${entry.page})` : '';
            paragraphs.push(new Paragraph({
                children: [
                    new TextRun({ text: `[${ordinal}] `, bold: true }),
                    new TextRun({ text: `${entry.title}${author}${page}` }),
                ],
                spacing: { after: entry.usedFor ? 60 : 120 },
            }));
            if (entry.usedFor) {
                paragraphs.push(new Paragraph({
                    children: [new TextRun({
                        text: entry.usedFor,
                        italics: true,
                        color: '666666',
                    })],
                    indent: { left: 360 },
                    spacing: { after: 120 },
                }));
            }
        });
    }

    const doc = new Document({
        sections: [{ properties: {}, children: paragraphs }],
    });

    return Packer.toBlob(doc);
}

interface BibliographyEntry {
    title: string;
    author?: string;
    page?: string;
    usedFor?: string;
}

function buildBibliographyEntries(
    manifest: CitationManifest | undefined,
    bibliography: RAGSource[] | undefined,
): BibliographyEntry[] {
    if (manifest && manifest.entries.length > 0) {
        const ragBySourceId = new Map<string, RAGSource>();
        for (const rag of bibliography ?? []) {
            if (rag.sourceId) ragBySourceId.set(rag.sourceId, rag);
        }
        return manifest.entries.map((entry) => {
            const rag = ragBySourceId.get(entry.sourceId);
            return {
                title: rag?.title || entry.title,
                author: rag?.author || entry.author,
                page: rag?.page || entry.page,
                usedFor: rag?.usedFor,
            };
        });
    }
    return (bibliography ?? [])
        .filter((s) => s?.title?.trim())
        .map((s) => ({
            title: s.title,
            author: s.author,
            page: s.page,
            usedFor: s.usedFor,
        }));
}

// Minimal markdown emphasis stripper — removes `**`, `*`, `__`, `_`
// around runs but leaves the visible text alone. Docx authoring of
// proper bold/italic runs is a v2 lift; the current shape preserves
// readability without burying the words inside Markdown syntax.
function stripMarkdownEmphasis(text: string): string {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/_([^_\n]+)_/g, '$1');
}
