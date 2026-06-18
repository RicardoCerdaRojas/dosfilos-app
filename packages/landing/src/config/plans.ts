// Static marketing snapshot of the paid plans + free tier for the landing page.
//
// SOURCE OF TRUTH (captured 2026-06-18):
//   - packages/domain/src/config/planMetadata.ts (prices, ids, sortOrder, descriptions ES)
//   - packages/domain/src/config/planIds.ts (display names: Personal / Pro / Equipo)
//   - scripts/billing/migrate-plan-quotas.js (standard/premium pages per month)
//   - scripts/billing/migrate-exegesis-plan-quotas.js (exegesis USD per month)
//   - packages/web/src/utils/featureLabels.ts (feature labels) — inlined here
//   - scripts/seed-plan-translations-v2.js (EN copy)
//
// This is a MARKETING snapshot, not a billing source. The live app still reads
// plans from Firestore via usePlans(). If prices change in planMetadata.ts,
// update this file too. CTAs route to the app's /register?plan=<id>.
//
// STUDY_UNIT_USD = $2 (domain). Exegesis "estudios" = exegesisUsdPerMonth / 2.

export type Lang = 'es' | 'en';

export interface PlanFeature {
    es: string;
    en: string;
}

export interface MarketingPlan {
    /** Legacy Firestore id used by the app's checkout (?plan=<id>). */
    id: string;
    name: { es: string; en: string };
    description: { es: string; en: string };
    /** Monthly price in USD. */
    priceMonthly: number;
    sortOrder: number;
    isPopular: boolean;
    /** Included monthly processing quota. */
    standardPagesPerMonth: number;
    premiumPagesPerMonth: number;
    /** USD allowance for the exégesis bucket (→ "estudios" at $2 each). */
    exegesisUsdPerMonth: number;
    features: PlanFeature[];
}

const F = {
    sermonCreate: { es: 'Crear sermones', en: 'Create sermons' },
    exportPdf: { es: 'Exportar sermones a PDF', en: 'Export sermons to PDF' },
    libraryUpload: { es: 'Biblioteca personal', en: 'Personal library' },
    aiAssistant: { es: 'Asistente de redacción de sermones', en: 'AI-powered sermon assistant' },
    semanticSearch: { es: 'Búsqueda semántica', en: 'Semantic search' },
    advancedHomiletics: { es: 'Homilética avanzada', en: 'Advanced homiletical analysis' },
    customTemplates: { es: 'Plantillas personalizadas', en: 'Custom sermon templates' },
};

export const MARKETING_PLANS: MarketingPlan[] = [
    {
        id: 'basic',
        name: { es: 'Personal', en: 'Personal' },
        description: {
            es: 'Para comenzar tu ministerio de predicación',
            en: 'To get started with your preaching ministry',
        },
        priceMonthly: 9.99,
        sortOrder: 0,
        isPopular: false,
        standardPagesPerMonth: 800,
        premiumPagesPerMonth: 40,
        exegesisUsdPerMonth: 0,
        features: [F.sermonCreate, F.exportPdf, F.libraryUpload],
    },
    {
        id: 'pro',
        name: { es: 'Pro', en: 'Pro' },
        description: {
            es: 'Para pastores que predican regularmente',
            en: 'For pastors who preach regularly',
        },
        priceMonthly: 14.99,
        sortOrder: 1,
        isPopular: true,
        standardPagesPerMonth: 2_500,
        premiumPagesPerMonth: 150,
        exegesisUsdPerMonth: 10,
        features: [F.sermonCreate, F.aiAssistant, F.exportPdf, F.libraryUpload, F.semanticSearch],
    },
    {
        id: 'team',
        name: { es: 'Equipo', en: 'Team' },
        description: {
            es: 'Para equipos pastorales e iglesias',
            en: 'For ministry teams and churches',
        },
        priceMonthly: 24.99,
        sortOrder: 2,
        isPopular: false,
        standardPagesPerMonth: 5_000,
        premiumPagesPerMonth: 300,
        exegesisUsdPerMonth: 30,
        features: [
            F.sermonCreate,
            F.aiAssistant,
            F.advancedHomiletics,
            F.exportPdf,
            F.customTemplates,
            F.libraryUpload,
            F.semanticSearch,
        ],
    },
];

/** $2 per study, mirrors domain STUDY_UNIT_USD. */
export const STUDY_UNIT_USD = 2;
