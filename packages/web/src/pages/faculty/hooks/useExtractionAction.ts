import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { track } from '@/lib/analytics/track';
import { type Extraction, type ExtractionType, type AIChatSession } from '@dosfilos/domain';
import { type SermonOutline } from '@/components/faculty/SermonOutlinePreviewModal';
import { EXTRACTION_TITLE_KEYS } from '../utils/extractionTypeKeys';

interface UseExtractionActionParams {
    effectiveSessionId: string;
    session: AIChatSession | undefined | null;
    isDocumentOpen: boolean;
    extractContent: (input: {
        type: ExtractionType | 'SERMON_OUTLINE';
        approvedOutline?: unknown;
        personalization?: unknown;
    }) => Promise<string>;
    generateAndSaveExtraction: (input: { type: ExtractionType; fallbackTitle: string }) => Promise<Extraction>;
    setSermonOutline: (outline: SermonOutline | null) => void;
    openExtractionInEditor: (extraction: Extraction) => void;
    /**
     * Phase 2.5 PR B reroute (ADR-028) — when set, called BEFORE the normal
     * SERMON-outline preview flow. If it returns `true`, the normal flow
     * short-circuits (the caller handled the extract — typically by opening
     * the Faculty Socratic Sermon Agent activation prompt under the
     * `study_depth` flag). When `false` or undefined, the legacy
     * `SermonOutlinePreviewModal` flow runs unchanged.
     */
    sermonGuidedOverride?: () => boolean | Promise<boolean>;
}

/**
 * Drives the "Extract artifact" action wired into the right-side
 * Faculty extraction panel. Manages a single `extractingType` mutex
 * so the user can't trigger overlapping generations and surfaces a
 * toast with "Ver" when an artifact lands while the editor is busy.
 *
 * SERMON has its own branch: the SERMON_OUTLINE preview JSON
 * triggers the wizard modal — only the approved sermon is later
 * persisted as an Extraction (via the modal's onSuccess hook in
 * chat.tsx, which still owns the sermons-collection write).
 *
 * Hito 7 telemetry (`faculty_artifact_generated`) fires from here
 * so we capture every successful generation regardless of which
 * surface kicks it off.
 */
export function useExtractionAction(params: UseExtractionActionParams) {
    const {
        effectiveSessionId,
        session,
        isDocumentOpen,
        extractContent,
        generateAndSaveExtraction,
        setSermonOutline,
        openExtractionInEditor,
        sermonGuidedOverride,
    } = params;
    const { t } = useTranslation('faculty');
    const [extractingType, setExtractingType] = useState<string | null>(null);

    const handleExtract = async (type: ExtractionType) => {
        if (extractingType) return;
        setExtractingType(type);
        try {
            // SERMON has a richer flow (wizard modal + dedicated sermons
            // collection). The preview SERMON_OUTLINE JSON is NOT
            // persisted — only the final approved sermon is, via the
            // modal's onSuccess path which calls generateAndSaveExtraction.
            if (type === 'SERMON') {
                // Phase 2.5 PR B reroute (ADR-028): the guided-sermon
                // agent supersedes the outline-preview flow under the
                // `study_depth` flag. Caller decides via the override
                // callback; if it returns true, we short-circuit.
                if (sermonGuidedOverride) {
                    const handled = await sermonGuidedOverride();
                    if (handled) return;
                }
                const raw = await extractContent({ type: 'SERMON_OUTLINE' });
                const json = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                const outline: SermonOutline = JSON.parse(json);
                setSermonOutline(outline);
                return;
            }
            const fallbackTitle = t(EXTRACTION_TITLE_KEYS[type] || 'extraction.extractedDocument');
            const extraction = await generateAndSaveExtraction({ type, fallbackTitle });
            // Hito 7 — feature activation. Captures every successful
            // artifact generation so we can compute generation-rate-
            // per-paid-user when the analysis window opens.
            track('faculty_artifact_generated', {
                type,
                sessionId: effectiveSessionId,
                hasProject: !!session?.projectId,
                messageCount: session?.messages.length ?? 0,
            });
            // Queue UX: don't auto-open if a document is already in the
            // editor. Surface a toast with "Ver" so the user keeps their
            // current work but can discover the new artifact.
            if (isDocumentOpen) {
                toast.success(
                    t('extraction.toast.generated', { title: extraction.title }),
                    {
                        action: {
                            label: t('extraction.toast.view'),
                            onClick: () => openExtractionInEditor(extraction),
                        },
                    },
                );
            } else {
                openExtractionInEditor(extraction);
            }
        } catch (error) {
            console.error('Extraction failed:', error);
            toast.error(t('extraction.extractionFailed'));
        } finally {
            setExtractingType(null);
        }
    };

    return { extractingType, handleExtract };
}
