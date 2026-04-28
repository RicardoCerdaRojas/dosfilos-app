import type { ProcessingMode } from '../library/processingBalance';

export interface CreditPack {
    /** Stable id used in Stripe metadata + UI selection. */
    id: string;
    mode: ProcessingMode;
    /** Pages credited when the pack is purchased. */
    pages: number;
    /** Display price in USD (informational; the canonical price is the Stripe price object). */
    priceUsd: number;
    /** Stripe Price ID (set via env var to keep secrets out of source). */
    stripePriceIdEnv: string;
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
];

export function getPackById(id: string): CreditPack | undefined {
    return CREDIT_PACKS.find(p => p.id === id);
}

export function resolveStripePriceId(pack: CreditPack): string | undefined {
    return process.env[pack.stripePriceIdEnv];
}
