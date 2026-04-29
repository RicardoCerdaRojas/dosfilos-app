export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export function isAcceptedImage(file: File): boolean {
    return ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type.startsWith('image/');
}

export interface PreparedAttachment {
    inline: { mimeType: string; data: string };
    meta: { filename: string; mimeType: string; sizeBytes: number };
}

/**
 * Reads a File as base64 (no `data:` URI prefix) and returns the inline
 * payload Gemini expects plus the small metadata we persist alongside the
 * user message so the bubble can show a "📎 photo.jpg · 2.4 MB" badge
 * after reload. The binary itself is not stored.
 */
export async function prepareAttachmentForSend(file: File): Promise<PreparedAttachment> {
    const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // FileReader returns "data:image/png;base64,iVBOR..." — strip
            // the URI scheme so we hand Gemini just the base64 payload.
            const result = String(reader.result ?? '');
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.readAsDataURL(file);
    });
    return {
        inline: { mimeType: file.type || 'application/octet-stream', data },
        meta: { filename: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size },
    };
}

const STAGED_ATTACHMENT_KEY = 'faculty.pendingAttachment.v1';

/**
 * One-shot hand-off of a prepared attachment from the directory page (where
 * the user composes the first message) to the chat page (where the auto-send
 * effect actually creates the session and fires the request). sessionStorage
 * is the natural fit: per-tab, persists across navigation, cleared on close,
 * and capped at ~5 MB which matches MAX_ATTACHMENT_BYTES.
 */
export function stageAttachment(prepared: PreparedAttachment): void {
    try {
        sessionStorage.setItem(STAGED_ATTACHMENT_KEY, JSON.stringify(prepared));
    } catch (err) {
        console.warn('[facultyAttachment] could not stage attachment:', err);
    }
}

export function consumeStagedAttachment(): PreparedAttachment | null {
    let raw: string | null;
    try {
        raw = sessionStorage.getItem(STAGED_ATTACHMENT_KEY);
    } catch {
        return null;
    }
    if (!raw) return null;
    sessionStorage.removeItem(STAGED_ATTACHMENT_KEY);
    try {
        return JSON.parse(raw) as PreparedAttachment;
    } catch {
        return null;
    }
}

/**
 * Returns true if a staged attachment is present without removing it.
 * Used by the auto-send guard to know whether to proceed when the URL
 * has an empty `?q=` (image-only send from the directory page).
 */
export function hasStagedAttachment(): boolean {
    try {
        return sessionStorage.getItem(STAGED_ATTACHMENT_KEY) !== null;
    } catch {
        return false;
    }
}

export function clearStagedAttachment(): void {
    try {
        sessionStorage.removeItem(STAGED_ATTACHMENT_KEY);
    } catch {
        // ignore
    }
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
