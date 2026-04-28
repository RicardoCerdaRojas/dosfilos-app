import type { TFunction } from 'i18next';

interface Highlight {
    id: string;
    text: string;
    contextBefore: string;
    contextAfter: string;
    style: 'underline' | 'mark';
    color?: string;
}

/**
 * Maps a highlight color to its Tailwind background class. The colour palette
 * is intentionally a fixed data-driven set (yellow / green / pink / blue) —
 * these are highlighter pen colours the user explicitly chooses, so they live
 * outside the semantic-token system. Same exception as `colorMap` in
 * `ResourceCard`.
 */
function getHighlightClass(color: string): string {
    switch (color) {
        case 'yellow': return 'bg-yellow-200 dark:bg-yellow-900/40';
        case 'green': return 'bg-green-200 dark:bg-green-900/40';
        case 'pink': return 'bg-pink-200 dark:bg-pink-900/40';
        case 'blue': return 'bg-blue-200 dark:bg-blue-900/40';
        default: return '';
    }
}

function buildMarkTag(highlight: Highlight, body: string, t: TFunction): string {
    if (highlight.style === 'underline') {
        return `<mark class="bg-transparent border-b-2 border-primary cursor-pointer hover:opacity-80 transition-opacity" data-highlight-id="${highlight.id}" title="${t('preachMode.highlight.removeUnderline')}">${body}</mark>`;
    }
    const colorClass = getHighlightClass(highlight.color!);
    return `<mark class="${colorClass} rounded px-0.5 cursor-pointer hover:opacity-80 transition-opacity" data-highlight-id="${highlight.id}" title="${t('preachMode.highlight.removeMark')}">${body}</mark>`;
}

/**
 * Wraps a sermon's content with `<mark>` tags for each persisted highlight.
 * Tries an exact contextual match first; falls back to a regex replacement
 * (used after content edits invalidated the surrounding context).
 */
export function applyHighlights(content: string, highlights: Highlight[], t: TFunction): string {
    if (highlights.length === 0) return content;

    let result = content;
    const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);

    sortedHighlights.forEach((highlight) => {
        const searchPattern = `${highlight.contextBefore}${highlight.text}${highlight.contextAfter}`;
        const patternIndex = result.indexOf(searchPattern);

        if (patternIndex === -1) {
            // Fallback: regex without context (for highlights whose surrounding text changed).
            const regex = new RegExp(highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            result = result.replace(regex, buildMarkTag(highlight, '$&', t));
            return;
        }

        const textStart = patternIndex + highlight.contextBefore.length;
        const textEnd = textStart + highlight.text.length;
        result = result.substring(0, textStart) + buildMarkTag(highlight, highlight.text, t) + result.substring(textEnd);
    });

    return result;
}
