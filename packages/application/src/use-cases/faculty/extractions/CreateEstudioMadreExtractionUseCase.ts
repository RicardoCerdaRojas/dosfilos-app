import { Extraction, EstudioMadre, IExtractionRepository } from '@dosfilos/domain';

/**
 * Cristalización (spec v1.3 §2.4): persiste un Estudio Madre como extraction
 * `BIBLE_STUDY` con su sobre estructurado + el markdown serializado desde los
 * elementos. NO hace llamada al LLM — el contenido ya lo curó el docente
 * promoviendo mensajes; el markdown llega serializado por `serializarEstudio` y
 * el estado de fidelidad ya lo computó `validarEstudioMadre` client-side.
 *
 * Es el camino fiel paralelo al `generateAndSaveExtraction` (auto-resumen del
 * LLM = `sin_auditar`): este crea un estudio auditable con elementos + puertas.
 */
export class CreateEstudioMadreExtractionUseCase {
    constructor(private readonly repo: IExtractionRepository) {}

    execute(params: {
        userId: string;
        sessionId: string;
        title: string;
        markdown: string;
        estudioMadre: EstudioMadre;
        derivedFromMessageIds: string[];
    }): Promise<Extraction> {
        return this.repo.create({
            userId: params.userId,
            sessionId: params.sessionId,
            type: 'BIBLE_STUDY',
            title: params.title,
            markdown: params.markdown,
            derivedFromMessageIds: params.derivedFromMessageIds,
            estudioMadre: params.estudioMadre,
        });
    }
}
