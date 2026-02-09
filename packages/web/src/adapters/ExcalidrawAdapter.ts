import type { DrawingEngineAdapter, AnnotationSnapshot } from './DrawingEngineAdapter';

// Excalidraw types - using any to avoid module resolution issues
type ExcalidrawImperativeAPI = any;
type ExcalidrawElement = any;

/**
 * Excalidraw implementation of the DrawingEngineAdapter
 */
export class ExcalidrawAdapter implements DrawingEngineAdapter {
    private api: ExcalidrawImperativeAPI;
    private changeCallback: ((snapshot: AnnotationSnapshot) => void) | null = null;

    constructor(api: ExcalidrawImperativeAPI) {
        this.api = api;
    }

    loadSnapshot(snapshot: AnnotationSnapshot): void {
        if (!snapshot.elements) {
            console.warn('[ExcalidrawAdapter] No elements in snapshot');
            return;
        }

        try {
            this.api.updateScene({
                elements: snapshot.elements as ExcalidrawElement[],
                appState: snapshot.appState as any
            });
        } catch (error) {
            console.error('[ExcalidrawAdapter] Error loading snapshot:', error);
        }
    }

    getSnapshot(): AnnotationSnapshot {
        const elements = this.api.getSceneElements();
        const appState = this.api.getAppState();

        // Clean appState - filter out undefined values to prevent Firestore errors
        const cleanAppState: Record<string, any> = {};

        if (appState.viewBackgroundColor !== undefined) cleanAppState.viewBackgroundColor = appState.viewBackgroundColor;
        if (appState.currentItemStrokeColor !== undefined) cleanAppState.currentItemStrokeColor = appState.currentItemStrokeColor;
        if (appState.currentItemBackgroundColor !== undefined) cleanAppState.currentItemBackgroundColor = appState.currentItemBackgroundColor;
        if (appState.currentItemFillStyle !== undefined) cleanAppState.currentItemFillStyle = appState.currentItemFillStyle;
        if (appState.currentItemStrokeWidth !== undefined) cleanAppState.currentItemStrokeWidth = appState.currentItemStrokeWidth;
        if (appState.currentItemRoughness !== undefined) cleanAppState.currentItemRoughness = appState.currentItemRoughness;
        if (appState.currentItemOpacity !== undefined) cleanAppState.currentItemOpacity = appState.currentItemOpacity;

        return {
            version: '1.0',
            elements: elements,
            appState: cleanAppState,
            metadata: {
                engineType: 'excalidraw'
                // updatedAt is added by useSermonAnnotations hook
            }
        };
    }

    hasUserContent(snapshot: AnnotationSnapshot): boolean {
        if (!snapshot.elements) {
            return false;
        }

        const elements = snapshot.elements as ExcalidrawElement[];
        return Array.isArray(elements) && elements.length > 0;
    }

    onChange(callback: (snapshot: AnnotationSnapshot) => void): () => void {
        this.changeCallback = callback;

        // Return cleanup function
        return () => {
            this.changeCallback = null;
        };
    }

    /**
     * Trigger the onChange callback (to be called from Excalidraw's onChange prop)
     */
    notifyChange(): void {
        if (this.changeCallback) {
            const snapshot = this.getSnapshot();
            this.changeCallback(snapshot);
        }
    }

    clear(): void {
        this.api.updateScene({
            elements: [],
            appState: {}
        });
    }

    getEngineType(): 'excalidraw' {
        return 'excalidraw';
    }
}
