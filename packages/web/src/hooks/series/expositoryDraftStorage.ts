import type {
    AssistantVerseInput,
    BibleBookId,
    BookPanorama,
    ExegeticalUnit,
    FidelityReview,
    MacroSection,
    PreachableUnit,
} from '@dosfilos/domain';

/**
 * localStorage draft persistence for the v1.5 expository assistant
 * wizard. v1.5 doesn't persist intermediate runs in Firestore — only
 * the final SermonSeries lives server-side. The draft saves the
 * pastor from losing 90 seconds of pipeline work to an accidental
 * tab close.
 *
 * Contract:
 *   - Single key per browser; only one draft at a time. New runs
 *     overwrite the previous draft (the pastor explicitly clicked
 *     "Iniciar análisis" again).
 *   - 24h TTL. Stale drafts are dropped on hydration to avoid
 *     showing a pastor a week-old run when they return to the page.
 *   - Schema versioning so v1.6 can ignore v1.5 drafts cleanly.
 *   - SSR-safe: every accessor checks `typeof window !== 'undefined'`.
 */

const DRAFT_KEY = 'dosfilos.expositoryAssistant.draft';
const DRAFT_SCHEMA_VERSION = 'v1';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export interface ExpositoryDraft {
    schemaVersion: typeof DRAFT_SCHEMA_VERSION;
    /** ISO timestamp the draft was last written. Used for TTL. */
    savedAt: string;
    bookId: BibleBookId;
    displayLanguage: 'es' | 'en';
    bookDisplay: string;
    targetPreachableCount?: number;
    verses: AssistantVerseInput[];
    panorama?: BookPanorama;
    macroSections?: MacroSection[];
    exegeticalUnits?: ExegeticalUnit[];
    preachableUnits?: PreachableUnit[];
    fidelityReview?: FidelityReview;
    /**
     * Pase 5 issue triage: indices the pastor explicitly marked as
     * "addressed" (acted upon, e.g. via inline edit in Pase 4) or
     * "ignored" (read but chose to keep the original division).
     * Indices reference positions in `fidelityReview.issues[]`. The
     * two sets are mutually exclusive — toggling one removes the
     * other.
     */
    addressedIssueIndices?: number[];
    ignoredIssueIndices?: number[];
}

export function saveExpositoryDraft(draft: Omit<ExpositoryDraft, 'schemaVersion' | 'savedAt'>): void {
    if (typeof window === 'undefined') return;
    try {
        const payload: ExpositoryDraft = {
            schemaVersion: DRAFT_SCHEMA_VERSION,
            savedAt: new Date().toISOString(),
            ...draft,
        };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch (err) {
        // localStorage can throw on quota exceeded or in private mode;
        // a failed save is a non-fatal degradation (the wizard still
        // works in-memory).
        console.warn('[expository] saveDraft failed:', err);
    }
}

export function loadExpositoryDraft(): ExpositoryDraft | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(DRAFT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ExpositoryDraft;
        if (parsed.schemaVersion !== DRAFT_SCHEMA_VERSION) return null;
        const savedAt = Date.parse(parsed.savedAt);
        if (!Number.isFinite(savedAt) || Date.now() - savedAt > DRAFT_TTL_MS) {
            // Stale — drop it so the pastor doesn't see ancient state.
            window.localStorage.removeItem(DRAFT_KEY);
            return null;
        }
        return parsed;
    } catch (err) {
        console.warn('[expository] loadDraft failed:', err);
        return null;
    }
}

export function clearExpositoryDraft(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
        console.warn('[expository] clearDraft failed:', err);
    }
}
