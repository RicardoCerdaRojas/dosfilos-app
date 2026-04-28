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

export type ProcessingMode = 'standard' | 'premium';

export interface CreditPackDefinition {
    /** Stable id used everywhere (Stripe metadata, UI, webhook). */
    id: string;
    mode: ProcessingMode;
    /** Pages credited when the pack is purchased. */
    pages: number;
    /** Display price in USD. Stripe is the canonical source for the actual charge. */
    priceUsd: number;
    /** Discrete size label (S/M/L) for UI ordering and grouping. */
    size: 'S' | 'M' | 'L';
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
];

export function getCreditPackById(id: string): CreditPackDefinition | undefined {
    return CREDIT_PACK_CATALOG.find(p => p.id === id);
}

export function packsByMode(mode: ProcessingMode): CreditPackDefinition[] {
    return CREDIT_PACK_CATALOG.filter(p => p.mode === mode);
}
