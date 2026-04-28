// Feature code → user-facing label.
//
// Used by the public PlanCard component to render plan feature lists. Codes
// follow the pattern `<module>:<capability>`. Counts/limits are NOT encoded
// here — they live in `plans.{id}.limits` in Firestore. The label is a
// short human description; specific quotas surface via tooltips, the in-app
// UsageBanner, and the rejection toast when a gate fires.
export const featureLabels: Record<string, string> = {
    // ── Bible & Library (entry-tier hooks) ──────────────────────────────────
    'bible:read': 'Biblia interactiva',
    'library:curated': 'Biblioteca especializada',
    'library:upload': 'Biblioteca personal',
    'library:semantic_search': 'Búsqueda semántica',

    // ── Sermon production ───────────────────────────────────────────────────
    'sermon:create': 'Crear sermones',
    'sermon:create_unlimited': 'Sermones ilimitados',
    'sermon:export_pdf': 'Exportar sermones a PDF',
    'sermon:custom_templates': 'Plantillas personalizadas',

    // ── Series / Plans / Projects ───────────────────────────────────────────
    'series:create': 'Series y planes de predicación',
    'projects:create': 'Espacios de trabajo (Projects)',

    // ── Tutors (differentiator hooks) ───────────────────────────────────────
    'tutor:greek': 'Tutor de Griego',
    'tutor:greek_unlimited': 'Tutor de Griego ilimitado',
    'tutor:hebrew': 'Tutor de Hebreo',
    'tutor:hebrew_unlimited': 'Tutor de Hebreo ilimitado',

    // ── Faculty (AI agents) ─────────────────────────────────────────────────
    'faculty:chat': 'Faculty: chat con tutores AI',

    // ── Team / collaboration ────────────────────────────────────────────────
    'team:multi_user': 'Multi-usuario',

    // ── Legacy aliases (kept so old plan docs don't break the UI) ───────────
    'sermon:ai_assistant': 'Asistente de IA para sermones',
    'sermon:advanced_homiletics': 'Homilética avanzada con IA',
    'library:unlimited_storage': 'Almacenamiento ilimitado',
    'courses:view': 'Acceso a cursos',
    'courses:certificates': 'Certificados de cursos',
    'admin:manage_users': 'Gestión de usuarios',
    'admin:view_analytics': 'Analíticas avanzadas',
};

/**
 * Convert a feature code to a user-friendly label. Unknown codes fall
 * through to the raw code so a misconfigured Firestore plan still renders
 * something instead of nothing.
 */
export function getFeatureLabel(code: string): string {
    return featureLabels[code] || code;
}
