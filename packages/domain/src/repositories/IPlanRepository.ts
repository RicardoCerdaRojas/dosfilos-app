import { PlanDefinition } from '../entities/PlanDefinition';

export interface IPlanRepository {
    getAll(): Promise<PlanDefinition[]>;
    getById(planId: string): Promise<PlanDefinition | null>;
    getByStripePriceId(priceId: string): Promise<PlanDefinition | null>;
}
