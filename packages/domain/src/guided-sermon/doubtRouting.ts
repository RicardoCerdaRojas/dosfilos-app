/**
 * ADR-034 — Deterministic doubt capture + routing.
 *
 * The Socratic feedback contract (PR1) instructs the LLM to acknowledge a
 * pastor's doubt and route it to the step that resolves it, without
 * answering. This module makes that route DETERMINISTIC + PERSISTED so a
 * raised doubt never silently depends on model adherence and never gets
 * lost — it is pinned to `PastoralSeed.openDoubts` and can resurface later
 * (Paso 8 `openQuestion`, wizard).
 *
 * PURE: no I/O. The use case calls `detectRaisedDoubt` → `routeDoubt` →
 * `appendDoubt` and composes the reminder line with `buildDoubtRoutingNote`.
 */

import { PASTORAL_SEED_STEP_ORDER, type PastoralSeedStepKey } from '../entities/PastoralSeed';

/** A doubt the pastor raised mid-study, captured + routed (never answered). */
export interface RaisedDoubt {
    /** Step the pastor was on when the doubt surfaced. */
    step: PastoralSeedStepKey;
    /** The doubt text (the sentence that carried the question). */
    text: string;
    /** Steps that resolve it (1-2), in canonical order. */
    routedToSteps: PastoralSeedStepKey[];
    /** Human label for the route, e.g. "Paso 4 (palabras) + Paso 5 (paralelos)". */
    routedLabel: string;
}

/** Cap on persisted doubts — a study that raises 20+ is pathological. */
export const MAX_OPEN_DOUBTS = 20;

const QUESTION_MARKERS = /[?¿]/;
const UNCERTAINTY_PHRASES = [
    'no estoy seguro',
    'no estoy segura',
    'me pregunto',
    'no sé si',
    'no se si',
    'no tengo claro',
    'tengo una duda',
    'me queda la duda',
    'no entiendo',
    'no me queda claro',
];

/**
 * Returns the sentence that carries a genuine doubt, or null. Heuristic:
 * a `?`/`¿` or an uncertainty phrase. Returns the first matching sentence
 * (trimmed, capped) so the persisted text is the doubt itself, not the
 * whole message.
 */
export function detectRaisedDoubt(message: string): string | null {
    const text = (message ?? '').trim();
    if (!text) return null;
    const lower = text.toLowerCase();
    const hasMarker = QUESTION_MARKERS.test(text) || UNCERTAINTY_PHRASES.some((p) => lower.includes(p));
    if (!hasMarker) return null;

    // Split into sentences and return the first that carries a marker.
    const sentences = text.split(/(?<=[.!?¿])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
    for (const s of sentences) {
        const sl = s.toLowerCase();
        if (QUESTION_MARKERS.test(s) || UNCERTAINTY_PHRASES.some((p) => sl.includes(p))) {
            return s.length > 240 ? `${s.slice(0, 240)}…` : s;
        }
    }
    return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}

interface RouteBucket {
    test: RegExp;
    steps: PastoralSeedStepKey[];
    label: string;
}

// Ordered most-specific → fallback. First match wins.
const ROUTE_BUCKETS: RouteBucket[] = [
    {
        test: /estructura|argument|conect|orden|p[áa]rrafo|vers[íi]cul|relaci[óo]n|c[óo]mo se une|por qu[ée] sigue/i,
        steps: ['structuralAnalysis'],
        label: 'Paso 3 (análisis estructural)',
    },
    {
        test: /\bhoy\b|aplica|relevan|congregaci|audiencia|actual|nuestro tiempo|mi gente|predicar|c[óo]mo lo vivo/i,
        steps: ['function', 'insight'],
        label: 'Paso 6 (función) y Paso 8 (insight)',
    },
    {
        // Word meaning / doctrine — also the safe default for "what does this mean".
        test: /palabra|signific|griego|hebreo|traduc|t[ée]rmino|qu[ée] quiere decir|sentido de|salv|rescat|justif|pecado|gracia|\bfe\b|elecci[óo]n|predestin|santific/i,
        steps: ['wordStudies', 'recognition'],
        label: 'Paso 4 (estudio de palabras) y Paso 5 (paralelos canónicos)',
    },
];

const DEFAULT_BUCKET: RouteBucket = {
    steps: ['wordStudies', 'recognition'],
    label: 'Paso 4 (estudio de palabras) y Paso 5 (paralelos canónicos)',
    test: /.^/, // never matches; used only as the fallback shape
};

/** Maps a doubt's text to the step(s) that resolve it. Never resolves it. */
export function routeDoubt(text: string): { steps: PastoralSeedStepKey[]; label: string } {
    const bucket = ROUTE_BUCKETS.find((b) => b.test.test(text)) ?? DEFAULT_BUCKET;
    return { steps: bucket.steps, label: bucket.label };
}

/** Builds a `RaisedDoubt` from a detected sentence + the current step. */
export function makeRaisedDoubt(step: PastoralSeedStepKey, text: string): RaisedDoubt {
    const { steps, label } = routeDoubt(text);
    return { step, text, routedToSteps: steps, routedLabel: label };
}

function normalize(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Appends a doubt, deduping by normalized text, capped at MAX_OPEN_DOUBTS. */
export function appendDoubt(existing: RaisedDoubt[], doubt: RaisedDoubt): RaisedDoubt[] {
    const key = normalize(doubt.text);
    if (existing.some((d) => normalize(d.text) === key)) return existing;
    return [...existing, doubt].slice(-MAX_OPEN_DOUBTS);
}

/**
 * The deterministic reminder line appended to the agent reply — ONLY when
 * the doubt routes to a step the pastor has NOT reached yet (routing to the
 * current/past step would be noise; they're working it now). Returns null
 * otherwise. NEVER contains an answer — only "guárdala para el Paso N".
 */
export function buildDoubtRoutingNote(
    doubt: RaisedDoubt,
    currentStep: PastoralSeedStepKey,
): string | null {
    const currentIdx = PASTORAL_SEED_STEP_ORDER.indexOf(currentStep);
    const future = doubt.routedToSteps.filter(
        (s) => PASTORAL_SEED_STEP_ORDER.indexOf(s) > currentIdx,
    );
    if (future.length === 0) return null;
    return `📌 Guarda esa duda para más adelante: la trabajarás en ${doubt.routedLabel}.`;
}
