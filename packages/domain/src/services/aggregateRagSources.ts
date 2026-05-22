import type { RAGSource } from '../entities/SermonGenerator';

/**
 * Wizard step that a source was cited in. Tracked on each accumulated
 * entry so the UI can show "Used in: Exégesis, Redacción" badges
 * without re-traversing the per-step lists.
 */
export type RagSourceStep = 'exegesis' | 'homiletics' | 'draft';

export interface AccumulatedRagSource {
    source: RAGSource;
    steps: RagSourceStep[];
}

export interface AggregateRagSourcesInput {
    exegesisSources?: RAGSource[];
    homileticsSources?: RAGSource[];
    draftSources?: RAGSource[];
}

/**
 * Junk patterns the LLM occasionally returns when it confuses
 * "data given in the prompt" with "library bibliography source".
 * Surfaced 2026-05-21 on Juan 1:1 generation: the draft ragSources
 * included an entry titled `"Contexto Exegético y Datos del Análisis
 * Homilético para Juan 1:1"` authored by `"Usuario (proporcionado en
 * el prompt)"` — a meta-reference to the prompt's own input dressed
 * up as a bibliographic citation. Embarrassing for a pulpit context.
 *
 * Match is case-insensitive substring on title + author. Anything
 * matching is silently dropped from the accumulated output and the
 * reason is logged via the optional `onReject` callback so we can
 * track frequency / regressions.
 *
 * This is the **Phase A defensive filter** — Phase B will switch the
 * pipeline to ID-based citation that makes this impossible at the
 * source instead of having to scrub it after the fact.
 */
const JUNK_PATTERNS: RegExp[] = [
    /\bprompt\b/i,
    /\busuario\s*\(?proporcionad/i,
    /\bproporcionado en el prompt\b/i,
    /\bdatos del análisis homilético\b/i,
    /\binput del usuario\b/i,
    /\bcontexto exegético y datos\b/i,
];

interface AggregateOptions {
    /** Called once per rejected entry with the reason. Defaults to no-op. */
    onReject?: (entry: RAGSource, reason: string) => void;
}

/**
 * Aggregates per-step RAG source lists into a single deduped + cleaned
 * list. Drops empty-title entries, drops junk-pattern matches, dedupes
 * by case-insensitive `title|author`, and tracks which step(s)
 * contributed each surviving entry.
 *
 * Pure function — no I/O, safe in tests + domain layer. Both the
 * wizard's `WizardSourcesBadge` and the per-surface bibliography
 * renderers (Vista Previa, sermon detail) feed through this so the
 * filter rules + dedup behavior stay identical across the app.
 */
export function aggregateRagSources(
    input: AggregateRagSourcesInput,
    options: AggregateOptions = {},
): AccumulatedRagSource[] {
    const byKey = new Map<string, AccumulatedRagSource>();
    const push = (sources: RAGSource[] | undefined, step: RagSourceStep) => {
        if (!sources) return;
        for (const s of sources) {
            if (!s?.title?.trim()) continue;
            if (isJunkEntry(s)) {
                options.onReject?.(s, 'junk-pattern');
                continue;
            }
            const key = dedupKey(s);
            const existing = byKey.get(key);
            if (existing) {
                if (!existing.steps.includes(step)) existing.steps.push(step);
            } else {
                byKey.set(key, { source: s, steps: [step] });
            }
        }
    };
    push(input.exegesisSources, 'exegesis');
    push(input.homileticsSources, 'homiletics');
    push(input.draftSources, 'draft');
    return Array.from(byKey.values());
}

/**
 * Returns just the flattened `RAGSource[]` shape (no step tags) —
 * convenience for surfaces that don't care which step the source came
 * from (e.g. published-sermon `Sermon.bibliography` which is a flat
 * list). Same dedup + filter pipeline as `aggregateRagSources`.
 */
export function aggregateRagSourcesFlat(
    input: AggregateRagSourcesInput,
    options: AggregateOptions = {},
): RAGSource[] {
    return aggregateRagSources(input, options).map((e) => e.source);
}

function isJunkEntry(s: RAGSource): boolean {
    const title = s.title ?? '';
    const author = s.author ?? '';
    return JUNK_PATTERNS.some((p) => p.test(title) || p.test(author));
}

function dedupKey(s: RAGSource): string {
    return [s.title?.trim().toLowerCase() ?? '', s.author?.trim().toLowerCase() ?? ''].join('|');
}
