/**
 * Extracted text result with metadata
 */
export interface ExtractedText {
    text: string;
    pageCount?: number;
    metadata?: {
        title?: string;
        author?: string;
        creationDate?: Date;
    };
}

/**
 * ITextExtractor - Interface for extracting text from documents
 * Supports multiple document formats (PDF, DOCX, etc.)
 */
export interface ITextExtractor {
    /**
     * Extract text from a document URL (e.g., Firebase Storage URL)
     * @param url - URL of the document to extract text from
     * @returns Extracted text with metadata
     */
    extractFromUrl(url: string): Promise<ExtractedText>;

    /**
     * Extract text from a file buffer
     * @param buffer - File buffer
     * @param mimeType - MIME type of the file
     * @returns Extracted text with metadata
     */
    extractFromBuffer(buffer: Buffer, mimeType: string): Promise<ExtractedText>;

    /**
     * Check if a MIME type is supported
     */
    supportsType(mimeType: string): boolean;
}
