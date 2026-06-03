import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { CitationManifest } from '@dosfilos/domain';
import { SermonAttributionsSection } from '../SermonAttributionsSection';

/**
 * Phase 3 PR 5 (ADR-006 / ADR-029 §Q7) — the on-screen attribution footer.
 * Proves the licence blocks render in the published web view and that a
 * manifest without licence-bound sources renders nothing.
 */

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

function manifest(entries: CitationManifest['entries']): CitationManifest {
    return { version: '1', entries };
}

afterEach(() => cleanup());

describe('SermonAttributionsSection', () => {
    it('renders the SBLGNT base-text block (CC BY 4.0) when SBLGNT is cited', () => {
        render(
            <SermonAttributionsSection
                manifest={manifest([
                    { sourceId: 'S1', resourceId: 'sblgnt', chunkId: 'c1', title: 'SBLGNT — Juan 1:1', excerpt: '…' },
                ])}
            />,
        );
        expect(screen.getByText('attributions.title')).toBeInTheDocument();
        expect(
            screen.getByText(/The Greek New Testament: SBL Edition \(base text\)/),
        ).toBeInTheDocument();
        expect(screen.getByText(/CC BY 4\.0/)).toBeInTheDocument();
        // Morphology (BY-SA) block stays latent without the flag.
        expect(screen.queryByText(/ShareAlike/)).not.toBeInTheDocument();
    });

    it('renders the MorphGNT block when morphology is flagged', () => {
        render(
            <SermonAttributionsSection
                manifest={manifest([
                    {
                        sourceId: 'S1',
                        resourceId: 'sblgnt',
                        chunkId: 'c1',
                        title: 'SBLGNT — Juan 1:1',
                        excerpt: '…',
                        morphologyRendered: true,
                    },
                ])}
            />,
        );
        expect(screen.getByText(/MorphGNT — morphological analysis/)).toBeInTheDocument();
        expect(screen.getAllByText(/CC BY-SA 4\.0/).length).toBeGreaterThan(0);
    });

    it('renders nothing when no source needs attribution', () => {
        const { container } = render(
            <SermonAttributionsSection
                manifest={manifest([
                    { sourceId: 'S1', resourceId: 'res-pd', chunkId: 'c1', title: 'Dominio público', excerpt: '…' },
                ])}
            />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing for an absent manifest', () => {
        const { container } = render(<SermonAttributionsSection manifest={undefined} />);
        expect(container.firstChild).toBeNull();
    });
});
