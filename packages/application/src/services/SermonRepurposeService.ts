import {
    GeminiSermonRepurposer,
    FirestoreExtractionRepository,
    FirebaseSermonRepository,
} from '@dosfilos/infrastructure';
import { RepurposeSermonUseCase } from '../use-cases/sermon/RepurposeSermonUseCase';
import { ListSermonDerivativesUseCase } from '../use-cases/sermon/ListSermonDerivativesUseCase';

/**
 * Thin service wrapper that wires the `RepurposeSermonUseCase` with its
 * infrastructure dependencies once and exposes the singleton to the
 * web layer (T3 #18). Matches the pattern other application services
 * use (`SermonGeneratorService`, `SermonService`) — no DI container,
 * just module-scoped construction.
 */
class SermonRepurposeService {
    public readonly repurpose: RepurposeSermonUseCase;
    public readonly listDerivatives: ListSermonDerivativesUseCase;

    constructor() {
        const repurposer = new GeminiSermonRepurposer();
        const sermonRepository = new FirebaseSermonRepository();
        const extractionRepository = new FirestoreExtractionRepository();
        this.repurpose = new RepurposeSermonUseCase(
            sermonRepository,
            extractionRepository,
            repurposer,
        );
        this.listDerivatives = new ListSermonDerivativesUseCase(extractionRepository);
    }
}

export const sermonRepurposeService = new SermonRepurposeService();
