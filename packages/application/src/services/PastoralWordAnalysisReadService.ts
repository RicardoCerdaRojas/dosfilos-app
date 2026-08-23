import type { IPastoralWordAnalysisCacheRepository, PastoralWordAnalysisDoc } from '@dosfilos/domain';
import { FirestorePastoralWordAnalysisCacheRepository } from '@dosfilos/infrastructure';

/**
 * Lectura del análisis léxico cacheado, para las superficies que sólo consumen.
 *
 * POR QUÉ EXISTE COMO SERVICIO Y NO SE INSTANCIA EL REPOSITORIO EN LA PÁGINA:
 * la regla del proyecto prohíbe imports de Firebase en archivos `.tsx`, y el
 * chequeo de compliance la hace cumplir. La página pide el dato; quién lo
 * guarda es problema de esta capa.
 *
 * Sólo lectura a propósito: escribir el análisis es trabajo de
 * `AnalyzeWordPastorallyUseCase`, que además decide cuándo regenerarlo.
 */
export class PastoralWordAnalysisReadService {
    constructor(private readonly repo: IPastoralWordAnalysisCacheRepository) {}

    /**
     * Trae el análisis por el id que el estudio de palabra ya guarda.
     *
     * Devuelve `null` —nunca lanza— cuando no está: un análisis ausente
     * (estudio escrito a mano, caché invalidada por una versión curada nueva)
     * no puede impedir que el sermón se genere.
     */
    async findById(id: string): Promise<PastoralWordAnalysisDoc | null> {
        try {
            return await this.repo.findById(id);
        } catch {
            return null;
        }
    }
}

export const pastoralWordAnalysisReadService = new PastoralWordAnalysisReadService(
    new FirestorePastoralWordAnalysisCacheRepository(),
);
