// Module access features (from plans.modules array)
export enum Module {
    DASHBOARD = 'module:dashboard',
    SERMONES = 'module:sermones',
    PLANES = 'module:planes',
    GENERAR = 'module:generar',
    BIBLIOTECA = 'module:biblioteca',
    CONFIGURACION = 'module:configuracion',
    GREEK_TUTOR = 'module:greek_tutor',
}

// Feature capabilities (from plans.features array)
export enum Feature {
    SERMON_CREATE = 'sermon:create',
    SERMON_AI_ASSISTANT = 'sermon:ai_assistant',
    SERMON_EXPORT_PDF = 'sermon:export_pdf',
    LIBRARY_UPLOAD = 'library:upload',
    LIBRARY_SEMANTIC_SEARCH = 'library:semantic_search',
}

// Admin permissions
export enum AdminPermission {
    ADMIN_USERS = 'admin:users',
    ADMIN_PLANS = 'admin:plans',
    ADMIN_ANALYTICS = 'admin:analytics',
    ADMIN_SYSTEM_CONFIG = 'admin:system_config',
}
