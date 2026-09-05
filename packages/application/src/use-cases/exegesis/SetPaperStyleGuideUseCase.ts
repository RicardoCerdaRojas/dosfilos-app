import type {
    IExegeticalPaperRepository,
    IUserStyleGuideRepository,
    StyleGuideSnapshot,
} from '@dosfilos/domain';

export interface SetPaperStyleGuideInput {
    ownerId: string;
    paperId: string;
    /** Guía a adjuntar. `null` desprende la guía y sus reglas. */
    styleGuideId: string | null;
}

/**
 * Adjunta una guía de estilo a un trabajo, copiándola.
 *
 * La copia se toma AQUÍ, en el momento en que el usuario elige — no al
 * componer. Es lo que hace que editar la guía después no alcance a este
 * trabajo, y es también lo que hace que «actualizar a la versión
 * actual» sea un acto deliberado: volver a llamar a este caso de uso.
 *
 * Desprender la guía borra las dos cosas. Dejar la copia sin el id
 * dejaría un trabajo con reglas que no se pueden rastrear a ninguna
 * guía.
 */
export class SetPaperStyleGuideUseCase {
    constructor(
        private paperRepository: IExegeticalPaperRepository,
        private styleGuideRepository: IUserStyleGuideRepository,
    ) { }

    async execute(input: SetPaperStyleGuideInput): Promise<StyleGuideSnapshot | null> {
        const { ownerId, paperId, styleGuideId } = input;
        if (!ownerId || !paperId) {
            throw new Error('SetPaperStyleGuideUseCase: ownerId y paperId son obligatorios');
        }

        if (!styleGuideId) {
            await this.paperRepository.updatePaper(ownerId, paperId, {
                styleGuideId: null,
                styleGuideSnapshot: null,
            });
            return null;
        }

        const guide = await this.styleGuideRepository.getGuide(ownerId, styleGuideId);
        if (!guide) {
            throw new Error(`SetPaperStyleGuideUseCase: la guía ${styleGuideId} no existe`);
        }

        const snapshot: StyleGuideSnapshot = {
            sourceGuideId: guide.id,
            displayName: guide.displayName,
            version: guide.version,
            // Puede ser `null` si la extracción del manifiesto todavía no
            // terminó. Se copia igual: el trabajo queda atado a ESTA guía,
            // y la composición cae a su comportamiento sin manifiesto como
            // ya hacía. Volver a adjuntarla más tarde toma la copia buena.
            manifest: guide.manifest,
            capturedAt: new Date(),
        };

        await this.paperRepository.updatePaper(ownerId, paperId, {
            styleGuideId: guide.id,
            styleGuideSnapshot: snapshot,
        });
        return snapshot;
    }
}
