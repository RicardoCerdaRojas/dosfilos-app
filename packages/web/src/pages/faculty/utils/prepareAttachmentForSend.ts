/**
 * Reads a File as base64 (no `data:` URI prefix) and returns the
 * inline payload Gemini expects plus the small metadata we persist
 * alongside the user message so the bubble can show a
 * "📎 photo.jpg · 2.4 MB" badge after reload. The binary itself is
 * not stored anywhere — it travels inline to Gemini for the single
 * exchange and is discarded thereafter.
 */
export async function prepareAttachmentForSend(file: File): Promise<{
    inline: { mimeType: string; data: string };
    meta: { filename: string; mimeType: string; sizeBytes: number };
}> {
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
