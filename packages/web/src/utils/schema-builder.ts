import { ContentType } from '@dosfilos/domain';
import { getSectionsForType } from '@/components/canvas-chat/section-configs';

/**
 * Schema Builder
 * Single Responsibility: Builds JSON schemas and prompts for AI generation
 * Open/Closed: Can be extended with new schema formats
 */
export class SchemaBuilder {
    /**
     * Build JSON schema for content type
     * Used for validation and documentation
     */
    buildJSONSchema(contentType: ContentType): object {
        const sections = getSectionsForType(contentType);

        const properties: Record<string, any> = {};
        const required: string[] = [];

        for (const section of sections) {
            properties[section.path] = {
                type: this.mapTypeToJSONSchema(section.type),
                description: section.description || section.label
            };

            if (section.required) {
                required.push(section.path);
            }
        }

        return {
            type: 'object',
            properties,
            required
        };
    }

    /**
     * Build prompt instruction for AI to follow schema
     * Interface Segregation: Specific method for prompt building
     */
    buildSchemaPrompt(contentType: ContentType): string {
        const sections = getSectionsForType(contentType);

        const schemaExample = sections.map(section => {
            const example = this.getExampleValue(section.type);
            return `  "${section.path}": ${example}`;
        }).join(',\n');

        return `
IMPORTANTE: Devuelve un objeto JSON con esta estructura exacta:
{
${schemaExample}
}

NO incluyas texto antes o después del JSON. Solo el objeto JSON.`;
    }

    /**
     * Build human-readable schema description
     */
    buildSchemaDescription(contentType: ContentType): string {
        const sections = getSectionsForType(contentType);

        const descriptions = sections.map(section => {
            const required = section.required ? '(requerido)' : '(opcional)';
            return `- **${section.label}** ${required}: ${section.description || 'Sin descripción'}`;
        }).join('\n');

        return `El contenido debe incluir las siguientes secciones:\n\n${descriptions}`;
    }

    // Private helper methods

    private mapTypeToJSONSchema(type: string): string {
        switch (type) {
            case 'text':
                return 'string';
            case 'array':
                return 'array';
            case 'object':
                return 'object';
            default:
                return 'string';
        }
    }

    private getExampleValue(type: string): string {
        switch (type) {
            case 'text':
                return '"texto aquí"';
            case 'array':
                return '["item1", "item2"]';
            case 'object':
                return '{ "key": "value" }';
            default:
                return '""';
        }
    }
}

// Singleton instance
export const schemaBuilder = new SchemaBuilder();

/**
 * Convenience functions
 */
export const buildSchemaPrompt = (contentType: ContentType): string => {
    return schemaBuilder.buildSchemaPrompt(contentType);
};

export const buildJSONSchema = (contentType: ContentType): object => {
    return schemaBuilder.buildJSONSchema(contentType);
};

export const buildSchemaDescription = (contentType: ContentType): string => {
    return schemaBuilder.buildSchemaDescription(contentType);
};
