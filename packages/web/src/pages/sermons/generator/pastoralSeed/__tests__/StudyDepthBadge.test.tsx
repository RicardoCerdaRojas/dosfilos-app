import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { StudyDepthBadge } from '../StudyDepthBadge';
import { computeStudyDepthFromSeed, createEmptyPastoralSeed, DIMENSION_ORDER } from '@dosfilos/domain';

/**
 * Phase 2.5 (ADR-025) — Study Companion coverage badge.
 * Verifies the 7 dimensions render with qualitative state (no number) and
 * that the per-dim manual override fires the callback (ADR-027).
 */

vi.mock('@/i18n', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

function buildAssessment() {
    const seed = createEmptyPastoralSeed({
        id: 'seed-1',
        sermonId: 'sermon-1',
        userId: 'user-1',
        passage: 'Juan 1:1',
    });
    return computeStudyDepthFromSeed(seed);
}

describe('StudyDepthBadge', () => {
    beforeEach(() => cleanup());

    it('renders all seven dimensions with a qualitative state', () => {
        render(<StudyDepthBadge assessment={buildAssessment()} onToggleOverride={() => {}} />);
        for (const id of DIMENSION_ORDER) {
            expect(screen.getByText(`dimensions.${id}`)).toBeTruthy();
        }
        // empty seed → every dim is "untouched"; never shows a numeric score
        expect(screen.getAllByText('states.untouched').length).toBe(DIMENSION_ORDER.length);
        expect(screen.queryByText(/\b\d{1,3}\b/)).toBeNull();
    });

    it('toggling a dimension fires onToggleOverride with marked=true', () => {
        const onToggle = vi.fn();
        render(<StudyDepthBadge assessment={buildAssessment()} onToggleOverride={onToggle} />);
        const markButtons = screen.getAllByLabelText('override.ariaMark');
        expect(markButtons.length).toBe(DIMENSION_ORDER.length);
        fireEvent.click(markButtons[0]);
        expect(onToggle).toHaveBeenCalledWith(DIMENSION_ORDER[0], true);
    });
});
