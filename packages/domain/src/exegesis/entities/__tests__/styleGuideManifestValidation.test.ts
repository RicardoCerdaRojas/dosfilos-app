import { describe, it, expect } from 'vitest';
import {
    DEFAULT_TMS_STYLE_MANIFEST,
    extractPlaceholders,
    hasManifestValidationErrors,
    validateStyleGuideManifest,
    type StyleGuideManifest,
} from '../StyleGuideManifest';

function withOverrides(patch: Partial<StyleGuideManifest>): StyleGuideManifest {
    return { ...DEFAULT_TMS_STYLE_MANIFEST, ...patch };
}

describe('extractPlaceholders', () => {
    it('returns the names inside {curly} placeholders', () => {
        expect(extractPlaceholders('{author}, {title}, {pages}.')).toEqual([
            'author', 'title', 'pages',
        ]);
    });

    it('returns empty for templates with no placeholders', () => {
        expect(extractPlaceholders('Just plain text.')).toEqual([]);
    });

    it('ignores non-identifier braces', () => {
        expect(extractPlaceholders('{1invalid} {valid}')).toEqual(['valid']);
    });
});

describe('validateStyleGuideManifest', () => {
    it('default TMS manifest validates clean', () => {
        expect(validateStyleGuideManifest(DEFAULT_TMS_STYLE_MANIFEST)).toEqual([]);
    });

    it('errors on empty firstMentionTemplate', () => {
        const issues = validateStyleGuideManifest(withOverrides({
            footnotes: { ...DEFAULT_TMS_STYLE_MANIFEST.footnotes, firstMentionTemplate: '   ' },
        }));
        expect(issues.some(i => i.path === 'footnotes.firstMentionTemplate' && i.code === 'empty-template')).toBe(true);
        expect(hasManifestValidationErrors(issues)).toBe(true);
    });

    it('errors on empty bibliography template', () => {
        const issues = validateStyleGuideManifest(withOverrides({
            bibliography: { ...DEFAULT_TMS_STYLE_MANIFEST.bibliography, entryTemplate: '' },
        }));
        expect(issues.some(i => i.path === 'bibliography.entryTemplate' && i.code === 'empty-template')).toBe(true);
    });

    it('warns on unknown placeholder in template', () => {
        const issues = validateStyleGuideManifest(withOverrides({
            footnotes: {
                ...DEFAULT_TMS_STYLE_MANIFEST.footnotes,
                firstMentionTemplate: '{author}, {nope}, {pages}.',
            },
        }));
        const issue = issues.find(i => i.code === 'unknown-placeholder');
        expect(issue).toBeDefined();
        expect(issue?.severity).toBe('warning');
        expect(issue?.context?.placeholder).toBe('nope');
    });

    it('errors on non-positive block-quote threshold', () => {
        const issues = validateStyleGuideManifest(withOverrides({
            quotations: { ...DEFAULT_TMS_STYLE_MANIFEST.quotations, blockQuoteThresholdWords: 0 },
        }));
        expect(issues.some(i => i.code === 'non-positive-threshold')).toBe(true);
        expect(hasManifestValidationErrors(issues)).toBe(true);
    });

    it('errors on empty quote marks', () => {
        const issues = validateStyleGuideManifest(withOverrides({
            quotations: { ...DEFAULT_TMS_STYLE_MANIFEST.quotations, primaryQuoteMark: '' },
        }));
        expect(issues.some(i => i.path === 'quotations.primaryQuoteMark' && i.code === 'empty-quote-mark')).toBe(true);
    });

    it('errors when transliteration is enabled but scheme empty', () => {
        const issues = validateStyleGuideManifest(withOverrides({
            transliteration: { scheme: '   ', useDiacritics: true, bodyRequiresTransliteration: false },
        }));
        expect(issues.some(i => i.code === 'transliteration-empty-scheme')).toBe(true);
    });

    it('does not error when transliteration is null (no rules)', () => {
        const issues = validateStyleGuideManifest(withOverrides({
            transliteration: null,
        }));
        expect(issues.some(i => i.code === 'transliteration-empty-scheme')).toBe(false);
    });

    it('warns on empty additional rule entries', () => {
        const issues = validateStyleGuideManifest(withOverrides({
            additionalRules: ['Real rule', '   ', 'Another rule'],
        }));
        expect(issues.some(i => i.code === 'empty-additional-rule')).toBe(true);
    });

    it('warns on duplicate additional rules (case-insensitive)', () => {
        const issues = validateStyleGuideManifest(withOverrides({
            additionalRules: ['Use serial commas', 'use serial commas'],
        }));
        expect(issues.some(i => i.code === 'duplicate-additional-rule')).toBe(true);
    });

    it('hasManifestValidationErrors returns false when only warnings', () => {
        const issues = validateStyleGuideManifest(withOverrides({
            additionalRules: ['Use serial commas', 'use serial commas'],
        }));
        expect(hasManifestValidationErrors(issues)).toBe(false);
    });
});
