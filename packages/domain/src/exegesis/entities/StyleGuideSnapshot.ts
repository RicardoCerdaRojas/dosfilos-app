import type { StyleGuideManifest } from './StyleGuideManifest';

/**
 * La guía de estilo congelada en el momento de adjuntarla a un trabajo.
 *
 * **Por qué se congela.** La rúbrica y el encuadre se copian al paper;
 * la guía sólo se referenciaba por id. Editarla —o reextraer su
 * manifiesto— cambiaba las reglas de todos los trabajos que la
 * apuntaran, incluidos los ya entregados. Un paper entregado no puede
 * cambiar de reglas porque alguien corrigió la plantilla después.
 *
 * **Qué se congela y qué no.** El manifiesto, que es lo que gobierna la
 * composición y el formateador determinista. No el texto crudo de la
 * guía: son cientos de kilobytes y el documento del paper ya carga los
 * análisis canónicos de cada verso. Volver a subir el ARCHIVO de la
 * guía sigue alcanzando a los papers viejos; el límite queda declarado
 * y no escondido.
 */
export interface StyleGuideSnapshot {
    /** Guía de la que salió, para poder ofrecer «actualizar a la actual». */
    sourceGuideId: string;
    /** Nombre que tenía al copiarla; el de la guía viva puede haber cambiado. */
    displayName: string;
    version: string | null;
    /**
     * Las reglas. `null` cuando se adjuntó una guía cuyo manifiesto aún
     * no se había extraído: la composición cae a su comportamiento sin
     * manifiesto, igual que antes.
     */
    manifest: StyleGuideManifest | null;
    capturedAt: Date;
}

/** De dónde salieron las reglas que se están usando. */
export type StyleGuideOrigin = 'snapshot' | 'live' | 'none';

export interface ResolvedStyleGuide {
    manifest: StyleGuideManifest | null;
    displayName: string | null;
    origin: StyleGuideOrigin;
    /**
     * `true` cuando el trabajo tiene copia propia y la guía viva cambió
     * su manifiesto desde entonces. Es lo que habilita el «actualizar»:
     * un aviso, nunca un cambio automático.
     */
    liveGuideDiffers: boolean;
}

/**
 * Qué reglas rigen para este trabajo.
 *
 * La copia manda sobre la guía viva SIEMPRE que exista. Los papers
 * anteriores a la copia no tienen ninguna, y ahí se resuelve contra la
 * guía viva — que es exactamente como venían funcionando.
 */
export function resolveStyleGuide(
    snapshot: StyleGuideSnapshot | null | undefined,
    liveGuide: { displayName: string; manifest: StyleGuideManifest | null } | null,
): ResolvedStyleGuide {
    if (snapshot) {
        return {
            manifest: snapshot.manifest,
            displayName: snapshot.displayName,
            origin: 'snapshot',
            liveGuideDiffers: !!liveGuide
                && JSON.stringify(liveGuide.manifest ?? null) !== JSON.stringify(snapshot.manifest ?? null),
        };
    }
    if (liveGuide) {
        return {
            manifest: liveGuide.manifest,
            displayName: liveGuide.displayName,
            origin: 'live',
            liveGuideDiffers: false,
        };
    }
    return { manifest: null, displayName: null, origin: 'none', liveGuideDiffers: false };
}
