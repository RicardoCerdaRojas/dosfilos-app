#!/usr/bin/env ts-node
/**
 * Schema validator + completeness report for the curated lexicon v1.
 *
 * Usage:
 *   yarn ts-node scripts/lexicon/validate-curated-v1.ts
 *
 * Exits non-zero if validation fails. Otherwise prints a coverage report.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DATASET_PATH = join(
    process.cwd(),
    'packages/infrastructure/src/data/lexicon-curated-v1.json',
);

interface Entry {
    lemma: string;
    language: 'greek' | 'hebrew';
    transliteration: string;
    primaryGloss: string;
    semanticRange: string[];
    theologicalNote?: string;
}

interface Dataset {
    version: string;
    license: string;
    attribution: string;
    guidelines: string;
    entries: Entry[];
}

function fail(message: string): never {
    console.error(`✗ ${message}`);
    process.exit(1);
}

function ok(message: string) {
    console.log(`✓ ${message}`);
}

function main() {
    const raw = readFileSync(DATASET_PATH, 'utf-8');
    const data = JSON.parse(raw) as Dataset;

    if (typeof data.version !== 'string' || !data.version.match(/^\d+\.\d+\.\d+$/)) {
        fail(`version must be SemVer (got: ${data.version})`);
    }
    if (data.license !== 'Internally created') {
        fail(`license must be "Internally created" (got: ${data.license})`);
    }
    if (!Array.isArray(data.entries) || data.entries.length === 0) {
        fail('entries must be a non-empty array');
    }

    const lemmasSeen = new Set<string>();
    let greekCount = 0;
    let hebrewCount = 0;
    let withNote = 0;

    for (const [i, entry] of data.entries.entries()) {
        const where = `entry[${i}] (lemma=${entry.lemma})`;

        if (!entry.lemma || entry.lemma.trim().length === 0) fail(`${where}: lemma is empty`);
        if (entry.language !== 'greek' && entry.language !== 'hebrew') {
            fail(`${where}: language must be 'greek' or 'hebrew'`);
        }
        if (!entry.transliteration) fail(`${where}: transliteration missing`);
        if (!entry.primaryGloss) fail(`${where}: primaryGloss missing`);
        if (entry.primaryGloss.length < 6) fail(`${where}: primaryGloss too short (${entry.primaryGloss.length} chars; need ≥6)`);
        if (!Array.isArray(entry.semanticRange) || entry.semanticRange.length < 2) {
            fail(`${where}: semanticRange must have ≥2 senses`);
        }
        if (entry.semanticRange.length > 5) {
            fail(`${where}: semanticRange capped at 5 (got ${entry.semanticRange.length})`);
        }

        const dupeKey = `${entry.language}:${entry.lemma}`;
        if (lemmasSeen.has(dupeKey)) fail(`${where}: duplicate lemma in language ${entry.language}`);
        lemmasSeen.add(dupeKey);

        if (entry.language === 'greek') greekCount++;
        else hebrewCount++;
        if (entry.theologicalNote) withNote++;
    }

    ok(`Schema valid. ${data.entries.length} entries (${greekCount} greek, ${hebrewCount} hebrew).`);
    ok(`${withNote}/${data.entries.length} entries carry a theologicalNote.`);

    if (greekCount < 20) {
        console.warn(`⚠ Greek coverage below ship-floor (have ${greekCount}, target ≥20 for v1).`);
    }
    if (hebrewCount < 15) {
        console.warn(`⚠ Hebrew coverage below ship-floor (have ${hebrewCount}, target ≥15 for v1).`);
    }
}

main();
