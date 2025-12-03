import { describe, it, expect } from 'vitest';
import { UserEntity } from '../entities/User';

describe('UserEntity', () => {
    it('should create a user entity', () => {
        const user = UserEntity.create({
            id: '123',
            email: 'test@example.com',
            displayName: 'Test User',
        });

        expect(user.id).toBe('123');
        expect(user.email).toBe('test@example.com');
        expect(user.displayName).toBe('Test User');
    });

    it('should have createdAt and updatedAt dates', () => {
        const user = UserEntity.create({
            id: '123',
            email: 'test@example.com',
        });

        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.updatedAt).toBeInstanceOf(Date);
    });
});
