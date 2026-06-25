import type { IBibleVersionRepository, IVerifiedMisreadingRepository } from '@dosfilos/domain';
import { verifyAnchorVerse } from './verifyAnchorVerse';
import {
    type AdminVerifiedMisreadingService,
    type ReviewVerifiedMisreadingResponse,
} from '../../services/AdminVerifiedMisreadingService';

/**
 * ADR-036 PR4 — orquesta la revisión de una entrada del set crítico.
 *
 * Hace la parte que la callable NO puede (functions no lee texto bíblico):
 * resuelve la existencia + el TEXTO de cada ancla con `verifyAnchorVerse` (la
 * MISMA función que el merge autoritativo de PR5 — una función, dos llamadas, sin
 * divergencia), y se lo pasa a la callable role-gated, que adjudica server-side
 * (Sonnet) + resuelve procedencia (R3) + flipea el estado.
 *
 * El `versesExist` que se manda aquí es ADVISORY (caché para la cola/display); el
 * gate fail-closed se re-evalúa en el punto de uso (PR5) con esta misma función.
 */
export class ReviewVerifiedMisreadingUseCase {
    constructor(
        private readonly repo: IVerifiedMisreadingRepository,
        private readonly bibleRepo: IBibleVersionRepository,
        private readonly service: AdminVerifiedMisreadingService,
    ) {}

    async execute(id: string, approve: boolean): Promise<ReviewVerifiedMisreadingResponse> {
        const entry = await this.repo.getById(id);
        if (!entry) throw new Error(`verifiedMisreading ${id} not found`);

        const anchorVerifications = entry.correctiveAnchors.map((a) => {
            const r = verifyAnchorVerse(a.reference, this.bibleRepo);
            return { reference: a.reference, verseText: r.text, versesExist: r.exists };
        });

        return this.service.review({ id, approve, anchorVerifications });
    }
}
