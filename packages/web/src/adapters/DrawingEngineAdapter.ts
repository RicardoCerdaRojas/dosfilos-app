/**
 * Drawing Engine Adapter Pattern
 * 
 * This abstraction allows easy swapping of drawing libraries (Excalidraw, Fabric.js, etc.)
 * without changing business logic.
 */

/**
 * Generic annotation snapshot format
 * Compatible with any drawing engine through adapters
 */
export interface AnnotationSnapshot {
    /** Version of the snapshot format */
    version: string;

    /** Drawing elements in engine-specific format */
    elements: unknown;

    /** Optional application state (viewport, tool settings, etc.) */
    appState?: unknown;

    /** Metadata for tracking */
    metadata?: {
        createdAt?: Date;
        updatedAt?: Date;
        engineType?: 'excalidraw' | 'tldraw' | 'fabric' | 'konva';
    };
}

/**
 * Adapter interface for drawing engines
 * All engines must implement this interface
 */
export interface DrawingEngineAdapter {
    /**
     * Load a snapshot into the editor
     * @param snapshot The snapshot to load
     */
    loadSnapshot(snapshot: AnnotationSnapshot): void;

    /**
     * Get the current snapshot from the editor
     * @returns Current annotation snapshot
     */
    getSnapshot(): AnnotationSnapshot;

    /**
     * Check if snapshot contains user-created content
     * @param snapshot The snapshot to check
     * @returns true if snapshot has user content
     */
    hasUserContent(snapshot: AnnotationSnapshot): boolean;

    /**
     * Listen for changes in the editor
     * @param callback Function to call when content changes
     * @returns Cleanup function to stop listening
     */
    onChange(callback: (snapshot: AnnotationSnapshot) => void): () => void;

    /**
     * Clear all content from the editor
     */
    clear(): void;

    /**
     * Get the engine type identifier
     */
    getEngineType(): 'excalidraw' | 'tldraw' | 'fabric' | 'konva';
}

/**
 * Tool configuration for drawing engines
 */
export interface ToolConfig {
    enabledTools?: string[];
    defaultTool?: string;
    colors?: string[];
    strokeWidths?: number[];
}
