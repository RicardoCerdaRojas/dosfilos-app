import type { PackMode } from '../library/processingBalance';

export interface CreditPack {
    /** Stable id used in Stripe metadata + UI selection. */
    id: string;
    mode: PackMode;
    /**
     * For `'standard'` / `'premium'` page-based packs: pages credited.
     * For `'exegesis'` USD-based packs: ignored (use `usdAmount`).
     */
    pages: number;
    /** Display price in USD (informational; the canonical price is the Stripe price object). */
    priceUsd: number;
    /** Stripe Price ID (set via env var to keep secrets out of source). */
    stripePriceIdEnv: string;
    /**
     * For `'exegesis'` packs: USD value credited to the exegesis bucket.
     * Undefined for page-based packs.
     */
    usdAmount?: number;
}

/**
 * Source of truth for the 6-pack catalog (3 standard + 3 premium).
 *
 * Stripe Price IDs are NOT hard-coded — they live in env vars so the
 * staging/production split is clean. The webhook reads `pack_id` from the
 * Checkout Session metadata (set by `createCheckoutSession`) and credits the
 * matching pack here.
 */
export const CREDIT_PACKS: CreditPack[] = [
    // Standard (Gemini Flash)
    { id: 'standard-s', mode: 'standard', pages: 500, priceUsd: 3, stripePriceIdEnv: 'STRIPE_PRICE_PACK_STANDARD_S' },
    { id: 'standard-m', mode: 'standard', pages: 2000, priceUsd: 10, stripePriceIdEnv: 'STRIPE_PRICE_PACK_STANDARD_M' },
    { id: 'standard-l', mode: 'standard', pages: 5000, priceUsd: 20, stripePriceIdEnv: 'STRIPE_PRICE_PACK_STANDARD_L' },

    // Premium (LlamaParse)
    { id: 'premium-s', mode: 'premium', pages: 200, priceUsd: 4, stripePriceIdEnv: 'STRIPE_PRICE_PACK_PREMIUM_S' },
    { id: 'premium-m', mode: 'premium', pages: 1000, priceUsd: 15, stripePriceIdEnv: 'STRIPE_PRICE_PACK_PREMIUM_M' },
    { id: 'premium-l', mode: 'premium', pages: 3000, priceUsd: 35, stripePriceIdEnv: 'STRIPE_PRICE_PACK_PREMIUM_L' },

    // Exégesis (LLM USD bucket — display unit "estudios" in UI).
    // usdAmount = USD credited to processingBalance.packExegesisUsd.
    // Decreasing markup at larger packs:
    //   Pack 3:  $9 price → $6 credit (50% markup)
    //   Pack 10: $25 price → $18 credit (38% markup)
    //   Pack 30: $60 price → $48 credit (25% markup)
    { id: 'exegesis-s', mode: 'exegesis', pages: 0, priceUsd: 9, usdAmount: 6, stripePriceIdEnv: 'STRIPE_PRICE_PACK_EXEGESIS_S' },
    { id: 'exegesis-m', mode: 'exegesis', pages: 0, priceUsd: 25, usdAmount: 18, stripePriceIdEnv: 'STRIPE_PRICE_PACK_EXEGESIS_M' },
    { id: 'exegesis-l', mode: 'exegesis', pages: 0, priceUsd: 60, usdAmount: 48, stripePriceIdEnv: 'STRIPE_PRICE_PACK_EXEGESIS_L' },
];

export function getPackById(id: string): CreditPack | undefined {
    return CREDIT_PACKS.find(p => p.id === id);
}

export function resolveStripePriceId(pack: CreditPack): string | undefined {
    return process.env[pack.stripePriceIdEnv];
}
