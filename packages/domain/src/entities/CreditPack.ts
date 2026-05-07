/**
 * Credit-pack catalog — shared types + display data.
 *
 * The Stripe Price ID for each pack lives in env vars on the functions side
 * only (so it's not exposed in the bundle). This file holds the public
 * metadata: id, mode, pages, price, all of which are safe to ship to the
 * browser.
 *
 * Source of truth for the IDs and unit economics; both `packages/functions`
 * (Stripe checkout + webhook crediting) and `packages/web` (UI catalog)
 * read from here.
 */

/**
 * Pack mode discriminator. The `'exegesis'` mode is added with the
 * EXEGESIS_PRICING_INTEGRATION rollout — packs of this mode credit
 * `processingBalance.packExegesisUsd` in USD instead of pages.
 */
export type ProcessingMode = 'standard' | 'premium' | 'exegesis';

export interface CreditPackDefinition {
    /** Stable id used everywhere (Stripe metadata, UI, webhook). */
    id: string;
    mode: ProcessingMode;
    /**
     * For `'standard'` / `'premium'` packs: pages credited.
     * For `'exegesis'` packs: ignored (use `usdAmount` instead).
     */
    pages: number;
    /** Display price in USD. Stripe is the canonical source for the actual charge. */
    priceUsd: number;
    /** Discrete size label (S/M/L) for UI ordering and grouping. */
    size: 'S' | 'M' | 'L';
    /**
     * For `'exegesis'` packs: USD value credited to the exegesis
     * bucket. Undefined for page-based packs. Display copy speaks of
     * "estudios" — converted at UI layer via STUDY_UNIT_USD.
     */
    usdAmount?: number;
}

export const CREDIT_PACK_CATALOG: CreditPackDefinition[] = [
    // Standard (Gemini Flash)
    { id: 'standard-s', mode: 'standard', pages: 500, priceUsd: 3, size: 'S' },
    { id: 'standard-m', mode: 'standard', pages: 2000, priceUsd: 10, size: 'M' },
    { id: 'standard-l', mode: 'standard', pages: 5000, priceUsd: 20, size: 'L' },

    // Premium (LlamaParse)
    { id: 'premium-s', mode: 'premium', pages: 200, priceUsd: 4, size: 'S' },
    { id: 'premium-m', mode: 'premium', pages: 1000, priceUsd: 15, size: 'M' },
    { id: 'premium-l', mode: 'premium', pages: 3000, priceUsd: 35, size: 'L' },

    // Exégesis (LLM tokens — display unit "estudio" via STUDY_UNIT_USD).
    // usdAmount = USD credit deposited to the user's `packExegesisUsd`
    // bucket. Volume incentive: markup decreases at larger packs.
    //   Pack 3:  $9 price / $6 credit → 50% markup, ~3 estudios at $2/u
    //   Pack 10: $25 price / $18 credit → 38% markup, ~9 estudios at $2/u
    //   Pack 30: $60 price / $48 credit → 25% markup, ~24 estudios at $2/u
    // The pack labels in the UI are aspirational ("Pack 30 estudios") but
    // the actual conversion depends on which operations the user runs —
    // a verify-only step costs $0.05, while a full academic compose
    // costs $0.20. The credit IS the source of truth.
    { id: 'exegesis-s', mode: 'exegesis', pages: 0, priceUsd: 9, size: 'S', usdAmount: 6 },
    { id: 'exegesis-m', mode: 'exegesis', pages: 0, priceUsd: 25, size: 'M', usdAmount: 18 },
    { id: 'exegesis-l', mode: 'exegesis', pages: 0, priceUsd: 60, size: 'L', usdAmount: 48 },
];

export function getCreditPackById(id: string): CreditPackDefinition | undefined {
    return CREDIT_PACK_CATALOG.find(p => p.id === id);
}

export function packsByMode(mode: ProcessingMode): CreditPackDefinition[] {
    return CREDIT_PACK_CATALOG.filter(p => p.mode === mode);
}
