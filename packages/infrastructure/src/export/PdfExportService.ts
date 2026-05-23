import { jsPDF } from 'jspdf';
import {
    IExportService,
    SermonEntity,
    aggregateRequiredAttributions,
    type AttributionBlock,
    type CitationManifest,
    type RAGSource,
} from '@dosfilos/domain';

export class PdfExportService implements IExportService {
    async exportSermonToPdf(sermon: SermonEntity): Promise<void> {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;

        // Helper to check page break
        const checkPageBreak = (height: number) => {
            if (yPosition + height > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
                return true;
            }
            return false;
        };

        // Header / Branding
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('DosFilos.Preach', pageWidth - margin, 15, { align: 'right' });

        // Title
        doc.setFontSize(24);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');

        const titleLines = doc.splitTextToSize(sermon.title, contentWidth);
        doc.text(titleLines, margin, yPosition + 10);
        yPosition += (titleLines.length * 10) + 15;

        // Metadata
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');

        const dateStr = sermon.createdAt ? new Date(sermon.createdAt).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '';

        doc.text(`Fecha: ${dateStr}`, margin, yPosition);
        yPosition += 6;

        if (sermon.bibleReferences && sermon.bibleReferences.length > 0) {
            doc.text(`Referencias: ${sermon.bibleReferences.join(', ')}`, margin, yPosition);
            yPosition += 6;
        }

        if (sermon.tags && sermon.tags.length > 0) {
            doc.text(`Etiquetas: ${sermon.tags.join(', ')}`, margin, yPosition);
            yPosition += 6;
        }

        // Separator line
        yPosition += 5;
        doc.setDrawColor(200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 15;

        // Content
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont('times', 'roman'); // Serif font for better readability of long text

        // Split content by paragraphs to handle spacing better
        const paragraphs = sermon.content.split('\n');

        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                yPosition += 5; // Spacing for empty lines
                continue;
            }

            // Check if it's a header (simple heuristic: short line, no punctuation at end, or starts with #)
            const isHeader = paragraph.length < 50 && !paragraph.match(/[.,;:]$/) || paragraph.startsWith('#');

            let text = paragraph;
            if (paragraph.startsWith('#')) {
                text = paragraph.replace(/^#+\s*/, '');
            }

            if (isHeader) {
                checkPageBreak(15);
                doc.setFont('times', 'bold');
                doc.setFontSize(14);
                yPosition += 5;
            } else {
                doc.setFont('times', 'roman');
                doc.setFontSize(12);
            }

            const lines = doc.splitTextToSize(text, contentWidth);

            // Check if whole paragraph fits, if not check line by line?
            // Actually splitTextToSize handles wrapping, we just need to check vertical space
            const paragraphHeight = lines.length * 7;

            if (checkPageBreak(paragraphHeight)) {
                // If we added a page, we are at top margin.
                // If it was a header, we might want to re-apply header style if we reset?
                // No, styles persist.
            }

            doc.text(lines, margin, yPosition);
            yPosition += paragraphHeight + 3; // Line height + paragraph spacing
        }

        // Phase C.1: bibliography section. Numbered list matches the
        // inline `[N]` markers in the prose above. Manifest is the
        // authoritative source when present (set on Phase-B sermons);
        // we fall back to `sermon.bibliography` for legacy sermons so
        // the export keeps showing sources either way.
        renderBibliography(doc, {
            margin,
            pageWidth,
            pageHeight,
            contentWidth,
            yPosition,
            manifest: sermon.citationManifest,
            bibliography: sermon.bibliography,
        });

        // PR 0.3 (ADR-006): mandatory attribution footer for sources
        // under licences that require explicit attribution (CC BY 4.0,
        // CC BY-SA, etc.). Aggregates blocks from the manifest +
        // injects SBLGNT compliance when any Greek text from
        // `SBLGNTBibleProvider` made it into the manifest.
        renderAttributions(doc, {
            margin,
            pageWidth,
            pageHeight,
            contentWidth,
            blocks: aggregateRequiredAttributions(sermon.citationManifest),
        });

        // Footer with page numbers
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        // Save
        const filename = `${sermon.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        doc.save(filename);
    }
}

interface BibliographyRenderArgs {
    margin: number;
    pageWidth: number;
    pageHeight: number;
    contentWidth: number;
    yPosition: number;
    manifest?: CitationManifest;
    bibliography?: RAGSource[];
}

/**
 * Append a "Fuentes consultadas" section to the PDF. Returns nothing —
 * mutates the jsPDF doc in place (adding pages as needed).
 *
 * Numbering precedence:
 *   1. `manifest.entries` — authoritative for Phase B sermons. Numbers
 *      match the inline `[N]` markers in the prose.
 *   2. `bibliography` (legacy ragSources) — numbered 1..N in the same
 *      order the sermon was published with.
 *
 * Silently returns when neither source has anything to render so
 * non-RAG sermons don't get an empty section appended.
 */
function renderBibliography(doc: jsPDF, args: BibliographyRenderArgs): number {
    const entries = buildBibliographyEntries(args.manifest, args.bibliography);
    if (entries.length === 0) return args.yPosition;

    let yPosition = args.yPosition;
    const { margin, pageWidth, pageHeight, contentWidth } = args;

    const checkPageBreak = (height: number): number => {
        if (yPosition + height > pageHeight - margin) {
            doc.addPage();
            return margin;
        }
        return yPosition;
    };

    // Section divider + heading.
    yPosition += 15;
    yPosition = checkPageBreak(40);
    doc.setDrawColor(180);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text('Fuentes consultadas', margin, yPosition);
    yPosition += 9;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(
        'Recursos de la biblioteca usados para construir el sermón.',
        margin,
        yPosition,
    );
    yPosition += 8;

    doc.setFont('times', 'roman');
    doc.setFontSize(11);
    doc.setTextColor(20);

    entries.forEach((entry, idx) => {
        const ordinal = idx + 1;
        const author = entry.author?.trim() ? ` — ${entry.author}` : '';
        const page = entry.page?.trim() ? ` (p. ${entry.page})` : '';
        const usedFor = entry.usedFor?.trim() ? `   ${entry.usedFor}` : '';

        const headline = `[${ordinal}] ${entry.title}${author}${page}`;
        const headlineLines = doc.splitTextToSize(headline, contentWidth);
        const usedForLines = usedFor
            ? doc.splitTextToSize(usedFor, contentWidth - 6)
            : [];
        const blockHeight = (headlineLines.length * 6) + (usedForLines.length * 5) + 4;

        yPosition = checkPageBreak(blockHeight);

        doc.setFont('times', 'roman');
        doc.setFontSize(11);
        doc.setTextColor(20);
        doc.text(headlineLines, margin, yPosition);
        yPosition += headlineLines.length * 6;

        if (usedForLines.length > 0) {
            doc.setFont('times', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(110);
            doc.text(usedForLines, margin + 6, yPosition);
            yPosition += usedForLines.length * 5;
        }
        yPosition += 3;
    });

    return yPosition;
}

interface AttributionRenderArgs {
    margin: number;
    pageWidth: number;
    pageHeight: number;
    contentWidth: number;
    blocks: AttributionBlock[];
}

/**
 * Render the "Atribuciones" section for licences that require it
 * (CC BY 4.0 for SBLGNT, CC BY-SA, etc.). Always starts on its own page
 * so the legal block reads cleanly without competing with bibliography
 * entries — the legal compliance benefit outweighs the extra page.
 *
 * Returns nothing — mutates the jsPDF doc in place. Silently no-ops
 * when there are no attribution blocks to render.
 */
function renderAttributions(doc: jsPDF, args: AttributionRenderArgs): void {
    if (args.blocks.length === 0) return;

    const { margin, pageWidth, pageHeight, contentWidth } = args;
    doc.addPage();
    let yPosition = margin;

    const checkPageBreak = (height: number) => {
        if (yPosition + height > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
        }
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text('Atribuciones', margin, yPosition);
    yPosition += 9;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(110);
    const introLines = doc.splitTextToSize(
        'Atribuciones obligatorias por licencia para las fuentes citadas en este documento.',
        contentWidth,
    );
    doc.text(introLines, margin, yPosition);
    yPosition += introLines.length * 5 + 6;

    for (const block of args.blocks) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(20);
        const titleLines = doc.splitTextToSize(block.title, contentWidth);
        checkPageBreak(titleLines.length * 6 + 4);
        doc.text(titleLines, margin, yPosition);
        yPosition += titleLines.length * 6 + 2;

        doc.setFont('times', 'roman');
        doc.setFontSize(10);
        doc.setTextColor(50);
        for (const line of block.lines) {
            const wrapped = doc.splitTextToSize(line, contentWidth);
            checkPageBreak(wrapped.length * 5 + 2);
            doc.text(wrapped, margin, yPosition);
            yPosition += wrapped.length * 5 + 1;
        }
        yPosition += 5;
    }
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
