import { toast } from 'sonner';
import { injectInlineStylesForCopy } from './injectInlineStylesForCopy';

type Translator = (key: string) => string;

/**
 * Copies a chat message to the clipboard in BOTH formats:
 *   - text/html: the rendered markdown with inline styles injected so
 *     tables, headings, and blockquotes look correct after paste in
 *     Word, Google Docs, Notion, etc. Those editors strip `class`
 *     attributes but keep inline `style="..."`.
 *   - text/plain: the raw markdown source, as a fallback for plain-text
 *     editors and "paste as plain text".
 *
 * Falls back to `writeText` when the modern API is unavailable
 * (older browsers or non-secure contexts). The translator is passed
 * in so this utility stays React-free and reusable from any
 * call site that already has `t` in scope.
 */
export async function copyMessageToClipboard(
    content: string,
    messageId: string,
    t: Translator,
): Promise<void> {
    try {
        const node = document.querySelector(`[data-message-id="${messageId}"] .prose`);
        const rawHtml = node?.innerHTML?.trim();

        if (rawHtml && typeof window !== 'undefined' && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
            const styled = injectInlineStylesForCopy(rawHtml);
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([styled], { type: 'text/html' }),
                    'text/plain': new Blob([content], { type: 'text/plain' }),
                }),
            ]);
        } else {
            await navigator.clipboard.writeText(content);
        }
        toast.success(t('dialogs.copied'));
    } catch (err) {
        console.warn('[FacultyChat] clipboard write failed:', err);
        try {
            await navigator.clipboard.writeText(content);
            toast.success(t('dialogs.copied'));
        } catch {
            toast.error(t('dialogs.copyFailed'));
        }
    }
}
