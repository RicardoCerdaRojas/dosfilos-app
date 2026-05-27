import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MorphologyStep } from '../MorphologyStep';
import type { MorphologyStepData } from '@dosfilos/domain';

/**
 * Pastoral Fidelity Phase 1.5 — gate render test.
 *
 * Proves end-to-end (at the render level, independent of any browser
 * session) that the `pastoral_word_study` sub-flag drives which surface
 * MorphologyStep shows:
 *   - flag ON  → "Análisis Pastoral del Texto" (new modal entry point)
 *   - flag OFF → "Abrir tutor de griego" (Phase 1 interim, ADR-016)
 *
 * This is the automated counterpart to the manual smoke test "Step 3
 * button flips when the sub-flag is enabled".
 */

// Mock the gate hook — this is the single decision input for the button branch.
const gateMock = vi.fn();
vi.mock('@/hooks/usePastoralFidelityGate', () => ({
    usePastoralWordStudyGate: () => gateMock(),
}));

// i18n: return the key's last segment-ish so we can assert on copy without
// loading the full resource bundle. The new-button copy comes from a real
// translation key; the legacy buttons are hardcoded Spanish in the component.
vi.mock('@/i18n', () => ({
    useTranslation: () => ({
        t: (key: string) => (key === 'modal.buttonOpen' ? 'Análisis Pastoral del Texto' : key),
    }),
}));

// The modal + greek overlay are heavy children with their own data deps —
// stub them so the test isolates the button-branch logic.
vi.mock('../wordStudy/PastoralWordStudyModal', () => ({
    PastoralWordStudyModal: () => null,
}));
vi.mock('../../exegesis/greek-tutor/GreekTutorOverlay', () => ({
    GreekTutorOverlay: () => null,
}));
vi.mock('../../exegesis/greek-tutor/GreekTutorProvider', () => ({
    GreekTutorProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../stepTimer', () => ({ useStepTimer: () => {} }));
vi.mock('../StepShell', () => ({
    StepShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../StepHelp', () => ({
    StepHelp: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const baseData: MorphologyStepData = {
    wordStudies: [],
    timeSpentSeconds: 0,
};

function renderStep() {
    return render(
        <MorphologyStep
            passage="Juan 1:1"
            sermonId="s1"
            data={baseData}
            onAddWordStudy={vi.fn()}
            onChange={vi.fn()}
            onLogToolUsage={vi.fn()}
        />,
    );
}

describe('MorphologyStep — pastoral_word_study gate', () => {
    beforeEach(() => {
        cleanup();
        gateMock.mockReset();
    });

    it('shows the Pastoral Word Study entry point when the sub-flag is enabled', () => {
        gateMock.mockReturnValue({ enabled: true, loading: false });
        renderStep();
        expect(screen.getByText('Análisis Pastoral del Texto')).toBeTruthy();
        expect(screen.queryByText('Abrir tutor de griego')).toBeNull();
    });

    it('falls back to the Phase 1 greek/hebrew tutor buttons when the sub-flag is off', () => {
        gateMock.mockReturnValue({ enabled: false, loading: false });
        renderStep();
        expect(screen.getByText('Abrir tutor de griego')).toBeTruthy();
        expect(screen.getByText(/Abrir tutor de hebreo/)).toBeTruthy();
        expect(screen.queryByText('Análisis Pastoral del Texto')).toBeNull();
    });
});
