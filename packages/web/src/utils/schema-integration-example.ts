/**
 * Example integration of schema validation with SermonGeneratorService
 * This shows how to use the validation utilities in the generation flow
 */

import { buildSchemaPrompt } from '@/utils/schema-builder';
import { validateAndNormalizeContent } from '@/utils/content-validator';
import { migrateContent, needsMigration } from '@/utils/content-migrator';
import { ContentType } from '@dosfilos/domain';

/**
 * Example: Integrating schema prompt in exegesis generation
 */
export const generateExegesisWithSchema = async (passage: string, rules: any) => {
    // 1. Build schema prompt
    const schemaPrompt = buildSchemaPrompt('exegesis');

    // 2. Include schema in generation prompt
    const fullPrompt = `
Genera un estudio exegético para el pasaje: ${passage}

${schemaPrompt}

Reglas de generación:
- Audiencia: ${rules.targetAudience}
- Tono: ${rules.tone}
  `;

    // 3. Call AI service (pseudo-code)
    const rawResponse = await callAIService(fullPrompt);

    // 4. Parse JSON response
    const parsedContent = JSON.parse(rawResponse);

    // 5. Validate and normalize
    const { content, result } = validateAndNormalizeContent(parsedContent, 'exegesis');

    if (!result.valid) {
        console.error('Validation errors:', result.errors);
        // Handle validation errors
    }

    if (result.warnings.length > 0) {
        console.warn('Validation warnings:', result.warnings);
    }

    return content;
};

/**
 * Example: Loading existing content with migration
 */
export const loadExistingContent = async (contentId: string, contentType: ContentType) => {
    // 1. Load from database
    const rawContent = await loadFromDatabase(contentId);

    // 2. Check if migration is needed
    if (needsMigration(rawContent, contentType)) {
        console.log('Migrating content to latest schema version...');

        // 3. Migrate content
        const { content, metadata } = migrateContent(rawContent, contentType);

        console.log(`Migrated from v${metadata.fromVersion} to v${metadata.toVersion}`);

        // 4. Save migrated content
        await saveToDatabase(contentId, content);

        return content;
    }

    // 5. Validate even if no migration needed
    const { content, result } = validateAndNormalizeContent(rawContent, contentType);

    if (!result.valid) {
        console.error('Content validation failed:', result.errors);
    }

    return content;
};

// Pseudo-functions (to be implemented)
declare function callAIService(prompt: string): Promise<string>;
declare function loadFromDatabase(id: string): Promise<any>;
declare function saveToDatabase(id: string, content: any): Promise<void>;
