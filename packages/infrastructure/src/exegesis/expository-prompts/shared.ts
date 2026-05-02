import type { AssistantVerseInput } from '@dosfilos/domain';

/**
 * Pipeline version identifier embedded into every PassResult.passVersion
 * so the application layer can fingerprint a full run by combining the
 * 5 pass versions. Bump when ANY prompt changes meaningfully — that
 * invalidates memoization and forces the wizard to re-run.
 */
export const EXPOSITORY_PIPELINE_VERSION = 'v1';

/**
 * Renders verse-by-verse text in the format every pass uses to feed
 * the LLM: `cap:vers <TAB> texto` per line. Compact, predictable, and
 * easy for the model to reference back when emitting boundaries.
 */
export function formatVerses(verses: ReadonlyArray<AssistantVerseInput>): string {
    return verses.map((v) => `${v.chapter}:${v.verse}\t${v.text}`).join('\n');
}

/**
 * Stable djb2 hash of an arbitrary string. Used to fingerprint per-pass
 * inputs (not crypto — just change-detection for memoization).
 */
export function djb2Hash(input: string): string {
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
        h = ((h << 5) + h + input.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Cheap heuristic to summarize a list of verses for hashing without
 * including all the text — first/last verse coords + a sample of text
 * lengths. Keeps the hash stable across reformatted inputs that don't
 * change the actual content.
 */
export function fingerprintVerses(verses: ReadonlyArray<AssistantVerseInput>): string {
    if (verses.length === 0) return 'empty';
    const first = verses[0]!;
    const last = verses[verses.length - 1]!;
    const totalChars = verses.reduce((acc, v) => acc + v.text.length, 0);
    return `${first.chapter}:${first.verse}-${last.chapter}:${last.verse}|n=${verses.length}|chars=${totalChars}`;
}
