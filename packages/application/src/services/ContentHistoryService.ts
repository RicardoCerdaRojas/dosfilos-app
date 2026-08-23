import type { ContentHistoryDoc, IContentHistoryRepository, StoredSectionVersion } from '@dosfilos/domain';
import { FirestoreContentHistoryRepository } from '@dosfilos/infrastructure';

/**
 * Fachada del historial durable para las superficies del wizard.
 *
 * Existe para que los hooks no importen Firebase: la regla de arquitectura del
 * proyecto mantiene los 19 hooks de `web` libres de imports de Firebase, y este
 * historial no es la excepción.
 *
 * TODO LO QUE FALLA SE TRAGA. El historial es una red de seguridad, no el
 * documento: si Firestore no responde, el pastor tiene que poder seguir
 * escribiendo su sermón. `localStorage` sigue siendo la copia rápida en el hook,
 * así que un fallo acá degrada al comportamiento anterior, no a la pérdida.
 */
export class ContentHistoryService {
    constructor(private readonly repo: IContentHistoryRepository) {}

    async load(sermonId: string, contentType: string): Promise<Record<string, StoredSectionVersion[]> | null> {
        try {
            const doc = await this.repo.load(sermonId, contentType);
            return doc?.sections ?? null;
        } catch (error) {
            console.warn('[ContentHistory] no se pudo leer el historial durable', error);
            return null;
        }
    }

    async save(sermonId: string, contentType: string, sections: ContentHistoryDoc['sections']): Promise<void> {
        try {
            await this.repo.save(sermonId, { contentType, sections });
        } catch (error) {
            console.warn('[ContentHistory] no se pudo guardar el historial durable', error);
        }
    }
}

export const contentHistoryService = new ContentHistoryService(new FirestoreContentHistoryRepository());
