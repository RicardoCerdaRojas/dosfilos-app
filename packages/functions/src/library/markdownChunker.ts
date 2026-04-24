/**
 * Markdown chunker for LlamaParse structured output.
 *
 * LlamaParse produces Markdown with:
 *   - Page markers:  <!-- page: N -->
 *   - Headings:      # (h1), ## (h2), ### (h3)
 *   - Separators:    ---  (between pages)
 *   - Regular text, tables, lists
 *
 * This chunker splits into semantic chunks that respect structure while
 * staying within a target token size.
 */

export interface MarkdownChunk {
    text: string;
    page: number;             // Best-effort page (based on <!-- page: N --> markers)
    section: string | null;   // Deepest heading (e.g. "1.2 El aoristo ingresivo")
    sectionPath: string[];    // Full heading breadcrumb, h1 → h2 → h3
    chunkType: 'narrative' | 'table' | 'list' | 'heading-only';
    charStart: number;        // Position in the original markdown
    charEnd: number;
}

export interface ChunkerOptions {
    /** Target maximum characters per chunk (roughly tokens*4). Default 2000 (~500 tokens). */
    maxChars?: number;
    /** Minimum chunk size — smaller chunks get merged with neighbours. Default 200. */
    minChars?: number;
    /** Overlap between consecutive chunks. Default 150 chars. */
    overlapChars?: number;
}

const DEFAULT_MAX = 2000;
const DEFAULT_MIN = 200;
const DEFAULT_OVERLAP = 150;

/**
 * Chunk a LlamaParse-style structured Markdown document.
 * Returns chunks with page number, section breadcrumb, and chunk type metadata.
 */
export function chunkStructuredMarkdown(
    markdown: string,
    options: ChunkerOptions = {}
): MarkdownChunk[] {
    const maxChars = options.maxChars ?? DEFAULT_MAX;
    const minChars = options.minChars ?? DEFAULT_MIN;
    const overlapChars = options.overlapChars ?? DEFAULT_OVERLAP;

    // Step 1: extract page-blocks from the page markers
    const pageBlocks = splitByPageMarkers(markdown);

    // Step 2: for each page, split by headings and track the heading hierarchy
    const rawChunks: MarkdownChunk[] = [];
    const headingStack: string[] = [];

    for (const block of pageBlocks) {
        const sections = splitBySections(block.content);

        for (const section of sections) {
            // Update the heading stack when we encounter a heading
            if (section.headingLevel !== null && section.headingText) {
                // Pop stack to proper depth, then push new heading
                headingStack.length = section.headingLevel - 1;
                headingStack.push(section.headingText);
            }

            const sectionPath = [...headingStack];
            const currentSection = sectionPath[sectionPath.length - 1] ?? null;

            // If the section body is small, keep it as one chunk
            if (section.body.length <= maxChars) {
                const text = section.body.trim();
                if (text.length >= minChars || section.headingLevel !== null) {
                    rawChunks.push({
                        text,
                        page: block.page,
                        section: currentSection,
                        sectionPath,
                        chunkType: detectChunkType(text),
                        charStart: section.charStart,
                        charEnd: section.charEnd,
                    });
                }
                continue;
            }

            // Body too big — split into character-based chunks with overlap
            const pieces = splitIntoOverlappingChunks(
                section.body,
                maxChars,
                overlapChars,
                section.charStart
            );
            for (const piece of pieces) {
                rawChunks.push({
                    text: piece.text.trim(),
                    page: block.page,
                    section: currentSection,
                    sectionPath,
                    chunkType: detectChunkType(piece.text),
                    charStart: piece.charStart,
                    charEnd: piece.charEnd,
                });
            }
        }
    }

    // Step 3: merge chunks smaller than minChars with their neighbours
    return mergeTinyChunks(rawChunks, minChars);
}

// ── Internal helpers ────────────────────────────────────────────────────────

interface PageBlock { page: number; content: string; }

function splitByPageMarkers(md: string): PageBlock[] {
    const regex = /<!--\s*page:\s*(\d+)\s*-->/gi;
    const blocks: PageBlock[] = [];
    let lastIndex = 0;
    let currentPage = 1;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(md)) !== null) {
        if (match.index > lastIndex) {
            blocks.push({
                page: currentPage,
                content: md.substring(lastIndex, match.index),
            });
        }
        currentPage = parseInt(match[1], 10);
        lastIndex = match.index + match[0].length;
    }
    // Trailing content
    if (lastIndex < md.length) {
        blocks.push({
            page: currentPage,
            content: md.substring(lastIndex),
        });
    }

    // If no page markers found, treat whole doc as page 1
    if (blocks.length === 0) {
        blocks.push({ page: 1, content: md });
    }
    return blocks;
}

