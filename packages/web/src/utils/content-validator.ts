import { ContentType } from '@dosfilos/domain';
import { getSectionsForType, SectionConfig } from '@/components/canvas-chat/section-configs';
import { getValueByPath, setValueByPath } from './path-utils';

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    sectionId: string;
    message: string;
    path: string;
}

export interface ValidationWarning {
    sectionId: string;
    message: string;
    path: string;
}

/**
 * Content Validator
 * Single Responsibility: Validates content structure
 * Open/Closed: Can be extended with new validation rules
 */
export class ContentValidator {
    /**
     * Validate content against schema
     */
    validate(content: any, contentType: ContentType): ValidationResult {
        const sections = getSectionsForType(contentType);
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        for (const section of sections) {
            const value = getValueByPath(content, section.path);

            // Check required sections
            if (section.required && this.isEmpty(value)) {
                errors.push({
                    sectionId: section.id,
                    message: `Required section '${section.label}' is missing or empty`,
                    path: section.path
                });
            }

            // Check type mismatch
            if (value !== undefined && !this.isValidType(value, section.type)) {
                errors.push({
                    sectionId: section.id,
                    message: `Section '${section.label}' has invalid type. Expected ${section.type}`,
                    path: section.path
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Normalize content by filling missing sections with defaults
     * Dependency Inversion: Depends on SectionConfig abstraction
     */
    normalize(content: any, contentType: ContentType): any {
        const sections = getSectionsForType(contentType);
        const normalized = { ...content };

        for (const section of sections) {
            const value = getValueByPath(normalized, section.path);

            if (this.isEmpty(value)) {
                const defaultValue = this.getDefaultValue(section);
                setValueByPath(normalized, section.path, defaultValue);
            }
        }

        return normalized;
    }

    /**
     * Validate and normalize in one step
     */
    validateAndNormalize(content: any, contentType: ContentType): {
        content: any;
        result: ValidationResult;
    } {
        const normalized = this.normalize(content, contentType);
        const result = this.validate(normalized, contentType);

        return { content: normalized, result };
    }

    // Private helper methods

    private isEmpty(value: any): boolean {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    private isValidType(value: any, expectedType: string): boolean {
        switch (expectedType) {
            case 'text':
                return typeof value === 'string';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && !Array.isArray(value);
            default:
                return false;
        }
    }

    private getDefaultValue(section: SectionConfig): any {
        if (section.defaultValue !== undefined) {
            return section.defaultValue;
        }

        switch (section.type) {
            case 'text':
                return '';
            case 'array':
                return [];
            case 'object':
                return {};
            default:
                return null;
        }
    }
}

// Singleton instance
export const contentValidator = new ContentValidator();

/**
 * Convenience function for validation
 */
export const validateContent = (content: any, contentType: ContentType): ValidationResult => {
    return contentValidator.validate(content, contentType);
};

/**
 * Convenience function for normalization
 */
export const normalizeContent = (content: any, contentType: ContentType): any => {
    return contentValidator.normalize(content, contentType);
};

/**
 * Convenience function for validate and normalize
 */
export const validateAndNormalizeContent = (content: any, contentType: ContentType) => {
    return contentValidator.validateAndNormalize(content, contentType);
};
