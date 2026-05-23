import { getFunctions, httpsCallable } from 'firebase/functions';

export interface CrossReferenceParallel {
    targetBook: string;
    targetChapter: number;
    targetVerse: number;
    targetVerseEnd?: number;
    type: 'quotation' | 'allusion' | 'parallel' | 'echo';
    strength: number;
    note?: string;
}

export interface CrossReferenceDocPayload {
    id: string;
    sourceBook: string;
    sourceChapter: number;
    sourceVerse: number;
    parallels: CrossReferenceParallel[];
    count: number;
    source: string;
}

export interface IngestCrossReferencesResponse {
    success: boolean;
    source: string;
    written: number;
}

export interface LookupSingleVerseArgs {
    book: string;
    chapter: number;
    verse: number;
}

export interface LookupRangeArgs {
    book: string;
    chapter: number;
    startVerse: number;
    endVerse: number;
}

export interface LookupSingleResponse {
    doc: CrossReferenceDocPayload | null;
}

export interface LookupRangeResponse {
    docs: CrossReferenceDocPayload[];
}

/**
 * Facade for the cross-reference engine callables. Used by the admin
 * tester to ingest the sample seed and resolve lookups interactively;
 * downstream consumers (Testigo 2 orchestrator in Phase 2) will share
 * the same service.
 */
export class AdminCrossReferenceService {
    async ingest(): Promise<IngestCrossReferencesResponse> {
        const fn = httpsCallable<Record<string, never>, IngestCrossReferencesResponse>(
            getFunctions(),
            'ingestBibleCrossReferences',
        );
        const { data } = await fn({});
        return data;
    }

    async lookupVerse(args: LookupSingleVerseArgs): Promise<LookupSingleResponse> {
        const fn = httpsCallable<LookupSingleVerseArgs, LookupSingleResponse>(
            getFunctions(),
            'lookupCrossReferences',
        );
        const { data } = await fn(args);
        return data;
    }

    async lookupRange(args: LookupRangeArgs): Promise<LookupRangeResponse> {
        const fn = httpsCallable<LookupRangeArgs, LookupRangeResponse>(
            getFunctions(),
            'lookupCrossReferences',
        );
        const { data } = await fn(args);
        return data;
    }
}

export const adminCrossReferenceService = new AdminCrossReferenceService();
