import { jsPDF } from 'jspdf';
import { IExportService, SermonEntity } from '@dosfilos/domain';

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
