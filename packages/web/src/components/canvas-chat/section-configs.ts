import { ContentType } from '@dosfilos/domain';

/**
 * Configuration for a content section
 * Defines structure, validation, and metadata for each editable section
 */
export interface SectionConfig {
    /** Unique identifier for the section */
    id: string;

    /** Human-readable label */
    label: string;

    /** JSON path to access this section in the content object (e.g., 'context.historical') */
    path: string;

    /** Optional description for UI tooltips */
    description?: string;

    /**
     * Arranca colapsada. Para secciones que son CONTEXTO de referencia y no
     * contenido que el pastor trabaje ahí: abiertas compiten por atención con
     * lo que sí está editando.
     */
    collapsedByDefault?: boolean;

    /** Data type of the section */
    type: 'text' | 'array' | 'object';

    /** Whether this section is required in initial generation */
    required: boolean;

    /** Default value if section is missing */
    defaultValue?: any;

    /** Schema version when this section was introduced */
    version: number;

    /** 🎯 NEW: If true, this section is computed/readonly and cannot be edited */
    readonly?: boolean;
}

/**
 * Section configurations for each content type
 * Following Open/Closed Principle: Open for extension, closed for modification
 */
export const SECTION_CONFIGS: Record<ContentType, SectionConfig[]> = {
    exegesis: [
        {
            id: 'historical',
            label: 'Contexto Histórico',
            path: 'context.historical',
            description: 'Contexto histórico y cultural del pasaje',
            type: 'text',
            required: true,
            version: 1
        },
        {
            id: 'literary',
            label: 'Contexto Literario',
            path: 'context.literary',
            description: 'Género literario y estructura del pasaje',
            type: 'text',
            required: true,
            version: 1
        },
        {
            id: 'audience',
            label: 'Audiencia Original',
            path: 'context.audience',
            description: 'Audiencia original del texto',
            type: 'text',
            required: true,
            version: 1
        },
        {
            id: 'keywords',
            label: 'Palabras Clave',
            path: 'keyWords',
            description: 'Estudio de palabras clave en idiomas originales',
            type: 'array',
            required: true,
            defaultValue: [],
            version: 1
        },
        {
            id: 'proposition',
            label: 'Proposición Exegética',
            path: 'exegeticalProposition',
            description: 'Proposición exegética del pasaje',
            type: 'text',
            required: true,
            version: 1
        },
        {
            id: 'insights',
            label: 'Insights Pastorales',
            path: 'pastoralInsights',
            description: 'Insights para aplicación pastoral',
            type: 'array',
            required: true,
            defaultValue: [],
            version: 1
        }
    ],

    homiletics: [
        {
            id: 'approach',
            // Contexto de referencia, no contenido que el pastor trabaje acá:
            // arranca colapsado para no competir con el contrato.
            collapsedByDefault: true,
            label: 'Enfoque Homilético',
            path: 'approachDisplay', // 🎯 FIX: Use display field, not selectedApproachId
            description: 'Enfoque homilético seleccionado',
            type: 'text',
            required: true,
            version: 2, // Bumped version for new multi-approach feature
            readonly: true // 🎯 This is computed, cannot be edited directly
        },
        {
            id: 'proposition',
            label: 'Proposición y bosquejo',
            path: 'homileticalProposition',
            // Su cuerpo lo aporta `sectionBodies` (el editor del contrato):
            // proposición y títulos de los puntos se editan juntos porque son
            // un solo contrato. El `path` se mantiene: es lo que refina el chat
            // y lo que versiona el historial.
            description: 'Se editan juntos: los puntos heredan el llamado de la proposición',
            type: 'text',
            required: true,
            version: 1
        },
        {
            id: 'outline',
            label: 'Bosquejo',
            path: 'outline',
            description: 'Bosquejo del sermón',
            type: 'object',
            required: true,
            version: 1
        },
        // La sección suelta de "Aplicación Contemporánea" se retiró el
        // 2026-08-23. La aplicación pasó a vivir EN cada punto del bosquejo
        // (`outline.mainPoints[].application`), una por punto, que es lo que
        // permite saber a qué punto pertenece cada una.
        //
        // Como lista aparte no tenía destino: el prompt del borrador NUNCA leía
        // `contemporaryApplication` —lo verifiqué recorriendo la función— así
        // que se generaba, el pastor la editaba, y el sermón se escribía
        // inventando otras implicaciones desde cero.
    ],

    sermon: [
        {
            id: 'introduction',
            label: 'Introducción',
            path: 'introduction',
            description: 'Introducción del sermón',
            type: 'text',
            required: true,
            version: 1
        },
        {
            id: 'body',
            label: 'Puntos del Sermón',
            path: 'body',
            description: 'Desarrollo de los puntos principales',
            type: 'array',
            required: true,
            defaultValue: [],
            version: 1
        },
        {
            id: 'conclusion',
            label: 'Conclusión',
            path: 'conclusion',
            description: 'Conclusión del sermón',
            type: 'text',
            required: true,
            version: 1
        }
    ]
};

/**
 * Get section configuration by ID
 * Single Responsibility: Only retrieves configuration
 */
export const getSectionConfig = (
    contentType: ContentType,
    sectionId: string
): SectionConfig | undefined => {
    return SECTION_CONFIGS[contentType].find(s => s.id === sectionId);
};

/**
 * Get all sections for a content type
 */
export const getSectionsForType = (contentType: ContentType): SectionConfig[] => {
    return SECTION_CONFIGS[contentType];
};

/**
 * Get current schema version for a content type
 */
export const getCurrentSchemaVersion = (contentType: ContentType): number => {
    const sections = SECTION_CONFIGS[contentType];
    return Math.max(...sections.map(s => s.version));
};
