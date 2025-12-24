import { UserEntity } from '@dosfilos/domain';

export interface UserListItemDTO {
    id: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    createdAt: Date;
    plan: 'free' | 'pro' | 'team';
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    engagementScore: number;
    lastLoginAt?: Date;
    totalRevenue?: number;
}

export interface GetAllUsersFilters {
    searchQuery?: string; // Search by name or email
    plan?: 'free' | 'pro' | 'team';
    status?: 'active' | 'cancelled' | 'past_due';
    engagementLevel?: 'high' | 'medium' | 'low' | 'inactive';
    lastLoginBefore?: Date;
    lastLoginAfter?: Date;
}

export interface GetAllUsersSortOptions {
    field: 'name' | 'email' | 'createdAt' | 'engagement' | 'revenue';
    direction: 'asc' | 'desc';
}

export interface IUserRepository {
    getAllUsers(): Promise<UserEntity[]>;
    getUserById(id: string): Promise<UserEntity | null>;
}

/**
 * Use Case: Get All Users
 * 
 * Fetches all users with optional filtering and sorting.
 * Used by admin dashboard for user management.
 */
export class GetAllUsers {
    constructor(private userRepository: IUserRepository) { }

    async execute(
        filters?: GetAllUsersFilters,
        sort?: GetAllUsersSortOptions
    ): Promise<UserListItemDTO[]> {
        // Fetch all users from repository
        const users = await this.userRepository.getAllUsers();

        // Map to DTOs
        let userDTOs = users.map(user => this.mapToDTO(user));

        // Apply filters
        if (filters) {
            userDTOs = this.applyFilters(userDTOs, filters);
        }

        // Apply sorting
        if (sort) {
            userDTOs = this.applySorting(userDTOs, sort);
        }

        return userDTOs;
    }

    private mapToDTO(user: UserEntity): UserListItemDTO {
        const subscription = (user as any).subscription;
        const analytics = (user as any).analytics;

        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: (user as any).createdAt || new Date(),
            plan: subscription?.planId || 'free',
            status: subscription?.status || 'active',
            engagementScore: analytics?.engagementScore || 0,
            lastLoginAt: analytics?.lastLoginAt,
            totalRevenue: analytics?.totalRevenue || 0,
        };
    }

    private applyFilters(
        users: UserListItemDTO[],
        filters: GetAllUsersFilters
    ): UserListItemDTO[] {
        return users.filter(user => {
            // Search query
            if (filters.searchQuery) {
                const query = filters.searchQuery.toLowerCase();
                const matchesName = user.displayName?.toLowerCase().includes(query);
                const matchesEmail = user.email.toLowerCase().includes(query);
                if (!matchesName && !matchesEmail) return false;
            }

            // Plan filter
            if (filters.plan && user.plan !== filters.plan) {
                return false;
            }

            // Status filter
            if (filters.status && user.status !== filters.status) {
                return false;
            }

            // Engagement level filter
            if (filters.engagementLevel) {
                const level = this.getEngagementLevel(user.engagementScore);
                if (level !== filters.engagementLevel) return false;
            }

            // Last login filters
            if (filters.lastLoginBefore && user.lastLoginAt) {
                if (user.lastLoginAt > filters.lastLoginBefore) return false;
            }
            if (filters.lastLoginAfter && user.lastLoginAt) {
                if (user.lastLoginAt < filters.lastLoginAfter) return false;
            }

            return true;
        });
    }

    private applySorting(
        users: UserListItemDTO[],
        sort: GetAllUsersSortOptions
    ): UserListItemDTO[] {
        return [...users].sort((a, b) => {
            let comparison = 0;

            switch (sort.field) {
                case 'name':
                    comparison = (a.displayName || '').localeCompare(b.displayName || '');
                    break;
                case 'email':
                    comparison = a.email.localeCompare(b.email);
                    break;
                case 'createdAt':
                    comparison = a.createdAt.getTime() - b.createdAt.getTime();
                    break;
                case 'engagement':
                    comparison = a.engagementScore - b.engagementScore;
                    break;
                case 'revenue':
                    comparison = (a.totalRevenue || 0) - (b.totalRevenue || 0);
                    break;
            }

            return sort.direction === 'asc' ? comparison : -comparison;
        });
    }

    private getEngagementLevel(score: number): 'high' | 'medium' | 'low' | 'inactive' {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        if (score >= 10) return 'low';
        return 'inactive';
    }
}
