import type { ExegeticalStep, IExegeticalPaperRepository } from '@dosfilos/domain';

/**
 * Devuelve un paso aceptado al estado de revisión, para poder rehacerlo.
 *
 * Faltaba: una vez aceptado un análisis no había forma de volver atrás, así que
 * un paso aprobado por error —o que quedó viejo cuando cambió el corpus o el
 * pasaje— era definitivo.
 *
 * No borra nada. El análisis aceptado queda como una versión más del historial
 * y el paso vuelve a revisión; regenerar agrega otra versión al lado. Rehacer
 * tiene que ser reversible: si el resultado nuevo sale peor, el anterior sigue
 * estando.
 */
export class ReopenStepUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: {
        ownerId: string;
        paperId: string;
        stepId: string;
    }): Promise<ExegeticalStep> {
        const { ownerId, paperId, stepId } = input;
        if (!ownerId || !paperId || !stepId) {
            throw new Error('ReopenStepUseCase: ownerId, paperId y stepId son obligatorios');
        }
        return this.paperRepository.reopenStep(ownerId, paperId, stepId);
    }
}
