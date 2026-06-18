/**
 * Single source of truth for email styling. Every canonical email
 * component pulls from this object — palette changes propagate
 * everywhere with no per-template hunting.
 *
 * Values are tuned for email-client compatibility:
 *   - Hex colors only (no HSL — Outlook dithers it).
 *   - Px units (no rem — Outlook ignores root font-size).
 *   - System font stack (no @import — strips in Gmail).
 */
import { MARKETING_URL } from '../../config/urls';

export const emailTheme = {
    palette: {
        brandPrimary: '#D97706',         // amber-600 (matches logo)
        brandPrimaryHover: '#B45309',    // amber-700
        brandTint: '#FEF3C7',            // amber-100
        textPrimary: '#1F2937',          // slate-800
        textSecondary: '#4B5563',        // slate-600
        textMuted: '#9CA3AF',            // slate-400
        bgPage: '#F9FAFB',               // slate-50
        bgCard: '#FFFFFF',
        border: '#E5E7EB',               // slate-200
        borderStrong: '#D1D5DB',         // slate-300
    },
    spacing: {
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
    },
    fonts: {
        body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        reading: "Georgia, 'Times New Roman', serif",
    },
    sizes: {
        body: '16px',
        bodyLineHeight: '1.7',
        h1: '28px',
        h2: '22px',
        h3: '17px',
        small: '13px',
        micro: '11px',
        containerMaxWidth: '600px',
    },
    radius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
    },
    assets: {
        logoUrl: `${MARKETING_URL}/logo_dfp.png`,
        homeUrl: MARKETING_URL,
    },
};
