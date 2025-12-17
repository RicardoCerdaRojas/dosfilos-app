// Feature code to user-friendly description mapping
export const featureLabels: Record<string, string> = {
    // Sermon features
    'sermon:create': 'Crear sermones ilimitados',
    'sermon:export_pdf': 'Exportar sermones a PDF',
    'sermon:ai_assistant': 'Asistente de IA para sermones',
    'sermon:advanced_homiletics': 'Homilética avanzada con IA',
    'sermon:custom_templates': 'Plantillas personalizadas',

    // Library features
    'library:upload': 'Subir recursos a biblioteca',
    'library:semantic_search': 'Búsqueda semántica en biblioteca',
    'library:unlimited_storage': 'Almacenamiento ilimitado',

    // Courses features
    'courses:view': 'Acceso a cursos',
    'courses:certificates': 'Certificados de cursos',

    // Admin features
    'admin:manage_users': 'Gestión de usuarios',
    'admin:view_analytics': 'Analíticas avanzadas',
};

/**
 * Convert a feature code to a user-friendly label
 */
export function getFeatureLabel(code: string): string {
    return featureLabels[code] || code;
}
