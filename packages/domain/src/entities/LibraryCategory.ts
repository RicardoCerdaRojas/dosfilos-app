/**
 * Library Category for organizing resources
 */
export interface LibraryCategory {
    id: string;
    label: string;
    icon?: string;  // Icon name from lucide-react
    color?: string; // Tailwind color class like 'blue', 'purple', etc.
    isDefault?: boolean; // System default categories
}

// Default categories that always exist. Order matters — it drives
// the display sequence in the upload form's dropdown and the library
// list filters. Related categories sit next to each other (the two
// dictionaries are below "Comentario Bíblico" because students reach
// for them in the same exegetical workflow).
export const DEFAULT_CATEGORIES: LibraryCategory[] = [
    { id: 'theology', label: 'Teología Sistemática', icon: 'Book', color: 'blue', isDefault: true },
    { id: 'grammar', label: 'Gramática / Idiomas', icon: 'Languages', color: 'purple', isDefault: true },
    { id: 'critical-text', label: 'Texto Crítico', icon: 'BookMarked', color: 'indigo', isDefault: true },
    { id: 'commentary', label: 'Comentario Bíblico', icon: 'MessageSquare', color: 'green', isDefault: true },
    { id: 'exegetical-commentary', label: 'Comentario Exegético', icon: 'ScrollText', color: 'emerald', isDefault: true },
    { id: 'theological-dictionary', label: 'Diccionario Teológico', icon: 'Library', color: 'amber', isDefault: true },
    { id: 'bible-dictionary', label: 'Diccionario Bíblico', icon: 'BookOpen', color: 'teal', isDefault: true },
    { id: 'article', label: 'Artículo / Paper', icon: 'FileText', color: 'orange', isDefault: true },
    { id: 'other', label: 'Otro', icon: 'FileQuestion', color: 'gray', isDefault: true },
];
