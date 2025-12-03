import { ContentType } from '@dosfilos/domain';
import { getCurrentSchemaVersion } from '@/components/canvas-chat/section-configs';

/**
 * Content Migration Strategy
 * Single Responsibility: Handles content versioning and migration
 * Open/Closed: New migrations can be added without modifying existing code
 */

export interface MigrationMetadata {
    contentType: ContentType;
    fromVersion: number;
    toVersion: number;
    migratedAt: Date;
}

/**
 * Migration function signature
 */
export type MigrationFunction = (content: any) => any;

/**
 * Migration registry
 * Stores migration functions for each content type and version
 */
class MigrationRegistry {
    private migrations: Map<string, MigrationFunction> = new Map();

    /**
     * Register a migration function
     */
    register(
        contentType: ContentType,
        fromVersion: number,
        toVersion: number,
        migrationFn: MigrationFunction
    ): void {
        const key = this.getKey(contentType, fromVersion, toVersion);
        this.migrations.set(key, migrationFn);
    }

    /**
     * Get migration function
     */
    get(
        contentType: ContentType,
        fromVersion: number,
        toVersion: number
    ): MigrationFunction | undefined {
        const key = this.getKey(contentType, fromVersion, toVersion);
        return this.migrations.get(key);
    }

    private getKey(contentType: ContentType, from: number, to: number): string {
        return `${contentType}:${from}->${to}`;
    }
}

const migrationRegistry = new MigrationRegistry();

/**
 * Content Migrator
 * Dependency Inversion: Depends on MigrationRegistry abstraction
 */
export class ContentMigrator {
    /**
     * Check if content needs migration
     */
    needsMigration(content: any, contentType: ContentType): boolean {
        const contentVersion = this.getContentVersion(content);
        const currentVersion = getCurrentSchemaVersion(contentType);
        return contentVersion < currentVersion;
    }

    /**
     * Migrate content to latest version
     */
    migrate(content: any, contentType: ContentType): {
        content: any;
        metadata: MigrationMetadata;
    } {
        const fromVersion = this.getContentVersion(content);
        const toVersion = getCurrentSchemaVersion(contentType);

        if (fromVersion === toVersion) {
            return {
                content,
                metadata: {
                    contentType,
                    fromVersion,
                    toVersion,
                    migratedAt: new Date()
                }
            };
        }

        let migrated = { ...content };

        // Apply migrations incrementally
        for (let v = fromVersion; v < toVersion; v++) {
            const migration = migrationRegistry.get(contentType, v, v + 1);
            if (migration) {
                migrated = migration(migrated);
            } else {
                console.warn(`No migration found for ${contentType} v${v} -> v${v + 1}`);
            }
        }

        // Update version metadata
        migrated.__schemaVersion = toVersion;

        return {
            content: migrated,
            metadata: {
                contentType,
                fromVersion,
                toVersion,
                migratedAt: new Date()
            }
        };
    }

    /**
     * Get content version from metadata
     */
    private getContentVersion(content: any): number {
        return content.__schemaVersion || 1;
    }
}

// Singleton instance
export const contentMigrator = new ContentMigrator();

/**
 * Register a migration
 * Example usage:
 * registerMigration('exegesis', 1, 2, (content) => {
 *   return { ...content, newField: 'default value' };
 * });
 */
export const registerMigration = (
    contentType: ContentType,
    fromVersion: number,
    toVersion: number,
    migrationFn: MigrationFunction
): void => {
    migrationRegistry.register(contentType, fromVersion, toVersion, migrationFn);
};

/**
 * Convenience function for migration
 */
export const migrateContent = (content: any, contentType: ContentType) => {
    return contentMigrator.migrate(content, contentType);
};

/**
 * Convenience function to check if migration is needed
 */
export const needsMigration = (content: any, contentType: ContentType): boolean => {
    return contentMigrator.needsMigration(content, contentType);
};
