import type { ElementoEstudio, ElementoTipo, SubtipoAplicacion } from '@dosfilos/domain';

/**
 * Borrador del "Estudio en construcción" — los elementos que el docente promueve
 * desde el chat ANTES de cristalizar (spec v1.3 §2.4).
 *
 * Store externo (module-level) por sesión, respaldado en localStorage, para que
 * el botón de promoción (en los mensajes) y el panel (en el rail derecho) se
 * mantengan en sync sin un provider que envuelva la página. Sirve a
 * `useSyncExternalStore`.
 *
 * DEUDA CONOCIDA (registrada): el borrador vive solo en localStorage. Si el
 * docente cura por media hora y cambia de dispositivo o limpia el navegador
 * ANTES de cristalizar, pierde la curación. El estudio ya cristalizado SÍ
 * persiste en Firestore. Persistencia Firestore del borrador = prioridad
 * temprana post-MVP.
 */

export interface DraftElemento extends ElementoEstudio {
    /** Mensaje de origen (alimenta derivedFromMessageIds + trazabilidad). */
    mensajeId?: string;
}

export interface EstudioDraft {
    elementos: DraftElemento[];
    referencia: string;
    titulo: string;
    /** Respuestas del docente a testigos que disienten, por claimKey. */
    respuestas: Record<string, string>;
}

const EMPTY: EstudioDraft = { elementos: [], referencia: '', titulo: '', respuestas: {} };
const STORAGE_PREFIX = 'estudioDraft:';

const cache = new Map<string, EstudioDraft>();
const listeners = new Set<() => void>();

function storageKey(sessionId: string): string {
    return `${STORAGE_PREFIX}${sessionId}`;
}

function load(sessionId: string): EstudioDraft {
    try {
        const raw = localStorage.getItem(storageKey(sessionId));
        if (!raw) return EMPTY;
        const parsed = JSON.parse(raw) as Partial<EstudioDraft>;
        return {
            elementos: Array.isArray(parsed.elementos) ? parsed.elementos : [],
            referencia: typeof parsed.referencia === 'string' ? parsed.referencia : '',
            titulo: typeof parsed.titulo === 'string' ? parsed.titulo : '',
            respuestas:
                parsed.respuestas && typeof parsed.respuestas === 'object'
                    ? (parsed.respuestas as Record<string, string>)
                    : {},
        };
    } catch {
        return EMPTY;
    }
}

/** Snapshot estable (mismo objeto hasta que muta) — requerido por useSyncExternalStore. */
export function getDraft(sessionId: string): EstudioDraft {
    if (!cache.has(sessionId)) cache.set(sessionId, load(sessionId));
    return cache.get(sessionId)!;
}

export function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function commit(sessionId: string, next: EstudioDraft): void {
    cache.set(sessionId, next);
    try {
        if (
            next.elementos.length === 0 &&
            !next.referencia &&
            !next.titulo &&
            Object.keys(next.respuestas).length === 0
        ) {
            localStorage.removeItem(storageKey(sessionId));
        } else {
            localStorage.setItem(storageKey(sessionId), JSON.stringify(next));
        }
    } catch {
        // localStorage lleno / no disponible: el estado en memoria sigue válido.
    }
    listeners.forEach((l) => l());
}

function update(sessionId: string, fn: (d: EstudioDraft) => EstudioDraft): void {
    commit(sessionId, fn(getDraft(sessionId)));
}

