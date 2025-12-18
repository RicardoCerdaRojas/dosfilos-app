import { useTranslation } from '@/i18n';

/**
 * Hook to get translated plan metadata
 * Maps plan IDs (from Firestore) to translated names and descriptions
 */
export function usePlanTranslations() {
    const { t, i18n } = useTranslation('subscription');
    const currentLang = i18n.language;

    const planMetadata: Record<string, { name: string; description: string }> = {
        'free': {
            name: t('planNames.free'),
            description: t('planDescriptions.free')
        },
        'starter': {
            name: t('planNames.starter'),
            description: t('planDescriptions.starter')
        },
        'pro': {
            name: t('planNames.pro'),
            description: t('planDescriptions.pro')
        },
        'iglesia': {
            name: t('planNames.church'),
            description: t('planDescriptions.church')
        }
    };

    const featureLabels: Record<string, string> = {
        // Sermon features
        'sermon:create': t('features.sermon_create'),
        'sermon:export_pdf': t('features.sermon_export_pdf'),
        'sermon:ai_assistant': t('features.sermon_ai_assistant'),
        'sermon:advanced_homiletics': t('features.sermon_advanced_homiletics'),
        'sermon:custom_templates': t('features.sermon_custom_templates'),

        // Library features
        'library:upload': t('features.library_upload'),
        'library:semantic_search': t('features.library_semantic_search'),
        'library:unlimited_storage': t('features.library_unlimited_storage'),

        // Courses features
        'courses:view': t('features.courses_view'),
        'courses:certificates': t('features.courses_certificates'),

        // Admin features
        'admin:manage_users': t('features.admin_manage_users'),
        'admin:view_analytics': t('features.admin_view_analytics'),
    };

    const getPlanName = (planId: string): string => {
        return planMetadata[planId]?.name || planId;
    };

    const getPlanDescription = (planId: string): string => {
        return planMetadata[planId]?.description || '';
    };

    const getFeatureLabel = (code: string): string => {
        return featureLabels[code] || code;
    };

    return {
        getPlanName,
        getPlanDescription,
        getFeatureLabel,
        currentLang
    };
}
