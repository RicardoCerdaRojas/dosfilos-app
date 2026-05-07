import { useEffect, useRef } from 'react';
import type { ExegeticalPaper, LibraryResource, ProjectSource } from '@dosfilos/domain';
import { useExegesisPapers } from './useExegesisPapers';

/**
 * Background auto-classifier for `ProjectSource`s still tagged as
 * `'other'`. The user-facing flow is:
 *
 *   1. User uploads a file in CorpusSubStep → resource is created with
 *      `textContent === null` (LlamaParse / Gemini extracts async).
 *   2. `addSource` fires immediately with `sourceType = 'other'` (the
 *      pragmatic default — we can't classify without text).
 *   3. Storage trigger extracts text → resource gains `textContent`.
 *   4. This hook detects the readiness (the `useLibrary` subscription
 *      pushes the updated resource through), runs `classifySourceType`,
 *      and patches the source's `sourceType` IF the classifier returns
 *      `confidence === 'high'`. Mid/low confidence stays at 'other' so
 *      the user can pick manually — we don't want to silently lock in
 *      an uncertain guess.
 *
 * Skipped when:
 *   - The source is already classified to anything other than 'other'.
 *   - The linked resource is missing or has no extracted text yet
 *     (re-fires once the subscription pushes the ready resource).
 *   - `textContent` is too short to classify reliably (<200 chars —
 *     stub text from a failed/early extraction shouldn't waste a call).
 *   - We already attempted this source in this session (in-memory Set,
 *     keyed by source id).
 *
 * Idempotent: re-renders re-evaluate the source list but the per-id
 * Set ensures one attempt per session per source. Fire-and-forget;
 * failures surface only as console warnings.
 */
export function useAutoClassifyOtherSources(
    paper: Pick<ExegeticalPaper, 'id' | 'sources' | 'displayLanguage'>,
    resources: ReadonlyArray<LibraryResource>,
): void {
    const { classifySourceType, updateSource } = useExegesisPapers();
    const attemptedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const resourceById = new Map(resources.map(r => [r.id, r]));
        for (const source of paper.sources) {
            if (source.sourceType !== 'other') continue;
            if (attemptedRef.current.has(source.id)) continue;
            const resource = resourceById.get(source.corpusId);
            if (!resource) continue;
            const text = resource.textContent;
            if (!text || text.trim().length < 200) continue;
            attemptedRef.current.add(source.id);
            void runClassify(source, resource, text);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paper.sources, resources]);

    const runClassify = async (
        source: ProjectSource,
        resource: LibraryResource,
        text: string,
    ): Promise<void> => {
        try {
            const result = await classifySourceType.mutateAsync({
                rawText: text,
                title: resource.title || null,
                author: resource.author || null,
                language: paper.displayLanguage,
            });
            if (result.confidence !== 'high' || result.sourceType === 'other') {
                return;
            }
            await updateSource.mutateAsync({
                paperId: paper.id,
                sourceId: source.id,
                sourceType: result.sourceType,
            });
        } catch (err) {
            console.warn('[exegesis] auto-classify post-extraction failed:', err);
        }
    };
}
