import { Organization } from '../entities/Organization';

// Placeholder for future multi-tenant functionality
export interface IOrganizationRepository {
    getById(organizationId: string): Promise<Organization | null>;
    create(organization: Organization): Promise<void>;
    update(organization: Organization): Promise<void>;
}
