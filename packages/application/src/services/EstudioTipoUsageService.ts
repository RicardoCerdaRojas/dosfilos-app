import { FirebaseEstudioTipoUsageRepository } from '@dosfilos/infrastructure';

/**
 * Frecuencia de uso de tipos de elemento al promover (sección "Más usados" del
 * picker), cross-device. Envuelve el repo Firestore. Mismo patrón que
 * `CategoryService`.
 */
export class EstudioTipoUsageService {
    private repository: FirebaseEstudioTipoUsageRepository;

    constructor() {
        this.repository = new FirebaseEstudioTipoUsageRepository();
    }

    getUsage(userId: string): Promise<Record<string, number>> {
        return this.repository.getUsage(userId);
    }

    recordUsage(userId: string, tipo: string): Promise<void> {
        return this.repository.recordUsage(userId, tipo);
    }
}

export const estudioTipoUsageService = new EstudioTipoUsageService();