interface Section {
    headingLevel: number | null;  // 1, 2, 3, ... or null for body before first heading
    headingText: string | null;
    body: string;                  // Content under this heading (until next heading)
    charStart: number;
    charEnd: number;
}

function splitBySections(text: string): Section[] {
    const sections: Section[] = [];
    // Match headings on their own line
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: Array<{ level: number; text: string; index: number; length: number }> = [];

    let m: RegExpExecArray | null;
    while ((m = headingRegex.exec(text)) !== null) {
        headings.push({
            level: m[1].length,
            text: m[2].trim(),
            index: m.index,
            length: m[0].length,
        });
    }

    if (headings.length === 0) {
        // No headings → whole text is one section
        sections.push({
            headingLevel: null,
            headingText: null,
            body: text,
            charStart: 0,
            charEnd: text.length,
        });
        return sections;
    }

    // Content before first heading
    if (headings[0].index > 0) {
        sections.push({
            headingLevel: null,
            headingText: null,
            body: text.substring(0, headings[0].index),
            charStart: 0,
            charEnd: headings[0].index,
        });
    }

    // Each heading + its body (until next heading)
    for (let i = 0; i < headings.length; i++) {
        const h = headings[i];
        const bodyStart = h.index + h.length;
        const bodyEnd = i + 1 < headings.length ? headings[i + 1].index : text.length;
        sections.push({
            headingLevel: h.level,
            headingText: h.text,
            body: text.substring(bodyStart, bodyEnd),
            charStart: bodyStart,
            charEnd: bodyEnd,
        });
    }

    return sections;
}

function splitIntoOverlappingChunks(
    text: string,
    maxChars: number,
    overlapChars: number,
    baseOffset: number
): Array<{ text: string; charStart: number; charEnd: number }> {
    const pieces: Array<{ text: string; charStart: number; charEnd: number }> = [];
    const step = Math.max(1, maxChars - overlapChars);

    for (let i = 0; i < text.length; i += step) {
        let end = Math.min(i + maxChars, text.length);

        // Try to end at a sentence/paragraph boundary if we're not at EOF
        if (end < text.length) {
            const searchWindow = Math.floor(maxChars * 0.2);
            const boundaryRegions = [
                text.lastIndexOf('\n\n', end),
                text.lastIndexOf('. ', end),
                text.lastIndexOf(' ', end),
            ];
            const bestBoundary = Math.max(...boundaryRegions.filter(b => b > i + step));
            if (bestBoundary > 0 && (end - bestBoundary) <= searchWindow) {
                end = bestBoundary;
            }
        }

        pieces.push({
            text: text.substring(i, end),
            charStart: baseOffset + i,
            charEnd: baseOffset + end,
        });

        if (end >= text.length) break;
    }

    return pieces;
}

function detectChunkType(text: string): MarkdownChunk['chunkType'] {
    const trimmed = text.trim();
    if (/^#{1,6}\s/.test(trimmed) && trimmed.split('\n').length <= 2) return 'heading-only';
    if (/(\|.+\|[\s\S]*?){3,}/.test(trimmed)) return 'table';
    if (/^(?:[-*+]|\d+\.)\s+/m.test(trimmed) && /\n(?:[-*+]|\d+\.)\s+/.test(trimmed)) return 'list';
    return 'narrative';
}

function mergeTinyChunks(chunks: MarkdownChunk[], minChars: number): MarkdownChunk[] {
    if (chunks.length === 0) return chunks;

    const merged: MarkdownChunk[] = [];
    let buffer: MarkdownChunk | null = null;

    for (const chunk of chunks) {
        if (chunk.text.length < minChars && buffer !== null && sameSection(buffer, chunk)) {
            // Merge into buffer
            const prev: MarkdownChunk = buffer;
            buffer = {
                text: prev.text + '\n\n' + chunk.text,
                page: prev.page,
                section: prev.section,
                sectionPath: prev.sectionPath,
                chunkType: prev.chunkType,
                charStart: prev.charStart,
                charEnd: chunk.charEnd,
            };
            continue;
        }
        if (buffer !== null) merged.push(buffer);
        buffer = chunk;
    }
    if (buffer !== null) merged.push(buffer);

    return merged;
}

function sameSection(a: MarkdownChunk, b: MarkdownChunk): boolean {
    if (a.sectionPath.length !== b.sectionPath.length) return false;
    return a.sectionPath.every((s, i) => s === b.sectionPath[i]);
}
