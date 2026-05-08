import type {
    IUserAssignmentBriefRepository,
    UserAssignmentBrief,
} from '@dosfilos/domain';
import { ASSIGNMENT_BRIEF_MAX_CHARS } from '@dosfilos/domain';

/**
 * CRUD bundle for user-owned assignment-brief templates. Mirrors the
 * `UserRubric*` UC family (one file per UC), but bundled here because
 * each UC body is just a thin pass-through to the repo and the surface
 * is small enough to keep co-located.
 */

export class ListUserAssignmentBriefsUseCase {
    constructor(private repository: IUserAssignmentBriefRepository) { }
    async execute(ownerId: string): Promise<UserAssignmentBrief[]> {
        if (!ownerId) throw new Error('ListUserAssignmentBriefsUseCase: ownerId required');
        return this.repository.listBriefs(ownerId);
    }
}

export interface CreateUserAssignmentBriefInput {
    ownerId: string;
    displayName: string;
    body: string;
    markAsDefault?: boolean;
}

export class CreateUserAssignmentBriefUseCase {
    constructor(private repository: IUserAssignmentBriefRepository) { }
    async execute(input: CreateUserAssignmentBriefInput): Promise<UserAssignmentBrief> {
        if (!input.ownerId) throw new Error('CreateUserAssignmentBriefUseCase: ownerId required');
        const displayName = input.displayName?.trim();
        if (!displayName) throw new Error('CreateUserAssignmentBriefUseCase: displayName required');
        const body = input.body?.slice(0, ASSIGNMENT_BRIEF_MAX_CHARS) ?? '';
        if (!body.trim()) throw new Error('CreateUserAssignmentBriefUseCase: body required');
        return this.repository.createBrief({
            ownerId: input.ownerId,
            displayName,
            body,
            isDefault: !!input.markAsDefault,
        });
    }
}

export interface UpdateUserAssignmentBriefInput {
    ownerId: string;
    briefId: string;
    displayName?: string;
    body?: string;
}

export class UpdateUserAssignmentBriefUseCase {
    constructor(private repository: IUserAssignmentBriefRepository) { }
    async execute(input: UpdateUserAssignmentBriefInput): Promise<UserAssignmentBrief> {
        if (!input.ownerId || !input.briefId) {
            throw new Error('UpdateUserAssignmentBriefUseCase: ownerId + briefId required');
        }
        const patch: { displayName?: string; body?: string } = {};
        if (input.displayName !== undefined) patch.displayName = input.displayName.trim();
        if (input.body !== undefined) patch.body = input.body.slice(0, ASSIGNMENT_BRIEF_MAX_CHARS);
        return this.repository.updateBrief(input.ownerId, input.briefId, patch);
    }
}

export interface DeleteUserAssignmentBriefInput {
    ownerId: string;
    briefId: string;
}

export class DeleteUserAssignmentBriefUseCase {
    constructor(private repository: IUserAssignmentBriefRepository) { }
    async execute(input: DeleteUserAssignmentBriefInput): Promise<void> {
        if (!input.ownerId || !input.briefId) {
            throw new Error('DeleteUserAssignmentBriefUseCase: ownerId + briefId required');
        }
        return this.repository.deleteBrief(input.ownerId, input.briefId);
    }
}

export interface SetDefaultUserAssignmentBriefInput {
    ownerId: string;
    briefId: string;
}

export class SetDefaultUserAssignmentBriefUseCase {
    constructor(private repository: IUserAssignmentBriefRepository) { }
    async execute(input: SetDefaultUserAssignmentBriefInput): Promise<UserAssignmentBrief> {
        if (!input.ownerId || !input.briefId) {
            throw new Error('SetDefaultUserAssignmentBriefUseCase: ownerId + briefId required');
        }
        return this.repository.setDefault(input.ownerId, input.briefId);
    }
}
