import type { useContentHistory } from '@/hooks/useContentHistory';

type ContentHistory = ReturnType<typeof useContentHistory>;

export interface DraftHistoryInput {
    draft: any;
    contentHistory: ContentHistory;
    /** Abrir el historial expande la sección y limpia el chat de la anterior. */
    setExpandedSectionId: (id: string | null) => void;
    setOpenHistoryFor: (id: string | null) => void;
    setMessages: (messages: any[]) => void;
}

/**
 * EL SEGURO ANTES DE PISAR EL SERMÓN ANTERIOR.
 *
 * Dos acciones se llevan por delante lo que había —regenerar y armar desde el
 * taller— y las dos pasan por acá primero. Cuando esto vivía dentro de la
 * generación, armar el borrador reemplazaba sin dejar rastro; y armar con
 * secciones sin redactar produce un esqueleto, así que el pastor podía perder un
 * sermón completo con un clic y sin aviso.
 *
 * SE GUARDA POR SECCIÓN, NO COMO BLOQUE. Es como el historial ya funciona, y
 * permite rescatar sólo la introducción que le gustaba sin perder los puntos
 * nuevos.
 */
export function useDraftHistory(input: DraftHistoryInput) {
    const { contentHistory } = input;

    const archivarBorradorActual = async (etiqueta: string): Promise<boolean> => {
        if (!input.draft) return false;
        const { getSectionsForType } = await import('@/components/canvas-chat/section-configs');
        const { getValueByPath } = await import('@/utils/path-utils');
        let guardo = false;
        for (const section of getSectionsForType('sermon')) {
            const previo = getValueByPath(input.draft, section.path);
            if (previo === undefined || previo === null) continue;
            contentHistory.saveVersion(section.id, previo, etiqueta, undefined);
            guardo = true;
        }
        return guardo;
    };

    /**
     * Abre el historial de una sección. Lo llaman los dos caminos de entrada: el
     * aviso que aparece tras regenerar y el indicador de la tarjeta.
     */
    const abrirHistorial = (sectionId: string) => {
        input.setOpenHistoryFor(sectionId);
        input.setExpandedSectionId(sectionId);
        input.setMessages([]);
    };

    return {
        archivarBorradorActual,
        abrirHistorial,
        getSectionVersions: (sectionId: string) => contentHistory.getVersions(sectionId),
        getCurrentVersionId: (sectionId: string) => contentHistory.getCurrentVersion(sectionId)?.id,
        canRedo: (sectionId: string) => contentHistory.canRedo(sectionId),
    };
}
