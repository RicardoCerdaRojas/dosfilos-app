import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY is missing. Stripe functions will fail.');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY || 'dummy_key', {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
