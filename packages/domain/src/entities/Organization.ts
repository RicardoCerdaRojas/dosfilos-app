// Placeholder for Organization entity (future multi-tenant support)
export interface Organization {
    id: string;
    name: string;
    ownerId: string;
    members: {
        userId: string;
        role: 'owner' | 'admin' | 'member';
        joinedAt: Date;
    }[];
    subscription?: {
        planId: string;
        // Organization-level subscription details
    };
    createdAt: Date;
    updatedAt: Date;
}
