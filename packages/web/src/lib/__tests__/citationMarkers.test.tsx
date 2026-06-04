/**
 * Citation marker pipeline tests.
 *
 * `wrapCitationMarkers` is the bridge between the Phase B server
 * validator (which emits bare `[N]` / `[N, M]` markers) and the
 * react-markdown component map that turns the resulting span tags into
 * interactive popovers. The contracts this suite codifies:
 *
 *   1. Only digit-leading brackets become spans. Bible-link brackets
 *      (`[📖 …]`), prose brackets (`[author note]`), and markdown
 *      footnotes (`[^1]`) MUST pass through untouched.
 *   2. Multi-cite groups preserve the original visible text inside the
 *      span so the prose still reads naturally when the manifest is
 *      absent (graceful degradation).
 *   3. Markdown link syntax `[1](url)` is NOT wrapped — the lookahead
 *      avoids interfering with numeric labeled links.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { CitationManifestContext, CitationMarker, wrapCitationMarkers } from '../citationMarkers';
import type { CitationManifest } from '@dosfilos/domain';

vi.mock('@/components/ui/popover', () => ({
    Popover: ({ children }: any) => <div data-popover>{children}</div>,
    PopoverTrigger: ({ children }: any) => <div data-trigger>{children}</div>,
    PopoverContent: ({ children }: any) => <div data-content>{children}</div>,
}));

function manifest(n: number): CitationManifest {
    return {
        version: '1',
        entries: Array.from({ length: n }, (_, i) => ({
            sourceId: `S${i + 1}`,
            resourceId: `r${i + 1}`,
            chunkId: `c${i + 1}`,
            title: `Title ${i + 1}`,
            author: `Author ${i + 1}`,
            page: `${i + 1}`,
            excerpt: `Excerpt ${i + 1}`,
        })),
    };
}

describe('wrapCitationMarkers', () => {
    it('wraps a single bare ordinal marker', () => {
        expect(wrapCitationMarkers('See [1] here.')).toBe('See <span data-cite-id="1">[1]</span> here.');
    });

    it('wraps multi-cite groups and normalizes whitespace in the id list', () => {
        expect(wrapCitationMarkers('Per [1, 3] and [2,5].'))
            .toBe('Per <span data-cite-id="1,3">[1, 3]</span> and <span data-cite-id="2,5">[2,5]</span>.');
    });

    it('does NOT wrap markdown link syntax [1](url)', () => {
        expect(wrapCitationMarkers('See [1](http://x).')).toBe('See [1](http://x).');
    });

    it('leaves non-digit brackets alone (Bible refs, prose)', () => {
        const src = 'See [📖 Juan 1:1](#bible-juan-1-1) and [author note].';
        expect(wrapCitationMarkers(src)).toBe(src);
    });

    it('leaves footnote markers [^1] alone', () => {
        expect(wrapCitationMarkers('Note[^1] here.')).toBe('Note[^1] here.');
    });

    it('preserves visible [N] text inside the span for graceful degradation', () => {
        expect(wrapCitationMarkers('[2]')).toContain('>[2]<');
    });
});

describe('CitationMarker (rendered via markdown pipeline)', () => {
    function render_(markdown: string, mf?: CitationManifest) {
        return render(
            <CitationManifestContext.Provider value={mf}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                        span: ({ node, ...props }: any) =>
                            props['data-cite-id']
                                ? <CitationMarker {...props} />
                                : <span {...props} />,
                    }}
                >
                    {wrapCitationMarkers(markdown)}
                </ReactMarkdown>
            </CitationManifestContext.Provider>,
        );
    }

    it('renders a popover button per resolved citation id', () => {
        const { container } = render_('Cite [1] and [2, 3].', manifest(3));
        const buttons = container.querySelectorAll('button[aria-label^="Ver fuente"]');
        expect(buttons).toHaveLength(3);
        expect(buttons[0]?.textContent).toBe('1');
        expect(buttons[1]?.textContent).toBe('2');
        expect(buttons[2]?.textContent).toBe('3');
    });

    it('surfaces the PRECISE citation in the popover: book + page + exact chunk text (ADR-031)', () => {
        const mf: CitationManifest = {
            version: '1',
            entries: [{
                sourceId: 'S1',
                resourceId: 'r1',
                chunkId: 'c1',
                title: 'Volvamos a la predicación Bíblica',
                author: 'Donald R. Subukjian',
                page: '102',
                excerpt: 'La doctrina es el negocio principal del predicador.',
            }],
        };
        const { container } = render_('Como enseña Subukjian [1].', mf);
        // The narrative prose remains.
        expect(container.textContent).toContain('Como enseña Subukjian');
        // The anchor is a clickable element labelled with the book.
        const trigger = container.querySelector('button[aria-label^="Ver fuente"]');
        expect(trigger).not.toBeNull();
        // The popover content carries the verifiable, precise citation:
        expect(container.textContent).toContain('Volvamos a la predicación Bíblica'); // book
        expect(container.textContent).toContain('Donald R. Subukjian');               // author
        expect(container.textContent).toContain('102');                                // page
        expect(container.textContent).toContain(
            'La doctrina es el negocio principal del predicador.',                      // exact chunk text
        );
    });

    it('falls back to plain [N] text when manifest is missing', () => {
        const { container } = render_('Cite [1] here.', undefined);
        expect(container.textContent).toContain('[1]');
        expect(container.querySelector('button[aria-label^="Ver fuente"]')).toBeNull();
    });

    it('falls back to plain text when ID is out of manifest range', () => {
        const { container } = render_('Cite [99] here.', manifest(3));
        expect(container.textContent).toContain('[99]');
        expect(container.querySelector('button[aria-label^="Ver fuente"]')).toBeNull();
    });

    it('renders one popover per surviving id in a multi-cite group when some are invalid', () => {
        const { container } = render_('Cite [1, 99] here.', manifest(3));
        const buttons = container.querySelectorAll('button[aria-label^="Ver fuente"]');
        expect(buttons).toHaveLength(1);
        expect(buttons[0]?.textContent).toBe('1');
    });
});
