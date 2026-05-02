import type { BibleBookId } from '../../bible/canon/BibleCanon';
import type { BookPanorama } from './BookPanorama';
import type { ExegeticalUnit } from './ExegeticalUnit';
import type { FidelityReview } from './FidelityReview';
import type { MacroSection } from './MacroSection';
import type { PreachableUnit } from './PreachableUnit';

/**
 * Aggregator for one full traversal of the 5-pass expository
 * assistant pipeline. Held in memory by the wizard during the run
 * and (in v1.5) optionally persisted to localStorage as draft state
 * so the pastor can recover after a tab close.
 *
 * NOT persisted to Firestore in v1.5 — the only thing that lives
 * server-side is the final SermonSeries the pastor creates from the
 * accepted PreachableUnits. v1.6+ may persist the full run for
 * audit / "edit later" workflows.
 *
 * Each pass output is optional; the wizard renders pending / running /
 * done state per pass based on which outputs are populated.
 */
export interface ExpositoryAssistantRun {
    /** Stable id for the run (uuid). */
    id: string;
    /** Book the run targets. */
    bookId: BibleBookId;
    /** Display language used for prompts and outputs. */
    displayLanguage: 'es' | 'en';
    /** Optional soft constraint on preachable-unit count from the wizard setup form. */
    targetPreachableCount?: number;
    /** Wall-clock ISO timestamps for each pass (set when each completes). */
    timestamps: {
        startedAt: string;
        panoramaAt?: string;
        macroAt?: string;
        microAt?: string;
        preachableAt?: string;
        reviewAt?: string;
    };

    /** Pase 1 output. */
    panorama?: BookPanorama;
    /** Pase 2 output. */
    macroSections?: MacroSection[];
    /** Pase 3 output. */
    exegeticalUnits?: ExegeticalUnit[];
    /** Pase 4 output. */
    preachableUnits?: PreachableUnit[];
    /** Pase 5 output. */
    fidelityReview?: FidelityReview;

    /**
     * Stable signature of the full pipeline + inputs. Used as the
     * value persisted on `series.metadata.expository.pericopeAssistantVersion`
     * (the existing field from commit 1.1) so re-runs with identical
     * inputs can short-circuit. Format:
     * `${modelId}@${pipelineVersion}#${inputHash.slice(0,12)}`.
     */
    runVersion?: string;
}
