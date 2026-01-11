import { PlanDefinition } from '../entities/PlanDefinition';
import type { PlanTranslation } from '../models/Plan';

export interface IPlanRepository {
    getAll(): Promise<PlanDefinition[]>;
    getById(planId: string): Promise<PlanDefinition | null>;
    getByStripePriceId(priceId: string): Promise<PlanDefinition | null>;

    // New methods for refactored plan system
    getPublicPlans(): Promise<PlanDefinition[]>;
    getTranslations(planId: string, locale: string): Promise<PlanTranslation | null>;
}
