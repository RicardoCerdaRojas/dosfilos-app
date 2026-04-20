/**
 * Generates a unique identifier using crypto.randomUUID when available,
 * with a deterministic fallback for environments where it is not supported.
 */
export function generateId(): string {
    try {
        const uuid = (globalThis.crypto as Crypto | undefined)?.randomUUID?.();
        if (uuid) return uuid;
    } catch {
        // crypto.randomUUID unavailable — fall through to fallback
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
