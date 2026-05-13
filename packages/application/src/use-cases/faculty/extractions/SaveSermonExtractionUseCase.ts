import { Extraction, IExtractionRepository } from '@dosfilos/domain';

/**
 * Persists an Extraction with a sermon externalRef. Used after the
 * Faculty wizard creates a sermon doc in the `sermons/` collection —
 * the sermon stays the canonical record, but the Extraction is the
 * link visible in the user's resource library (Generados tab,
 * /faculty/library, project libraries).
 *
 * No LLM call. The caller already has the markdown + sermon id from
 * the wizard's onSuccess hook.
 */
export class SaveSermonExtractionUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(params: {
        userId: string;
        sessionId: string;
        sermonId: string;
        title: string;
        markdown: string;
        derivedFromMessageIds: string[];
    }): Promise<Extraction> {
        return this.repo.create({
            userId: params.userId,
            sessionId: params.sessionId,
            type: 'SERMON',
            title: params.title,
            markdown: params.markdown,
            derivedFromMessageIds: params.derivedFromMessageIds,
            externalRef: { collection: 'sermons', id: params.sermonId },
        });
    }
}

/**
 * Orphans every Extraction whose externalRef points at a sermon
 * that was just deleted. The Extraction itself is preserved — the
 * `markdown` snapshot taken at creation time is still useful — but
 * the dangling pointer is cleared so the UI can fall back to
 * inline preview instead of trying to navigate to a missing
 * sermon doc.
 */
export class OrphanExtractionsBySermonUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(userId: string, sermonId: string): Promise<void> {
        return this.repo.orphanByExternalRef(userId, 'sermons', sermonId);
    }
}
