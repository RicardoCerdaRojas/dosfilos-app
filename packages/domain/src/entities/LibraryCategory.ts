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

// Default categories that always exist
export const DEFAULT_CATEGORIES: LibraryCategory[] = [
    { id: 'theology', label: 'Teología Sistemática', icon: 'Book', color: 'blue', isDefault: true },
    { id: 'grammar', label: 'Gramática / Idiomas', icon: 'Languages', color: 'purple', isDefault: true },
    { id: 'commentary', label: 'Comentario Bíblico', icon: 'MessageSquare', color: 'green', isDefault: true },
    { id: 'article', label: 'Artículo / Paper', icon: 'FileText', color: 'orange', isDefault: true },
    { id: 'other', label: 'Otro', icon: 'FileQuestion', color: 'gray', isDefault: true },
];
