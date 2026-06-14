import type { ElementoTipo } from '@dosfilos/domain';

/**
 * Frecuencia de uso de cada tipo de elemento al promover, para sugerir los más
 * usados arriba del picker ("Más usados"). localStorage per-browser (cross-device
 * sería Firestore más adelante). Aprendizaje pasivo: se incrementa en cada
 * promoción, sin que el usuario configure nada.
 */
const KEY = 'estudioTipoUsage';

function load(): Record<string, number> {
    try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
    } catch {
        return {};
    }
}

export function recordTipoUsage(tipo: ElementoTipo): void {
    try {
        const counts = load();
        counts[tipo] = (counts[tipo] ?? 0) + 1;
        localStorage.setItem(KEY, JSON.stringify(counts));
    } catch {
        /* localStorage no disponible */
    }
}

/** Top tipos por uso (desc), solo con uso > 0. */
export function getTopTipos(limit: number): ElementoTipo[] {
    const counts = load();
    return (Object.entries(counts) as [ElementoTipo, number][])
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tipo]) => tipo);
}
