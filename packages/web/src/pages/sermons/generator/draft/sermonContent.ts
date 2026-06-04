import type { TFunction } from 'i18next';

interface SermonPoint {
    point: string;
    content: string;
    scriptureReferences?: string[];
    illustration?: string;
    implications?: string[];
    authorityQuote?: string;
    transition?: string;
}

interface SermonDraft {
    introduction: string;
    body: SermonPoint[];
    conclusion: string;
    callToAction?: string;
}

/**
 * Serialises a sermon draft to a markdown-ish string used by the preview
 * dialog and the publish flow. Keeps the side-effect-free transformation out
 * of the React component and away from i18n state changes.
 */
export function buildFullContent(draft: SermonDraft | null, t: TFunction): string {
    if (!draft) return '';

    const body = draft.body
        .map((point) => {
            let pointContent = `## ${point.point}\n<br/>\n${point.content}`;

            if (point.scriptureReferences && point.scriptureReferences.length > 0) {
                // Each generated ref carries a leading "> " blockquote prefix.
                // Inside a markdown list item that ">" renders as a literal
                // character, so strip it — the bullet IS the visual marker.
                pointContent += `\n<br/>\n### ${t('drafting.fullContent.crossReferences')}\n${point.scriptureReferences.map((ref) => `- ${ref.replace(/^\s*>\s*/, '')}`).join('\n')}`;
            }

            if (point.illustration) {
                pointContent += `\n<br/>\n**${t('drafting.illustrationLabel')}:**\n${point.illustration}`;
            }

            if (point.implications && point.implications.length > 0) {
                pointContent += `\n<br/>\n### ${t('drafting.fullContent.practicalImplications')}\n${point.implications.map((impl, idx) => `${idx + 1}. ${impl}`).join('\n')}`;
            }

            if (point.authorityQuote) {
                pointContent += `\n<br/>\n${point.authorityQuote}`;
            }

            if (point.transition) {
                pointContent += `\n<br/>\n*${point.transition}*`;
            }

            return pointContent;
        })
        .join('\n<br/>\n---\n<br/>\n');

    const callToActionBlock = draft.callToAction
        ? `\n<br/>\n> **${t('drafting.callToActionLabel')}:** ${draft.callToAction}`
        : '';

    return `
${draft.introduction}
<br/>
${body}
<br/>
## ${t('drafting.conclusionLabel')}
${draft.conclusion}${callToActionBlock}
    `.trim();
}
