import { getFunctions, httpsCallable } from 'firebase/functions';

export interface IngestReportItem {
    id: string;
    status: 'ingested' | 'reference-only' | 'pending-content';
    sectionCount: number;
}

export interface IngestCoreLibraryArgs {
    confessionIds?: string[];
}

export interface IngestCoreLibraryResponse {
    success: boolean;
    report: IngestReportItem[];
}

export interface TagDoctrineLevelsArgs {
    confessionIds?: string[];
    force?: boolean;
}

export interface TagDoctrineLevelsReportItem {
    confessionId: string;
    tagged: number;
    skipped: number;
    failed: number;
}

export interface TagDoctrineLevelsResponse {
    success: boolean;
    report: TagDoctrineLevelsReportItem[];
}

export type DoctrineLevelInput = 'core' | 'distinctive' | 'open-evangelical';
export type DoctrineReviewStatusInput = 'pending-pastoral-review' | 'reviewed';

export interface UpdateSectionDoctrineLevelArgs {
    confessionId: string;
    sectionId: string;
    doctrineLevel?: DoctrineLevelInput;
    reviewStatus?: DoctrineReviewStatusInput;
    levelRationale?: string;
}

/**
 * Thin facade over the CORE Library Cloud Functions. Each method maps
 * to one callable; UI feedback (toasts, progress) stays in the hooks.
 * Mirrors the AdminUserService pattern for consistency + compliance
 * gate C7.3 (no Firebase SDK in web/src/hooks).
 */
export class AdminConfessionService {
    async ingestCoreLibrary(args: IngestCoreLibraryArgs = {}): Promise<IngestCoreLibraryResponse> {
        const fn = httpsCallable<IngestCoreLibraryArgs, IngestCoreLibraryResponse>(
            getFunctions(),
            'ingestCoreLibraryConfessions',
        );
        const { data } = await fn(args);
        return data;
    }

    async tagDoctrineLevels(args: TagDoctrineLevelsArgs = {}): Promise<TagDoctrineLevelsResponse> {
        const fn = httpsCallable<TagDoctrineLevelsArgs, TagDoctrineLevelsResponse>(
            getFunctions(),
            'tagConfessionDoctrineLevels',
        );
        const { data } = await fn(args);
        return data;
    }

    async updateSectionDoctrineLevel(args: UpdateSectionDoctrineLevelArgs): Promise<void> {
        const fn = httpsCallable<UpdateSectionDoctrineLevelArgs, { success: boolean }>(
            getFunctions(),
            'updateSectionDoctrineLevel',
        );
        await fn(args);
    }
}

export const adminConfessionService = new AdminConfessionService();
