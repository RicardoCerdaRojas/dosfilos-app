import type { ExegeticalPaper, IExegeticalPaperRepository } from '@dosfilos/domain';

/**
 * Guarda como ensamble del trabajo una composición que ya existe.
 *
 * Separado de `ComposeAcademicPaperUseCase` porque guardar no debe
 * componer. El botón «Guardar al paper» llamaba de nuevo al compositor
 * con `persist: true`, así que una composición costaba DOS llamadas de
 * Gemini Pro y lo que se guardaba no era el texto que el usuario acababa
 * de revisar: un modelo no produce dos veces lo mismo, y el documento
 * aprobado y el archivado podían diferir sin que nadie lo notara.
 *
 * No valida el contenido a propósito. Lo que llega ya pasó por el
 * compositor y por los ojos de quien lo aprobó; rechazarlo aquí sería
 * descartar trabajo que costó una llamada cara y una lectura.
 */
export class SaveAssembledPaperUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: {
        ownerId: string;
        paperId: string;
        markdown: string;
    }): Promise<ExegeticalPaper> {
        if (!input.ownerId || !input.paperId) {
            throw new Error('SaveAssembledPaperUseCase: ownerId and paperId required');
        }
        if (!input.markdown.trim()) {
            throw new Error('SaveAssembledPaperUseCase: refusing to save an empty composition');
        }
        return this.paperRepository.updatePaper(input.ownerId, input.paperId, {
            assembledMarkdown: input.markdown,
        });
    }
}
