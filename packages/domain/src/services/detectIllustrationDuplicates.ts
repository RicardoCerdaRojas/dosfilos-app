import type { SermonContent } from '../entities/SermonGenerator';

/**
 * Post-generation guard for the wizard draft (audit T2 #11). The draft
 * prompt already instructs the LLM to vary illustration categories
 * across consecutive points (`prompts-generator.ts` rule #4) — this
 * function verifies the model followed that rule and surfaces near-
 * duplicate pairs so the UI can warn the preacher before publish.
 *
 * The metric is Jaccard similarity over content tokens (length ≥ 4,
 * Spanish stopwords stripped). No extra LLM call — keeps the post-gen
 * step free and deterministic. Threshold defaults to 0.45, calibrated
 * so that two distinct car-themed illustrations don't fire (they
 * share "auto/manejar/camino" but differ on nouns/verbs), while two
 * variants of the same anecdote do.
 *
 * Returns an empty array when the sermon has fewer than two body
 * points, when illustrations are missing/empty, or when no pair
 * crosses the threshold. Caller is expected to render a non-blocking
 * banner — this is a heuristic, not a hard rule.
 */
export interface IllustrationDuplicatePair {
    /** 0-based index of the first body point in the matched pair. */
    indexA: number;
    /** 0-based index of the second body point (always > indexA). */
    indexB: number;
    /** Jaccard similarity in [0,1]. Higher = more overlap. */
    similarity: number;
}

export interface DetectIllustrationDuplicatesOptions {
    /** Match threshold (default 0.45). Pairs at or above are flagged. */
    threshold?: number;
}

const DEFAULT_THRESHOLD = 0.45;

const SPANISH_STOPWORDS = new Set([
    'que', 'para', 'como', 'pero', 'porque', 'cuando', 'donde', 'sino', 'sobre',
    'entre', 'desde', 'hasta', 'según', 'segun', 'mientras', 'aunque', 'ahora',
    'cada', 'todo', 'todos', 'toda', 'todas', 'esto', 'esta', 'ese', 'esa',
    'este', 'estos', 'estas', 'aquel', 'aquella', 'aquellos', 'aquellas',
    'algo', 'alguien', 'alguno', 'alguna', 'algunos', 'algunas', 'nadie',
    'nada', 'ningún', 'ninguna', 'mismo', 'misma', 'mismos', 'mismas', 'otro',
    'otra', 'otros', 'otras', 'tan', 'tanto', 'tanta', 'muy', 'más', 'mas',
    'menos', 'también', 'tambien', 'tampoco', 'solo', 'sólo', 'incluso',
    'siempre', 'nunca', 'jamás', 'jamas', 'casi', 'apenas', 'quizás', 'quizas',
    'acaso', 'aquí', 'aqui', 'allí', 'alli', 'ahí', 'ahi', 'allá', 'alla',
    'entonces', 'luego', 'después', 'despues', 'antes', 'durante',
    'cualquier', 'cualquiera', 'sería', 'seria', 'haber', 'había', 'habia',
    'sido', 'ser', 'estar', 'tener', 'hacer', 'decir', 'poder', 'deber',
    'son', 'era', 'fue', 'eran', 'fueron', 'soy', 'eres', 'somos', 'sois',
    'había', 'habian', 'habría', 'habria',
]);

function tokenize(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9ñ\s]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length >= 4 && !SPANISH_STOPWORDS.has(w)),
    );
}

function jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let intersection = 0;
    for (const w of a) if (b.has(w)) intersection++;
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

export function detectIllustrationDuplicates(
    draft: SermonContent | null | undefined,
    options: DetectIllustrationDuplicatesOptions = {},
): IllustrationDuplicatePair[] {
    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    const body = draft?.body ?? [];
    if (body.length < 2) return [];

    const tokenSets = body.map((point) => {
        const text = (point?.illustration ?? '').trim();
        return text ? tokenize(text) : null;
    });

    const pairs: IllustrationDuplicatePair[] = [];
    for (let i = 0; i < tokenSets.length - 1; i++) {
        const a = tokenSets[i];
        if (!a) continue;
        for (let j = i + 1; j < tokenSets.length; j++) {
            const b = tokenSets[j];
            if (!b) continue;
            const similarity = jaccard(a, b);
            if (similarity >= threshold) {
                pairs.push({ indexA: i, indexB: j, similarity });
            }
        }
    }
    return pairs;
}
