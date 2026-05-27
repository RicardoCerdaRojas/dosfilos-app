/**
 * Pastoral Fidelity Phase 1.5 — curated lexicon lookup for the
 * `functions/` package.
 *
 * The dataset is **duplicated** from
 * `packages/infrastructure/src/data/lexicon-curated-v1.json` because
 * Firebase Functions only deploys the `functions/` package, so a
 * cross-package JSON import would not survive the deploy bundle. The
 * two files must be kept in sync; the validator script
 * (`scripts/lexicon/validate-curated-v1.ts`) runs against the
 * infrastructure copy, and `scripts/lexicon/sync-functions-copy.sh`
 * verifies the duplicate matches.
 *
 * When the curated v1.x dataset bumps:
 *   1. Update the infrastructure copy.
 *   2. Run the sync script (TODO follow-up — for now manual copy).
 *   3. Bump `CURATED_LEXICON_VERSION` here AND in the infrastructure
 *      adapter via the JSON's `version` field.
 */
import dataset from '../data/lexicon-curated-v1.json';

interface RawCuratedEntry {
    lemma: string;
    language: 'greek' | 'hebrew';
    transliteration: string;
    primaryGloss: string;
    semanticRange: string[];
    theologicalNote?: string;
}

interface RawDataset {
    version: string;
    license: string;
    attribution: string;
    entries: RawCuratedEntry[];
}

const RAW = dataset as RawDataset;

export const CURATED_LEXICON_VERSION = RAW.version;
export const CURATED_LEXICON_ATTRIBUTION = RAW.attribution;

const INDEX = new Map<string, RawCuratedEntry>();
for (const entry of RAW.entries) {
    INDEX.set(`${entry.language}:${entry.lemma}`, entry);
}

export interface CuratedLookupResult {
    primaryGloss: string;
    semanticRange: string[];
    theologicalNote?: string;
    source: 'curated';
    transliteration: string;
}

export function lookupCuratedEntry(
    lemma: string,
    language: 'greek' | 'hebrew',
): CuratedLookupResult | null {
    const entry = INDEX.get(`${language}:${lemma}`);
    if (!entry) return null;
    return {
        primaryGloss: entry.primaryGloss,
        semanticRange: entry.semanticRange,
        theologicalNote: entry.theologicalNote,
        source: 'curated',
        transliteration: entry.transliteration,
    };
}