function genId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        return `e_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    }
}

// ── Mutaciones ──────────────────────────────────────────────────────────────

export function addElemento(
    sessionId: string,
    input: { tipo: ElementoTipo; contenido: string; autoria: DraftElemento['autoria']; mensajeId?: string },
): void {
    update(sessionId, (d) => {
        const elemento: DraftElemento = {
            id: genId(),
            tipo: input.tipo,
            orden: d.elementos.length + 1,
            contenido: input.contenido,
            autoria: input.autoria,
            mensajeId: input.mensajeId,
        };
        return { ...d, elementos: [...d.elementos, elemento] };
    });
}

/**
 * Añade un elemento ya construido (p.ej. el `aplicacion:corazon` que produce la
 * conducción C1–C5). El store solo asigna `id`/`orden`; los demás campos —
 * subtipo, autoría, traza — vienen resueltos del dominio.
 */
export function addElementoConducido(
    sessionId: string,
    fields: Pick<DraftElemento, 'tipo' | 'subtipo' | 'autoria' | 'contenido' | 'conduccionCorazon'>,
): void {
    update(sessionId, (d) => {
        const elemento: DraftElemento = {
            id: genId(),
            orden: d.elementos.length + 1,
            ...fields,
        };
        return { ...d, elementos: [...d.elementos, elemento] };
    });
}

export function removeElemento(sessionId: string, id: string): void {
    update(sessionId, (d) => ({
        ...d,
        elementos: reordenar(d.elementos.filter((e) => e.id !== id)),
    }));
}

export function moveElemento(sessionId: string, id: string, dir: 'up' | 'down'): void {
    update(sessionId, (d) => {
        const idx = d.elementos.findIndex((e) => e.id === id);
        if (idx === -1) return d;
        const swap = dir === 'up' ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= d.elementos.length) return d;
        const next = [...d.elementos];
        [next[idx], next[swap]] = [next[swap], next[idx]];
        return { ...d, elementos: reordenar(next) };
    });
}

export function setTipo(sessionId: string, id: string, tipo: ElementoTipo): void {
    update(sessionId, (d) => ({
        ...d,
        elementos: d.elementos.map((e) => {
            if (e.id !== id) return e;
            const next = { ...e, tipo };
            // El subtipo solo vive en `aplicacion`; al cambiar de tipo se descarta
            // para no arrastrar una dimensión huérfana.
            if (tipo !== 'aplicacion') delete next.subtipo;
            return next;
        }),
    }));
}

export function setSubtipo(sessionId: string, id: string, subtipo: SubtipoAplicacion | undefined): void {
    update(sessionId, (d) => ({
        ...d,
        elementos: d.elementos.map((e) => {
            if (e.id !== id) return e;
            const next = { ...e };
            if (subtipo) next.subtipo = subtipo;
            else delete next.subtipo;
            return next;
        }),
    }));
}

export function setContenido(sessionId: string, id: string, contenido: string): void {
    update(sessionId, (d) => ({
        ...d,
        elementos: d.elementos.map((e) =>
            e.id === id
                // Editar contenido de origen `sistema` = revisión del docente ⇒ `mixto`
                // (spec §2.4: "promueve lo que pidió y revisó"). docente/mixto no cambian.
                ? { ...e, contenido, autoria: e.autoria === 'sistema' ? 'mixto' : e.autoria }
                : e,
        ),
    }));
}

export function setRespaldo(sessionId: string, id: string, respaldoTestigos: string[]): void {
    update(sessionId, (d) => ({
        ...d,
        elementos: d.elementos.map((e) => (e.id === id ? { ...e, respaldoTestigos } : e)),
    }));
}

export function setReferencia(sessionId: string, referencia: string): void {
    update(sessionId, (d) => ({ ...d, referencia }));
}

export function setTitulo(sessionId: string, titulo: string): void {
    update(sessionId, (d) => ({ ...d, titulo }));
}

export function setRespuesta(sessionId: string, claimKey: string, response: string): void {
    update(sessionId, (d) => ({ ...d, respuestas: { ...d.respuestas, [claimKey]: response } }));
}

export function clearDraft(sessionId: string): void {
    commit(sessionId, EMPTY);
}

/** Renumera `orden` 1..N tras añadir/quitar/mover. */
function reordenar(elementos: DraftElemento[]): DraftElemento[] {
    return elementos.map((e, i) => ({ ...e, orden: i + 1 }));
}
