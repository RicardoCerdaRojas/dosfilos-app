/**
 * Maps every Extraction type to its i18n key under the `faculty:`
 * namespace. Used to derive a fallback title for newly-generated
 * artifacts and to label rows in the Generados list.
 *
 * Keep in sync with `extraction.*` in `i18n/locales/{es,en}/faculty.json`.
 */
export const EXTRACTION_TITLE_KEYS: Record<string, string> = {
    SERMON: 'extraction.sermonOutline',
    BIBLE_STUDY: 'extraction.bibleStudy',
    COUNSELING_TASK: 'extraction.counselingTask',
    NEWSLETTER: 'extraction.newsletter',
    SYSTEMATIC_THEOLOGY_PAPER: 'extraction.theologyPaper',
    BLOG_POST: 'extraction.blogPost',
    DEVOTIONAL: 'extraction.devotional',
};
