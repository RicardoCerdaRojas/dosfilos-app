/**
 * Per-user WordPress integration config. Stored at
 * `users/{userId}/integrations/wordpress`.
 *
 * The app password is sensitive but not catastrophically so:
 *   - WordPress application passwords are scoped per-user, per-app,
 *     revocable from the WP admin without affecting the user's main
 *     login password.
 *   - Compromise blast radius: one user's WP site can have draft
 *     posts created or read.
 *   - Firestore at-rest encryption (default GCP) protects against
 *     storage-level access.
 *
 * For v1 we store the password as plaintext in the Firestore doc and
 * gate read/write to the owning user via security rules. Future
 * hardening: encrypt at the application layer using a per-user key
 * derived from KMS, or move to Secret Manager (one secret per user,
 * heavier ops cost).
 */
export interface WordpressIntegration {
    /**
     * Site URL without trailing slash, e.g. `https://miblog.com`.
     * The REST API is reached at `${siteUrl}/wp-json/wp/v2/`.
     */
    siteUrl: string;
    /** WordPress username (or email — both work for app passwords). */
    username: string;
    /**
     * Application password generated in WP admin
     * (Users → Profile → Application Passwords). Looks like
     * `aaaa bbbb cccc dddd eeee ffff` — spaces are part of the value
     * but get stripped before sending the Basic Auth header.
     */
    appPassword: string;
    /**
     * Default post status when publishing. Most pastors want `draft`
     * so they can review in WP before going live; some prefer
     * `publish` for fast same-day workflows.
     */
    defaultStatus: 'draft' | 'publish';
    /** When the integration was first connected. Set server-side. */
    connectedAt: Date;
    /** Last time a publish call succeeded. Set server-side. */
    lastPublishedAt?: Date | null;
    /** Last error message if the most recent publish failed. */
    lastError?: string | null;
}
