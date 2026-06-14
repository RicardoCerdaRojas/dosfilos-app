import { estudioTipoUsageService } from '@dosfilos/application';
import type { ElementoTipo } from '@dosfilos/domain';

/**
 * Frecuencia de uso de tipos de elemento al promover, CROSS-DEVICE (Firestore
 * vía estudioTipoUsageService). Store externo para useSyncExternalStore: se
 * carga una vez por usuario, se actualiza optimista al promover (+ escribe a
 * Firestore en background). Aprendizaje pasivo — sin configurar nada.
 */
let counts: Record<string, number> = {};
let loadedFor: string | null = null;
let loading = false;
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Snapshot estable para useSyncExternalStore. */
export function getCounts(): Record<string, number> {
    return counts;
}

/** Carga una vez los contadores del usuario desde Firestore. */
export function ensureLoaded(userId: string): void {
    if (loadedFor === userId || loading) return;
    loading = true;
    estudioTipoUsageService
        .getUsage(userId)
        .then((remote) => {
            counts = remote ?? {};
            loadedFor = userId;
            notify();
        })
        .catch(() => {
            /* deja counts como está; reintenta en el próximo mount */
        })
        .finally(() => {
            loading = false;
        });
}

/** Incrementa optimista + persiste en Firestore (fire-and-forget). */
export function recordTipoUsage(userId: string, tipo: ElementoTipo): void {
    counts = { ...counts, [tipo]: (counts[tipo] ?? 0) + 1 };
    notify();
    void estudioTipoUsageService.recordUsage(userId, tipo).catch(() => {
        /* el optimista ya se mostró; la próxima carga reconcilia */
    });
}

export function getTopTipos(limit: number): ElementoTipo[] {
    return (Object.entries(counts) as [ElementoTipo, number][])
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tipo]) => tipo);
}
