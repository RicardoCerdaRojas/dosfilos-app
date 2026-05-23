import apostlesSeed from './data/creed-apostles.json';
import niceneSeed from './data/creed-nicene.json';
import athanasianSeed from './data/creed-athanasian.json';
import chalcedonSeed from './data/creed-chalcedon.json';

/**
 * Shape of the per-source seed files under `./data/`. Each file lists
 * the sections in canonical order; the loader injects ordering + ids when
 * writing to Firestore.
 *
 * Imported as JSON modules (tsconfig `resolveJsonModule: true`) so the
 * data is bundled into the compiled `dist/` output. Reading from disk
 * via `fs.readFileSync` would fail in the Firebase Functions runtime
 * because `tsc` does not copy non-`.ts` files to `outDir`.
 */
export interface SeedSectionFile {
    confessionId: string;
    language: string;
    edition: string;
    sections: SeedSection[];
}

export interface SeedSection {
    sectionReference: string;
    title?: string;
    text: string;
    question?: string;
    answer?: string;
    topics?: string[];
    order: number;
}

const SEEDS: Record<string, SeedSectionFile> = {
    'apostles-creed': apostlesSeed as SeedSectionFile,
    'nicene-creed': niceneSeed as SeedSectionFile,
    'athanasian-creed': athanasianSeed as SeedSectionFile,
    'definition-of-chalcedon': chalcedonSeed as SeedSectionFile,
};

export function hasLocalSeed(confessionId: string): boolean {
    return confessionId in SEEDS;
}

export function loadLocalSeed(confessionId: string): SeedSectionFile | null {
    return SEEDS[confessionId] ?? null;
}
