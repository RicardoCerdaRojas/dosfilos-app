import type { PassageReference } from '../../bible/canon/passage-reference';
import type { ExegeticalPaperPhase } from './ExegeticalPaper';

/**
 * Lightweight projection of an `ExegeticalPaper` for the list/dashboard.
 *
 * The full paper carries `steps[].versions[]` (append-only markdown history),
 * `assembledMarkdown`, `sources[]`, rubric + plan — by far the largest doc in
 * the app. The list only needs the headline fields + three counts. This
 * summary is what the `getExegesisPapersSummary` callable returns so the full
 * papers never cross the wire just to draw the list. The full paper is loaded
 * via `getPaper` only when one is opened.
 */
export interface ExegesisPaperSummary {
    id: string;
    title?: string;
    passage: PassageReference;
    displayLanguage: 'es' | 'en';
    phase: ExegeticalPaperPhase;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    assignmentBrief: string | null;
    /** `steps.length` — total planned/generated steps. */
    stepCount: number;
    /** Count of steps with a non-null `accepted` decision. */
    acceptedStepCount: number;
    /** `sources.length` — corpus size. */
    sourceCount: number;
}
